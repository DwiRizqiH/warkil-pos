import { Navigate, Route, Routes } from 'react-router-dom';
import Landing from './pages/Landing.jsx';
import OwnerLayout from './pages/owner/OwnerLayout.jsx';
import OwnerDashboard from './pages/owner/OwnerDashboard.jsx';
import OwnerCalendar from './pages/owner/OwnerCalendar.jsx';
import OwnerMenu from './pages/owner/OwnerMenu.jsx';
import OwnerSales from './pages/owner/OwnerSales.jsx';
import OwnerPerformance from './pages/owner/OwnerPerformance.jsx';
import CashierLogin from './pages/cashier/CashierLogin.jsx';
import CashierLayout from './pages/cashier/CashierLayout.jsx';
import Pos from './pages/cashier/Pos.jsx';
import DineOrders from './pages/cashier/DineOrders.jsx';
import OnlineOrders from './pages/cashier/OnlineOrders.jsx';
import CashierSales from './pages/cashier/CashierSales.jsx';

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />

      <Route path="/pemilik" element={<OwnerLayout />}>
        <Route index element={<OwnerDashboard />} />
        <Route path="kalender" element={<OwnerCalendar />} />
        <Route path="menu" element={<OwnerMenu />} />
        <Route path="penjualan" element={<OwnerSales />} />
        <Route path="performa" element={<OwnerPerformance />} />
      </Route>

      <Route path="/kasir/login" element={<CashierLogin />} />
      <Route path="/kasir" element={<CashierLayout />}>
        <Route index element={<Pos />} />
        <Route path="pesanan" element={<DineOrders />} />
        <Route path="online" element={<OnlineOrders />} />
        <Route path="penjualan" element={<CashierSales />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
