import Icon from './Icon.jsx';
import { grossOf, priceOf } from '../data.js';
import { rupiah } from '../utils.js';

export function Thumb({ menu }) {
  return (
    <div className="thumb">
      {menu.image ? (
        <img src={menu.image} alt={menu.name} loading="lazy" />
      ) : (
        <span className="thumb-emoji">{menu.emoji || '🍽️'}</span>
      )}
    </div>
  );
}

// Kartu menu yang dipakai di halaman pemilik, kasir, dan pelanggan
export default function MenuCard({ menu, menus, rank, onClick, footer, qty }) {
  const price = priceOf(menu, menus);
  const gross = menu.items ? grossOf(menu, menus) : null;
  return (
    <div className={'menu-card' + (onClick ? ' clickable' : '')} onClick={onClick}>
      <div className="menu-media">
        <Thumb menu={menu} />
        {rank && (
          <span className="rank">
            <Icon name="star" size={12} fill="currentColor" stroke="none" /> Top {rank}
          </span>
        )}
        {menu.items && menu.discount > 0 && <span className="disc">-{menu.discount}%</span>}
        {qty > 0 && <span className="qty-badge">{qty}</span>}
      </div>
      <div className="menu-body">
        <div className="menu-name">
          {rank && <span className="star">★</span>}
          {menu.name}
        </div>
        {menu.items && (
          <div className="menu-desc">
            {menu.items
              .map((it) => `${it.qty > 1 ? it.qty + '× ' : ''}${menus.find((m) => m.id === it.id)?.name || '?'}`)
              .join(' + ')}
          </div>
        )}
        <div className="menu-price">
          {gross && gross !== price && <s>{rupiah(gross)}</s>}
          <b>{rupiah(price)}</b>
        </div>
      </div>
      {footer}
    </div>
  );
}
