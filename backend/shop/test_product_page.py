from django.contrib.auth import get_user_model
from django.test import TestCase
from rest_framework.test import APIClient

from shop.models import Category, Collection, Product, ProductImage, ProductVariant, SizeChart, SizeChartRow
from shopping.models import CartItem


def make_user(email='buyer@example.com'):
    User = get_user_model()
    return User.objects.create_user(username=email, email=email, password='pass12345')


class ProductDetailApiTests(TestCase):
    def setUp(self):
        self.men = Category.objects.create(name='Men')
        self.shirts = Category.objects.create(name='Shirts', parent=self.men)
        self.pants = Category.objects.create(name='Pants', parent=self.men)
        self.shirt = Product.objects.create(name='Linen Shirt', price=2000, compare_at_price=2500,
                                            category=self.shirts, fabric='100% linen', care='Machine wash cold\n\nDo not bleach')
        ProductVariant.objects.create(product=self.shirt, size='M', color='Black', stock=5)
        ProductVariant.objects.create(product=self.shirt, size='L', color='Black', stock=0)
        ProductVariant.objects.create(product=self.shirt, size='M', color='Beige', stock=2)
        ProductImage.objects.create(product=self.shirt, image='products/black-1.jpg', color='black', order=0)
        ProductImage.objects.create(product=self.shirt, image='products/beige-1.jpg', color='Beige', order=0)
        self.client = APIClient()

    def test_each_slug_returns_its_own_product(self):
        other = Product.objects.create(name='Wool Pant', price=3000, category=self.pants)
        a = self.client.get(f'/api/products/{self.shirt.slug}/').json()
        b = self.client.get(f'/api/products/{other.slug}/').json()
        self.assertEqual(a['name'], 'Linen Shirt')
        self.assertEqual(b['name'], 'Wool Pant')

    def test_missing_and_inactive_products_are_404(self):
        self.assertEqual(self.client.get('/api/products/nope/').status_code, 404)
        self.shirt.is_active = False
        self.shirt.save()
        self.assertEqual(self.client.get(f'/api/products/{self.shirt.slug}/').status_code, 404)

    def test_images_carry_a_normalised_colour(self):
        data = self.client.get(f'/api/products/{self.shirt.slug}/').json()
        self.assertEqual({i['color'] for i in data['images']}, {'Black', 'Beige'})

    def test_discount_is_real_or_absent(self):
        data = self.client.get(f'/api/products/{self.shirt.slug}/').json()
        self.assertEqual(data['discount_percent'], 20)
        self.assertEqual(float(data['compare_at_price']), 2500.0)
        self.shirt.compare_at_price = 1500  # lower than price: not a discount
        self.shirt.save()
        data = self.client.get(f'/api/products/{self.shirt.slug}/').json()
        self.assertIsNone(data['compare_at_price'])
        self.assertIsNone(data['discount_percent'])

    def test_empty_optional_fields_and_care_lines(self):
        data = self.client.get(f'/api/products/{self.shirt.slug}/').json()
        self.assertEqual(data['care_list'], ['Machine wash cold', 'Do not bleach'])
        self.assertEqual(data['fit'], '')
        self.assertIsNone(data['size_chart'])

    def test_size_chart_falls_back_to_parent_category(self):
        chart = SizeChart.objects.create(category=self.men, unit='in')
        SizeChartRow.objects.create(chart=chart, size='m', chest='40', length='28')
        data = self.client.get(f'/api/products/{self.shirt.slug}/').json()
        self.assertEqual([c['key'] for c in data['size_chart']['columns']], ['chest', 'length'])
        self.assertEqual(data['size_chart']['rows'][0]['size'], 'M')

    def test_breadcrumbs(self):
        data = self.client.get(f'/api/products/{self.shirt.slug}/').json()
        self.assertEqual([c['slug'] for c in data['breadcrumbs']], ['men', 'men-shirts'])


class RelatedProductsApiTests(TestCase):
    def setUp(self):
        self.men = Category.objects.create(name='Men')
        self.shirts = Category.objects.create(name='Shirts', parent=self.men)
        self.pants = Category.objects.create(name='Pants', parent=self.men)
        self.women = Category.objects.create(name='Women')
        self.base = Product.objects.create(name='Base Shirt', price=1000, category=self.shirts)
        self.same = Product.objects.create(name='Same Cat', price=1000, category=self.shirts)
        self.sibling = Product.objects.create(name='Sibling Cat', price=1000, category=self.pants)
        self.other = Product.objects.create(name='Other Dept', price=1000, category=self.women)

    def names(self, slug):
        return [p['name'] for p in APIClient().get(f'/api/products/{slug}/related/').json()]

    def test_excludes_self_and_unrelated_and_prefers_same_category(self):
        names = self.names(self.base.slug)
        self.assertNotIn('Base Shirt', names)
        self.assertNotIn('Other Dept', names)
        self.assertEqual(names[0], 'Same Cat')
        self.assertIn('Sibling Cat', names)

    def test_inactive_products_are_hidden(self):
        self.same.is_active = False
        self.same.save()
        self.assertNotIn('Same Cat', self.names(self.base.slug))

    def test_unknown_product_is_404(self):
        self.assertEqual(APIClient().get('/api/products/nope/related/').status_code, 404)


class CartStockTests(TestCase):
    def setUp(self):
        cat = Category.objects.create(name='Shirts')
        self.product = Product.objects.create(name='Shirt', price=1000, category=cat)
        self.v = ProductVariant.objects.create(product=self.product, size='M', color='Black', stock=3)
        self.sold = ProductVariant.objects.create(product=self.product, size='L', color='Black', stock=0)
        self.user = make_user()
        self.api = APIClient()
        self.api.force_authenticate(self.user)

    def add(self, variant, qty):
        return self.api.post('/api/cart/', {'variant_id': variant.id, 'quantity': qty}, format='json')

    def test_add_within_stock_stores_the_chosen_quantity(self):
        r = self.add(self.v, 2)
        self.assertEqual(r.status_code, 201)
        self.assertEqual(CartItem.objects.get(user=self.user, variant=self.v).quantity, 2)

    def test_adding_same_variant_increases_one_line(self):
        self.add(self.v, 1)
        self.add(self.v, 1)
        self.assertEqual(CartItem.objects.filter(user=self.user).count(), 1)
        self.assertEqual(CartItem.objects.get(user=self.user).quantity, 2)

    def test_more_than_stock_is_rejected_not_silently_cut(self):
        r = self.add(self.v, 4)
        self.assertEqual(r.status_code, 409)
        self.assertFalse(CartItem.objects.filter(user=self.user).exists())

    def test_stock_counts_what_is_already_in_the_bag(self):
        self.add(self.v, 2)
        r = self.add(self.v, 2)
        self.assertEqual(r.status_code, 409)
        self.assertEqual(CartItem.objects.get(user=self.user).quantity, 2)

    def test_out_of_stock_variant_cannot_be_added(self):
        self.assertEqual(self.add(self.sold, 1).status_code, 400)

    def test_cart_requires_login_and_is_private(self):
        self.add(self.v, 1)
        anon = APIClient()
        self.assertIn(anon.post('/api/cart/', {'variant_id': self.v.id, 'quantity': 1}, format='json').status_code, (401, 403))
        other = APIClient()
        other.force_authenticate(make_user('other@example.com'))
        self.assertEqual(other.get('/api/cart/').json()['items'], [])