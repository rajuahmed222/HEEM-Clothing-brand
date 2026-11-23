import re
from decimal import Decimal

from django.contrib.auth import get_user_model
from django.core.exceptions import ValidationError
from django.test import TestCase, override_settings
from rest_framework.test import APIClient

from accounts.models import Address
from shop.models import Category, Product, ProductVariant
from shopping.models import CartItem, Order, PaymentSubmission

# Fake numbers, only for these tests. Nagad is deliberately blank = "not configured".
WALLETS = dict(HEEM_BKASH_NUMBER='01712345678', HEEM_NAGAD_NUMBER='', HEEM_ROCKET_NUMBER='01912345678')

ADDRESS = {'recipient_name': 'Buyer One', 'phone': '01712345678', 'division': 'Dhaka',
           'district': 'Dhaka', 'street': 'House 1, Road 2'}
FRIEND = {'recipient_name': 'Friend Two', 'phone': '01812345678', 'division': 'Chattogram',
          'district': 'Chattogram', 'street': 'House 9, Road 4'}
PAY = {'sender_number': '01712345678', 'trx_id': '8n7a6d5ee3', 'amount_sent': '4080', 'note': ''}


def make_user(email='buyer@example.com'):
    return get_user_model().objects.create_user(username=email, email=email, password='pass12345', first_name='Buyer One')


