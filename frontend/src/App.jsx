import { lazy, Suspense } from 'react'
import { Routes, Route, useLocation } from 'react-router-dom'
import Navbar from './components/Navbar.jsx'
import ProtectedRoute from './components/ProtectedRoute.jsx'
import Flash from './components/Flash.jsx'
import FloatingWhatsApp from './components/FloatingWhatsApp.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import AccountLayout from './components/account/AccountLayout.jsx'
import InAccount from './components/account/InAccount.jsx'
import Home from './homepage/Home.jsx'
import Footer from './homepage/Footer.jsx'
import Collection from './pages/Collection.jsx'
import ProductDetail from './pages/ProductDetail.jsx'
import Search from './pages/Search.jsx'
import Account from './pages/Account.jsx'
import Orders from './pages/Orders.jsx'
import OrderDetail from './pages/OrderDetail.jsx'
import OrderTracking from './pages/OrderTracking.jsx'
import PersonalInformation from './pages/PersonalInformation.jsx'
import Addresses from './pages/Addresses.jsx'
import SignOut from './pages/SignOut.jsx'
import Cart from './pages/Cart.jsx'
import Wishlist from './pages/Wishlist.jsx'
import CheckoutGate from './pages/CheckoutGate.jsx'
import GuestCheckout from './pages/GuestCheckout.jsx'
import TrackOrder from './pages/TrackOrder.jsx'
import GuestOrder from './pages/GuestOrder.jsx'
import OrderConfirmation from './pages/OrderConfirmation.jsx'
import StaticPage from './pages/StaticPage.jsx'
import Login from './pages/auth/Login.jsx'
import Signup from './pages/auth/Signup.jsx'
import ForgotPassword from './pages/auth/ForgotPassword.jsx'
import ResetPassword from './pages/auth/ResetPassword.jsx'
import VerifyEmail from './pages/auth/VerifyEmail.jsx'

// Discover and Client Services pages are loaded on demand, so they do not make the first page load heavier
const OurStory = lazy(() => import('./pages/OurStory.jsx'))
const HeemStandard = lazy(() => import('./pages/HeemStandard.jsx'))
const FAQ = lazy(() => import('./pages/FAQ.jsx'))
const Collections = lazy(() => import('./pages/Collections.jsx'))
const Lookbook = lazy(() => import('./pages/Lookbook.jsx')) 
const CollectionDetail = lazy(() => import('./pages/CollectionDetail.jsx'))
const Contact = lazy(() => import('./pages/Contact.jsx'))
const ShippingDelivery = lazy(() => import('./pages/ShippingDelivery.jsx'))
const ReturnsExchange = lazy(() => import('./pages/ReturnsExchange.jsx'))
const SizeGuide = lazy(() => import('./pages/SizeGuide.jsx'))

// Staff-only admin screens (own layout, loaded only when opened)
const AdminLayout = lazy(() => import('./admin/AdminLayout.jsx'))
const AdminDashboard = lazy(() => import('./admin/Dashboard.jsx'))
const AdminOrders = lazy(() => import('./admin/Orders.jsx'))
const AdminOrderView = lazy(() => import('./admin/OrderView.jsx'))
const AdminPayments = lazy(() => import('./admin/Payments.jsx'))
const AdminProducts = lazy(() => import('./admin/Products.jsx'))
const AdminProductForm = lazy(() => import('./admin/ProductForm.jsx'))
const AdminAnalytics = lazy(() => import('./admin/Analytics.jsx'))
const AdminContactSettings = lazy(() => import('./admin/ContactSettings.jsx'))
const AdminMessages = lazy(() => import('./admin/Messages.jsx'))
const AdminCategories = lazy(() => import('./admin/Categories.jsx'))
const AdminSiteMedia = lazy(() => import('./admin/SiteMedia.jsx'))
const AdminMessageView = lazy(() => import('./admin/MessageView.jsx'))
const AdminEmails = lazy(() => import('./admin/Emails.jsx'))
const AdminCustomers = lazy(() => import('./admin/Customers.jsx'))

// These pages have their own full-screen layout, so no navbar/footer there
const BARE = ['/login', '/signup', '/forgot-password', '/reset-password', '/account/signout']

