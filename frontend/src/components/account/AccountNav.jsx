// import { NavLink } from 'react-router-dom'
// import useOrderAlerts from '../../lib/orderAlerts.js'

// const link = ({ isActive }) =>
//   `relative flex items-center gap-2 whitespace-nowrap border-b pb-3 text-sm uppercase tracking-[0.18em] transition-colors ${isActive ? 'border-[#1a1716]' : 'border-transparent text-neutral-500 hover:text-[#1a1716]'}`

// export default function AccountNav() {
//   const { dot } = useOrderAlerts()
//   return (
//     <nav aria-label="Account" className="flex gap-8 overflow-x-auto border-b border-[#1a1716]/15">
//       <NavLink to="/account" end className={link}>Overview</NavLink>
//       <NavLink to="/account/orders" className={link}>
//         My orders
//         {dot && <span aria-hidden="true" className={`h-2 w-2 rounded-full ${dot === 'red' ? 'bg-red-600' : 'bg-green-600'}`} />}
//       </NavLink>
//       <NavLink to="/account/addresses" className={link}>Addresses</NavLink>
//       <NavLink to="/wishlist" className={link}>Wishlist</NavLink>
//       <NavLink to="/cart" className={link}>Bag</NavLink>
//     </nav>
//   )
// }