@override_settings(**WALLETS)
class CheckoutTests(TestCase):
    def setUp(self):
        cat = Category.objects.create(name='Shirts')
        self.product = Product.objects.create(name='Shirt', price=2000, category=cat)
        self.v = ProductVariant.objects.create(product=self.product, size='M', color='Black', stock=5)
        self.user = make_user()
        self.api = APIClient()
        self.api.force_authenticate(self.user)
        CartItem.objects.create(user=self.user, variant=self.v, quantity=2)  # 2 x 2000 = 4000, +80 Dhaka delivery
        self.n = 0

    def fill_cart(self, qty=2):
        CartItem.objects.update_or_create(user=self.user, variant=self.v, defaults={'quantity': qty})

    def place(self, **extra):
        self.n += 1
        body = {'idempotency_key': f'test-key-{self.n:04d}', 'address': dict(ADDRESS), 'payment_method': 'cod'}
        body.update(extra)
        body = {k: v for k, v in body.items() if v is not None}  # address=None means "send no address"
        return self.api.post('/api/checkout/', body, format='json')

    # ---- Cash on Delivery ----
    def test_cod_order_is_created_with_server_side_totals(self):
        r = self.place()
        self.assertEqual(r.status_code, 201)
        data = r.json()
        self.assertRegex(data['number'], r'^HEEM-\d{8}-[A-HJ-NP-Z2-9]{4}$')
        self.assertEqual(data['payment_status'], 'cod_pending')
        self.assertEqual(Decimal(data['total']), Decimal('4080'))
        self.v.refresh_from_db()
        self.assertEqual(self.v.stock, 3)
        self.assertFalse(CartItem.objects.filter(user=self.user).exists())

    def test_client_cannot_set_totals_or_statuses(self):
        r = self.place(total='1', subtotal='1', payment_status='paid', status='delivered', delivery_charge='0')
        data = r.json()
        self.assertEqual(Decimal(data['total']), Decimal('4080'))
        self.assertEqual((data['status'], data['payment_status']), ('placed', 'cod_pending'))

    def test_empty_bag_cannot_check_out(self):
        CartItem.objects.all().delete()
        self.assertEqual(self.place().status_code, 400)

    def test_not_enough_stock_is_a_conflict_and_nothing_is_saved(self):
        self.v.stock = 1
        self.v.save()
        r = self.place()
        self.assertEqual(r.status_code, 409)
        self.assertEqual(Order.objects.count(), 0)
        self.assertTrue(CartItem.objects.filter(user=self.user).exists())

    # ---- duplicate protection ----
    def test_same_idempotency_key_returns_the_same_order(self):
        first = self.api.post('/api/checkout/', {'idempotency_key': 'one-click-0001', 'address': ADDRESS,
                                                 'payment_method': 'cod'}, format='json')
        second = self.api.post('/api/checkout/', {'idempotency_key': 'one-click-0001', 'address': ADDRESS,
                                                  'payment_method': 'cod'}, format='json')
        self.assertEqual((first.status_code, second.status_code), (201, 200))
        self.assertEqual(first.json()['number'], second.json()['number'])
        self.assertEqual(Order.objects.count(), 1)
        self.v.refresh_from_db()
        self.assertEqual(self.v.stock, 3)  # stock reduced once only

    # ---- addresses ----
    def test_editing_the_address_never_changes_the_saved_one(self):
        Address.objects.create(user=self.user, **ADDRESS)
        edited = {**ADDRESS, 'street': 'A different street'}
        r = self.place(address=edited)
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.json()['street'], 'A different street')
        self.assertEqual(Address.objects.get(user=self.user).street, 'House 1, Road 2')

    def test_save_address_adds_a_new_entry_only_when_asked(self):
        self.place(address={**ADDRESS, 'save_address': True})
        self.assertEqual(Address.objects.filter(user=self.user).count(), 1)

    # ---- gift ----
    def test_gift_order_is_delivered_to_the_recipient(self):
        users_before = get_user_model().objects.count()
        r = self.place(address=None, is_gift=True, gift_message='Happy birthday!',
                       buyer={'name': 'Buyer One', 'phone': '01712345678'}, recipient=FRIEND)
        self.assertEqual(r.status_code, 201, r.content)
        o = Order.objects.get()
        self.assertTrue(o.is_gift)
        self.assertEqual((o.recipient_name, o.district), ('Friend Two', 'Chattogram'))
        self.assertEqual(o.buyer_name, 'Buyer One')
        self.assertEqual(o.user, self.user)
        self.assertEqual(o.gift_message, 'Happy birthday!')
        self.assertEqual(o.delivery_charge, Decimal('130'))  # outside Dhaka
        self.assertEqual(Address.objects.filter(user=self.user).count(), 0)
        self.assertEqual(get_user_model().objects.count(), users_before)

    def test_gift_needs_a_recipient(self):
        r = self.place(is_gift=True, buyer={'name': 'Buyer One', 'phone': '01712345678'})
        self.assertEqual(r.status_code, 400)
        self.assertIn('recipient', r.json())

    # ---- manual mobile payments ----
    def test_unconfigured_wallet_is_not_available(self):
        r = self.place(payment_method='nagad', payment=PAY)
        self.assertEqual(r.status_code, 400)
        self.assertIn('payment_method', r.json())
        methods = self.api.get('/api/checkout/options/').json()['payment_methods']
        self.assertEqual({m['code'] for m in methods}, {'bkash', 'rocket', 'cod'})

    def test_mobile_payment_needs_details(self):
        r = self.place(payment_method='bkash')
        self.assertEqual(r.status_code, 400)
        self.assertIn('payment', r.json())

    def test_mobile_payment_order_waits_for_verification(self):
        r = self.place(payment_method='bkash', payment=PAY)
        self.assertEqual(r.status_code, 201, r.content)
        o = Order.objects.get()
        sub = o.payments.get()
        self.assertEqual((o.payment_status, o.status), ('pending_verification', 'placed'))
        self.assertEqual((sub.trx_id, sub.status), ('8N7A6D5EE3', 'submitted'))
        self.assertTrue(sub.amount_matches)

    def test_wrong_amount_is_flagged_not_trusted(self):
        self.place(payment_method='bkash', payment={**PAY, 'amount_sent': '4000'})
        sub = PaymentSubmission.objects.get()
        self.assertFalse(sub.amount_matches)
        self.assertEqual(sub.expected_amount, Decimal('4080'))

    def test_bad_sender_number_and_trxid_are_rejected(self):
        self.assertEqual(self.place(payment_method='bkash', payment={**PAY, 'sender_number': '12345'}).status_code, 400)
        self.assertEqual(self.place(payment_method='bkash', payment={**PAY, 'trx_id': 'ab'}).status_code, 400)
        self.assertEqual(Order.objects.count(), 0)

    def test_one_trxid_cannot_pay_two_orders(self):
        self.assertEqual(self.place(payment_method='bkash', payment=PAY).status_code, 201)
        self.fill_cart()
        r = self.place(payment_method='bkash', payment=PAY)
        self.assertEqual(r.status_code, 400)
        self.assertEqual(Order.objects.count(), 1)
        self.assertTrue(CartItem.objects.filter(user=self.user).exists())

    # ---- privacy ----
    def test_other_customers_cannot_open_the_order(self):
        number = self.place().json()['number']
        other = APIClient()
        other.force_authenticate(make_user('other@example.com'))
        self.assertEqual(other.get(f'/api/orders/{number}/').status_code, 404)
        self.assertEqual(other.get('/api/orders/').json(), [])

    def test_order_list_filters(self):
        self.place()
        self.fill_cart()
        self.place(payment_method='bkash', payment=PAY)
        got = self.api.get('/api/orders/?payment_status=pending_verification').json()
        self.assertEqual([o['payment_method'] for o in got], ['bkash'])
        number = got[0]['number']
        self.assertEqual(len(self.api.get(f'/api/orders/?q={number[-4:]}').json()), 1)


