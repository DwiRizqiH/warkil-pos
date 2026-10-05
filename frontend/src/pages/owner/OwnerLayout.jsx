import { Outlet } from 'react-router-dom';
import Shell from '../../components/Shell.jsx';

const ITEMS = [
  { to: '/pemilik/kalender', label: 'Kalender', icon: 'cal' },
  { to: '/pemilik/menu', label: 'Menu dan Kategori', icon: 'book' },
  { to: '/pemilik/penjualan', label: 'Penjualan', icon: 'chart' },
  { to: '/pemilik/performa', label: 'Performa Kasir', icon: 'user' },
];

export default function OwnerLayout() {
  return (
    <Shell role="Pemilik" home="/pemilik" items={ITEMS}>
      <div className="page">
        <Outlet />
      </div>
    </Shell>
  );
}
