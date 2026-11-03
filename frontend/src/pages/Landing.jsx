import { Link } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import BrandMark from '../components/BrandMark.jsx';

export default function Landing() {
  return (
    <div className="landing">
      <section className="landing-intro">
        <BrandMark size="lg" />
        <div className="landing-copy">
          <h1>Warung Kikil Abang</h1>
          <p>Kasir warung untuk mencatat pesanan, menerima pembayaran, dan melihat rekap penjualan harian.</p>
        </div>
        <ul className="landing-points">
          <li><Icon name="cart" size={18} /> Input pesanan cepat dari layar tablet.</li>
          <li><Icon name="cash" size={18} /> Pembayaran cash atau QRIS dengan nota otomatis.</li>
          <li><Icon name="chart" size={18} /> Rekap harian, kalender, dan performa kasir.</li>
        </ul>
        <p className="landing-meta">Sistem kasir internal Warung Kikil Abang.</p>
      </section>

      <section className="landing-roles">
        <h2>Masuk sebagai</h2>
        <p className="muted">Pilih peran untuk melanjutkan.</p>
        <div className="role-grid two">
          <Link to="/pemilik" className="role-card">
            <div className="role-card-head">
              <span className="role-ico"><Icon name="chart" size={24} /></span>
              <h3>Pemilik</h3>
            </div>
            <p>Rekap penjualan, kalender, menu &amp; kategori, dan performa kasir.</p>
            <span className="role-go">Buka dashboard <Icon name="chev" size={16} /></span>
          </Link>

          <Link to="/kasir/login" className="role-card">
            <div className="role-card-head">
              <span className="role-ico"><Icon name="receipt" size={24} /></span>
              <h3>Pegawai Kasir</h3>
            </div>
            <p>Input pesanan, bayar cash atau QRIS, dan pantau antrean pesanan.</p>
            <span className="role-go">Login kasir <Icon name="chev" size={16} /></span>
          </Link>
        </div>
      </section>
    </div>
  );
}
