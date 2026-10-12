import { useEffect, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router-dom';
import Icon from './Icon.jsx';

// Kerangka halaman dengan burger di kiri atas (dipakai halaman Pemilik & Kasir)
export default function Shell({ role, home, items, right, children }) {
  const [open, setOpen] = useState(false);
  const loc = useLocation();
  useEffect(() => setOpen(false), [loc.pathname]);

  return (
    <div className="shell">
      <header className="topbar">
        <button className="icon-btn dark" onClick={() => setOpen(true)} aria-label="Buka menu">
          <Icon name="menu" />
        </button>
        <Link to={home} className="brand">
          <span className="brand-mark">K</span>
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
            <span className="brand-mark">K</span>
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
