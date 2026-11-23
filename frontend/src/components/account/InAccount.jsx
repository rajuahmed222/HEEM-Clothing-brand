import { useAuth } from '../../context/AuthContext.jsx'
import AccountLayout from './AccountLayout.jsx'

// /cart and /wishlist also work for guests, so the account sidebar appears only when someone is signed in.
export default function InAccount({ children }) {
  const { user } = useAuth()
  return user ? <AccountLayout>{children}</AccountLayout> : children
}