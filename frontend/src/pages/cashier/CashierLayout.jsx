import { Outlet, useNavigate } from 'react-router-dom';
import Shell from '../../components/Shell.jsx';
import EventBanner from '../../components/EventBanner.jsx';
import { useStore } from '../../store.jsx';
import { useAuth } from '../../auth/AuthContext.jsx';
import { pad } from '../../utils.js';

export default function CashierLayout() {
  const { now } = useStore();
  const { user, logout } = useAuth();
  const nav = useNavigate();

  const items = [
    { to: '/kasir', label: 'Buat Pesanan', icon: 'cart', end: true },
    { to: '/kasir/penjualan', label: 'Penjualan', icon: 'receipt' },
    { to: '/kasir/pesanan', label: 'Pesanan Kasir', icon: 'cart' },
    {
      label: 'Log out',
      icon: 'logout',
      onClick: async () => {
        try {
          await logout.mutateAsync();
        } catch {
          // The session may already be gone; the cashier leaves this screen either way.
        } finally {
          nav('/kasir/login');
        }
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
          <span className="chip dark-chip">{user?.name}</span>
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
