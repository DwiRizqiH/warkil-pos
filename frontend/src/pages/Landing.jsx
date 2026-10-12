import { Link } from 'react-router-dom';
import Icon from '../components/Icon.jsx';

export default function Landing() {
  return (
    <div className="landing">
      <section className="hero">
        <div className="hero-inner">
          <div className="brand-mark lg">K</div>
          <h1>Warung Kikil Abang</h1>
          <p>Sistem kasir Warung Kikil Abang.</p>
        </div>
      </section>

      <section className="role-grid two">
        <Link to="/pemilik" className="role-card">
          <div className="role-ico"><Icon name="chart" size={26} /></div>
          <h3>Pemilik</h3>
          <p>Rekap harian, mingguan, bulanan, kalender, menu &amp; kategori, performa kasir.</p>
          <span className="role-go">Buka dashboard <Icon name="chev" size={16} /></span>
        </Link>

        <Link to="/kasir/login" className="role-card">
          <div className="role-ico"><Icon name="receipt" size={26} /></div>
          <h3>Pegawai Kasir</h3>
          <p>Tampilan tablet: input pesanan, bayar cash atau QRIS.</p>
          <span className="role-go">Login kasir <Icon name="chev" size={16} /></span>
        </Link>
      </section>
    </div>
  );
}
