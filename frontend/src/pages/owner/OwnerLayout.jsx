import { Outlet, useNavigate } from 'react-router-dom';
import Shell from '../../components/Shell.jsx';
import { useAuth } from '../../auth/AuthContext.jsx';

export default function OwnerLayout() {
  const { logout } = useAuth();
  const nav = useNavigate();

  const ITEMS = [
    { to: '/pemilik/kalender', label: 'Kalender', icon: 'cal' },
    { to: '/pemilik/menu', label: 'Menu dan Kategori', icon: 'book' },
    { to: '/pemilik/kasir', label: 'Kelola Kasir', icon: 'user' },
    { to: '/pemilik/penjualan', label: 'Penjualan', icon: 'chart' },
    { to: '/pemilik/performa', label: 'Performa Kasir', icon: 'user' },
    {
      label: 'Log out',
      icon: 'logout',
      onClick: async () => {
        try {
          await logout.mutateAsync();
        } catch {
          // The session may already be gone; the cashier leaves this screen either way.
        } finally {
          nav('/pemilik/login');
        }
      },
    },
  ];

  return (
    <Shell role="Pemilik" home="/pemilik" items={ITEMS}>
      <div className="page">
        <Outlet />
      </div>
    </Shell>
  );
}
