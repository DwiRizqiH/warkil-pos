import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import Icon from './Icon.jsx';
import BrandMark from './BrandMark.jsx';

// Kerangka halaman dengan burger di kiri atas (dipakai halaman Pemilik & Kasir)
export default function Shell({ role, home, items, right, children }) {
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  const nav = useNavigate();
  useEffect(() => setOpen(false), [loc.pathname]);

  const atHome = loc.pathname === home;
  const goBack = () => (window.history.state?.idx > 0 ? nav(-1) : nav(home));

  return (
    <div className="shell">
      <header className="topbar">
        <button className="icon-btn dark" onClick={() => setOpen(true)} aria-label="Buka menu">
          <Icon name="menu" />
        </button>
        {!atHome && (
          <button className="icon-btn dark" onClick={goBack} aria-label="Kembali ke halaman sebelumnya">
            <Icon name="back" />
          </button>
        )}
        <Link to={home} className="brand">
          <BrandMark />
          <span className="brand-text">
            <b>Kikil Abang</b>
            <small>{role}</small>
          </span>
        </Link>
        <div className="topbar-right">{right}</div>
      </header>

      {open && <div className="scrim" onClick={() => setOpen(false)} />}
      <aside className={'drawer' + (open ? ' open' : '')} aria-hidden={!open}>
        <div className="drawer-head">
          <div className="brand">
            <BrandMark />
            <span className="brand-text">
              <b>Warung Kikil Abang</b>
              <small>{role}</small>
            </span>
          </div>
          <button className="icon-btn" onClick={() => setOpen(false)} aria-label="Tutup menu">
            <Icon name="close" />
          </button>
        </div>
        <nav className="drawer-nav">
          {items.map((it) =>
            it.onClick ? (
              <button key={it.label} className="drawer-item danger" onClick={it.onClick}>
                <Icon name={it.icon} />
                <span>{it.label}</span>
              </button>
            ) : (
              <NavLink
                key={it.to}
                to={it.to}
                end={it.end}
                className={({ isActive }) => 'drawer-item' + (isActive ? ' active' : '')}
              >
                <Icon name={it.icon} />
                <span>{it.label}</span>
              </NavLink>
            )
          )}
        </nav>
      </aside>

      <main className="shell-main">{children}</main>
    </div>
  );
}
