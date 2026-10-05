import { Link } from 'react-router-dom';
import Icon from '../components/Icon.jsx';
import { useStore } from '../store.jsx';

export default function Landing() {
  const { resetDemo } = useStore();
  return (
    <div className="landing">
      <section className="hero">
        <div className="hero-inner">
          <div className="brand-mark lg">K</div>
          <h1>Warung Kikil Abang</h1>
          <p>Mockup sistem kasir. Semua data hanyalah contoh (dummy).</p>
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
          <p>Tampilan tablet: input pesanan, bayar cash atau QR, dan pesanan online.</p>
          <span className="role-go">Login kasir <Icon name="chev" size={16} /></span>
        </Link>
      </section>

      <section className="landing-foot">
        <button className="link" onClick={resetDemo}>Reset data demo</button>
      </section>
    </div>
  );
}