export default function App() {
  const { pathname } = useLocation()
  const bare = BARE.includes(pathname) || pathname.startsWith('/admin')
  return (
    <>
      {!bare && <Navbar />}
      <main className={bare ? '' : 'pt-14 nav:pt-16'}>
        <ErrorBoundary resetKey={pathname}>
          <Suspense fallback={<div className="min-h-[60vh]" aria-busy="true" />}>
            <Routes>
              <Route path="/" element={<Home />} />
              <Route path="/search" element={<Search />} />
              <Route path="/product/:slug" element={<ProductDetail />} />

              {/* Work for guests too; signed-in customers also get the account sidebar around them */}
              <Route path="/cart" element={<InAccount><Cart /></InAccount>} />
              <Route path="/wishlist" element={<InAccount><Wishlist /></InAccount>} />

              <Route path="/login" element={<Login />} />
              <Route path="/signup" element={<Signup />} />
              <Route path="/verify-email" element={<VerifyEmail />} />  
              <Route path="/forgot-password" element={<ForgotPassword />} />
              <Route path="/reset-password" element={<ResetPassword />} />
              <Route path="/terms" element={<StaticPage title="Terms of Service" />} />
              <Route path="/privacy" element={<StaticPage title="Privacy Policy" />} />

              {/* Discover */}
              <Route path="/our-story" element={<OurStory />} />
              <Route path="/heem-standard" element={<HeemStandard />} />
              <Route path="/collections" element={<Collections />} />
              <Route path="/collections/:slug" element={<CollectionDetail />} />
              <Route path="/lookbook" element={<Lookbook />} />

              {/* Client Services */}
              <Route path="/faq" element={<FAQ />} />
              <Route path="/contact" element={<Contact />} />
              <Route path="/shipping-delivery" element={<ShippingDelivery />} />
              <Route path="/returns-exchange" element={<ReturnsExchange />} />
              <Route path="/size-guide" element={<SizeGuide />} />

              {/* Checkout and order tracking work without an account */}
              <Route path="/checkout" element={<CheckoutGate />} />
              <Route path="/checkout/guest" element={<GuestCheckout />} />
              <Route path="/track" element={<TrackOrder />} />
              <Route path="/track/:token" element={<GuestOrder />} />

              {/* Signed-in only */}
              <Route element={<ProtectedRoute />}>
                <Route path="/order-confirmation/:number" element={<OrderConfirmation />} />
                {/* full-screen page, so it sits outside the account sidebar layout */}
                <Route path="/account/signout" element={<SignOut />} />
                <Route path="/admin" element={<AdminLayout />}>
                  <Route index element={<AdminDashboard />} />
                  <Route path="orders" element={<AdminOrders />} />
                  <Route path="orders/:id" element={<AdminOrderView />} />
                  <Route path="payments" element={<AdminPayments />} />
                  <Route path="products" element={<AdminProducts />} />
                  <Route path="products/new" element={<AdminProductForm />} />
                  <Route path="products/:id" element={<AdminProductForm />} />
                  <Route path="analytics" element={<AdminAnalytics />} />
                  <Route path="contact" element={<AdminContactSettings />} />
                  <Route path="categories" element={<AdminCategories />} />
                  <Route path="media" element={<AdminSiteMedia />} />
                  <Route path="messages" element={<AdminMessages />} />
                  <Route path="messages/:id" element={<AdminMessageView />} />
                  <Route path="emails" element={<AdminEmails />} />
                  <Route path="customers" element={<AdminCustomers />} />
                </Route>
                <Route path="/account" element={<AccountLayout />}>
                  <Route index element={<Account />} />
                  <Route path="orders" element={<Orders />} />
                  <Route path="orders/:number" element={<OrderDetail />} />
                  <Route path="tracking" element={<OrderTracking />} />
                  <Route path="tracking/:number" element={<OrderTracking />} />
                  <Route path="profile" element={<PersonalInformation />} />
                  <Route path="addresses" element={<Addresses />} />
                </Route>
              </Route>

              <Route path="/:section" element={<Collection />} />
            </Routes>
          </Suspense>
        </ErrorBoundary>
      </main>
      {!bare && <Footer />}
      {!bare && <FloatingWhatsApp />}
      <Flash />
    </>
  )
}