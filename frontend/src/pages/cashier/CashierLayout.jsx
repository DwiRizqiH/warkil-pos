import { Navigate, Outlet, useNavigate } from 'react-router-dom';
import Shell from '../../components/Shell.jsx';
import EventBanner from '../../components/EventBanner.jsx';
import { useStore } from '../../store.jsx';
import { useCart } from '../../context/CartContext.jsx';
import { pad } from '../../utils.js';

export default function CashierLayout() {
  const { session, logout, now } = useStore();
  const cart = useCart();
  const nav = useNavigate();

  if (!session) return <Navigate to="/kasir/login" replace />;

  const items = [
    { to: '/kasir', label: 'Buat Pesanan', icon: 'cart', end: true },
    { to: '/kasir/penjualan', label: 'Penjualan', icon: 'receipt' },
    { to: '/kasir/pesanan', label: 'Pesanan Kasir', icon: 'cart' },
    {
      label: 'Log out',
      icon: 'logout',
      onClick: () => {
        // Tablet dipakai bergantian: keranjang dikosongkan supaya kasir berikutnya tidak mewarisinya.
        cart.dispatch({ type: 'clear' });
        logout();
        nav('/kasir/login');
      },
    },
  ];

  return (
    <Shell
      role="Kasir"
      home="/kasir"
      items={items}
      right={
        <>
          <span className="chip dark-chip">{session.cashier}</span>
          <span className="top-clock">{pad(now.getHours())}:{pad(now.getMinutes())}</span>
        </>
      }
    >
      <div className="page-fluid">
        <EventBanner />
        <Outlet />
      </div>
    </Shell>
  );
}