@override_settings(**WALLETS)
class OrderLifecycleTests(TestCase):
    def setUp(self):
        cat = Category.objects.create(name='Shirts')
        product = Product.objects.create(name='Shirt', price=2000, category=cat)
        self.v = ProductVariant.objects.create(product=product, size='M', color='Black', stock=5)
        self.user = make_user()
        self.staff = make_user('staff@example.com')
        self.api = APIClient()
        self.api.force_authenticate(self.user)
        CartItem.objects.create(user=self.user, variant=self.v, quantity=2)

    def mobile_order(self, key='life-key-0001', trx='8N7A6D5EE3'):
        r = self.api.post('/api/checkout/', {'idempotency_key': key, 'address': ADDRESS, 'payment_method': 'bkash',
                                             'payment': {**PAY, 'trx_id': trx}}, format='json')
        self.assertEqual(r.status_code, 201, r.content)
        return Order.objects.get(number=r.json()['number'])

    def test_verifying_a_payment_marks_it_paid_and_confirms_the_order(self):
        order = self.mobile_order()
        sub = order.payments.get()
        sub.status = 'verified'
        sub.save()
        sub.apply_review(self.staff)
        order.refresh_from_db()
        self.assertEqual((order.payment_status, order.status), ('paid', 'confirmed'))
        self.assertIsNotNone(order.paid_at)
        self.assertEqual(order.payment_events.last().by, self.staff)

    def test_rejected_payment_can_be_sent_again_by_the_customer(self):
        order = self.mobile_order()
        number = order.number
        # resubmitting while it is still being checked is not allowed
        self.assertEqual(self.api.post(f'/api/orders/{number}/payment/', PAY, format='json').status_code, 400)
        sub = order.payments.get()
        sub.status, sub.review_note = 'rejected', 'TrxID not found in our account.'
        sub.save()
        sub.apply_review(self.staff)
        order.refresh_from_db()
        self.assertEqual(order.payment_status, 'failed')
        detail = self.api.get(f'/api/orders/{number}/').json()
        self.assertTrue(detail['can_resubmit_payment'])
        self.assertEqual(detail['payment']['review_note'], 'TrxID not found in our account.')

        r = self.api.post(f'/api/orders/{number}/payment/', {**PAY, 'trx_id': 'NEWTRX0001'}, format='json')
        self.assertEqual(r.status_code, 200, r.content)
        order.refresh_from_db()
        self.assertEqual(order.payment_status, 'pending_verification')
        self.assertEqual(order.payments.count(), 2)

    def test_review_rules_need_a_note(self):
        order = self.mobile_order()
        sub = order.payments.get()
        sub.status = 'rejected'
        with self.assertRaises(ValidationError):
            sub.clean()
        sub.status, sub.amount_sent = 'verified', Decimal('1')
        with self.assertRaises(ValidationError):
            sub.clean()
        sub.review_note = 'Customer paid the rest in cash.'
        sub.clean()  # now allowed

    def test_cancelling_restocks_and_queues_a_refund_for_paid_orders(self):
        order = self.mobile_order()
        sub = order.payments.get()
        sub.status = 'verified'
        sub.save()
        sub.apply_review(self.staff)
        self.v.refresh_from_db()
        self.assertEqual(self.v.stock, 3)
        r = self.api.post(f'/api/orders/{order.number}/cancel/', {}, format='json')
        self.assertEqual(r.status_code, 200, r.content)
        order.refresh_from_db()
        self.v.refresh_from_db()
        self.assertEqual((order.status, order.payment_status), ('cancelled', 'refund_pending'))
        self.assertEqual(self.v.stock, 5)

    def test_customer_cannot_cancel_after_processing_starts(self):
        order = self.mobile_order()
        order.set_status('processing', by=self.staff)
        self.assertEqual(self.api.post(f'/api/orders/{order.number}/cancel/', {}, format='json').status_code, 400)

    def test_status_rules_for_staff(self):
        order = self.mobile_order()
        self.assertTrue(Order.transition_allowed('placed', 'processing'))
        self.assertFalse(Order.transition_allowed('shipped', 'packed'))
        self.assertFalse(Order.transition_allowed('shipped', 'cancelled'))
        self.assertFalse(Order.transition_allowed('cancelled', 'processing'))
        self.assertTrue(Order.transition_allowed('delivered', 'return_requested'))
        self.assertEqual(order.status, 'placed')

    def test_alerts_for_the_navbar_dot(self):
        order = self.mobile_order()
        empty = {'action_needed': [], 'verified': []}
        self.assertEqual(self.api.get('/api/orders/alerts/').json(), empty)

        sub = order.payments.get()
        sub.status, sub.review_note = 'rejected', 'TrxID not found.'
        sub.save()
        sub.apply_review(self.staff)
        self.assertEqual(self.api.get('/api/orders/alerts/').json()['action_needed'], [order.number])

        self.api.post(f'/api/orders/{order.number}/payment/', {**PAY, 'trx_id': 'NEWTRX0002'}, format='json')
        latest = order.payments.first()
        latest.status = 'verified'
        latest.save()
        latest.apply_review(self.staff)
        data = self.api.get('/api/orders/alerts/').json()
        self.assertEqual((data['action_needed'], data['verified']), ([], [order.number]))

        other = APIClient()
        other.force_authenticate(make_user('someone-else@example.com'))
        self.assertEqual(other.get('/api/orders/alerts/').json(), empty)

    def test_reorder_adds_available_items_and_skips_the_rest(self):
        order = self.mobile_order()  # bag is empty now, 3 pieces left in stock
        r = self.api.post(f'/api/orders/{order.number}/reorder/')
        self.assertEqual(r.status_code, 200, r.content)
        self.assertEqual([a['quantity'] for a in r.json()['added']], [2])
        self.assertEqual(CartItem.objects.get(user=self.user).quantity, 2)

        CartItem.objects.all().delete()
        self.v.stock = 0
        self.v.save()
        data = self.api.post(f'/api/orders/{order.number}/reorder/').json()
        self.assertEqual((data['added'], len(data['skipped'])), ([], 1))
        self.assertFalse(CartItem.objects.filter(user=self.user).exists())

        other = APIClient()
        other.force_authenticate(make_user('nosy@example.com'))
        self.assertEqual(other.post(f'/api/orders/{order.number}/reorder/').status_code, 404)

    def test_quick_filter_groups(self):
        order = self.mobile_order()
        self.assertEqual(len(self.api.get('/api/orders/?group=processing').json()), 1)
        self.assertEqual(self.api.get('/api/orders/?group=shipped').json(), [])
        order.set_status('shipped', by=self.staff)
        self.assertEqual(len(self.api.get('/api/orders/?group=shipped').json()), 1)
        self.assertEqual(self.api.get('/api/orders/?group=processing').json(), [])

    def test_order_numbers_are_unique(self):
        first = self.mobile_order('life-key-0001', 'AAAAAA0001')
        CartItem.objects.create(user=self.user, variant=self.v, quantity=1)
        second = self.mobile_order('life-key-0002', 'AAAAAA0002')
        self.assertNotEqual(first.number, second.number)
        self.assertTrue(re.match(r'^HEEM-\d{8}-[A-Z2-9]{4}$', second.number))