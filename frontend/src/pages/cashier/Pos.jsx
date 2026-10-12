import { useMemo, useState } from 'react';
import MenuCard from '../../components/MenuCard.jsx';
import Icon from '../../components/Icon.jsx';
import PayModal from './PayModal.jsx';
import { useStore } from '../../store.jsx';
import { useCart } from '../../context/CartContext.jsx';
import { qtyOf as qtyInCart } from '../../context/cartReducer.js';
import { priceOf } from '../../data.js';
import { sortMenus } from '../../selectors.js';
import { rupiah } from '../../utils.js';

export default function Pos() {
  const { menus, categories, best } = useStore();
  const cart = useCart();
  const [cat, setCat] = useState('all');
  const [q, setQ] = useState('');
  const [noteOpen, setNoteOpen] = useState(null);
  const [pay, setPay] = useState(false);

  const rank = useMemo(() => new Map(best.map((b) => [b.id, b])), [best]);
  const catOrder = useMemo(() => new Map(categories.map((c, i) => [c.id, i])), [categories]);
  const visible = useMemo(() => {
    const term = q.trim().toLowerCase();
    let list = menus;
    if (term) list = list.filter((m) => m.name.toLowerCase().includes(term));
    else if (cat !== 'all') list = list.filter((m) => m.cat === cat);
    return sortMenus(list, rank, cat === 'all' || term ? catOrder : undefined);
  }, [menus, cat, q, rank, catOrder]);

  const add = (m) => cart.dispatch({ type: 'add', menu: { id: m.id, name: m.name, price: priceOf(m, menus) } });
  const reset = () => {
    cart.dispatch({ type: 'clear' });
    setNoteOpen(null);
    setPay(false);
  };

  return (
    <div className="pos">
      <aside className="pos-bill card" id="bill">
        <div className="bill-head">
          <h3>Nota Pesanan</h3>
          <button className="btn btn-ghost btn-sm" disabled={!cart.lines.length} onClick={reset}>
            Kosongkan
          </button>
        </div>

        <div className="bill-lines">
          {cart.lines.length === 0 && (
            <div className="bill-empty">
              <Icon name="receipt" size={30} />
              <p>Belum ada pesanan.<br />Pilih menu di sebelah kanan.</p>
            </div>
          )}
          {cart.lines.map((i) => (
            <div className="bill-line" key={i.id}>
              <div className="bl-top">
                <div className="bl-name">{i.name}</div>
                <button className="icon-btn xs" onClick={() => cart.dispatch({ type: 'remove', id: i.id })} aria-label={`Hapus ${i.name}`}>
                  <Icon name="trash" size={16} />
                </button>
              </div>
              <div className="bl-mid">
                <div className="qty">
                  <button onClick={() => cart.dispatch({ type: 'step', id: i.id, delta: -1 })} aria-label="Kurangi">−</button>
                  <span>{i.qty}</span>
                  <button onClick={() => cart.dispatch({ type: 'step', id: i.id, delta: 1 })} aria-label="Tambah">+</button>
                </div>
                <div className="bl-sub">{rupiah(i.price * i.qty)}</div>
              </div>
              {noteOpen === i.id || i.note ? (
                <input
                  className="input sm"
                  placeholder="Catatan (mis. tanpa sambal)"
                  value={i.note}
                  autoFocus={noteOpen === i.id}
                  onChange={(e) => cart.dispatch({ type: 'note', id: i.id, note: e.target.value })}
                />
              ) : (
                <button className="link" onClick={() => setNoteOpen(i.id)}>+ catatan</button>
              )}
            </div>
          ))}
        </div>

        <div className="bill-foot">
          <div className="seg full">
            <button className={cart.orderType === 'dine' ? 'on' : ''} onClick={() => cart.dispatch({ type: 'orderType', orderType: 'dine' })}>Makan di tempat</button>
            <button className={cart.orderType === 'take' ? 'on' : ''} onClick={() => cart.dispatch({ type: 'orderType', orderType: 'take' })}>Takeaway</button>
          </div>
          <div className="bill-total">
            <span>Total ({cart.count} item)</span>
            <b>{rupiah(cart.total)}</b>
          </div>
          <button className="btn btn-primary btn-lg btn-block" disabled={!cart.lines.length} onClick={() => setPay(true)}>
            Bayar
          </button>
        </div>
      </aside>

      <section className="pos-menu">
        <div className="pos-tools">
          <div className="search">
            <Icon name="search" size={18} />
            <input placeholder="Cari menu…" value={q} onChange={(e) => setQ(e.target.value)} />
            {q && (
              <button className="icon-btn xs" onClick={() => setQ('')} aria-label="Hapus pencarian">
                <Icon name="close" size={16} />
              </button>
            )}
          </div>
          <div className="chips scroll">
            <button className={'chip' + (cat === 'all' && !q ? ' active' : '')} onClick={() => { setCat('all'); setQ(''); }}>Semua</button>
            {categories.map((c) => (
              <button key={c.id} className={'chip' + (cat === c.id && !q ? ' active' : '')} onClick={() => { setCat(c.id); setQ(''); }}>
                {c.name}
              </button>
            ))}
          </div>
        </div>

        {visible.length === 0 ? (
          <div className="card card-pad empty-note">Menu tidak ditemukan.</div>
        ) : (
          <div className="menu-grid pos-grid">
            {visible.map((m) => (
              <MenuCard key={m.id} menu={m} menus={menus} rank={rank.get(m.id)?.rank} qty={qtyInCart(cart, m.id)} onClick={() => add(m)} />
            ))}
          </div>
        )}
      </section>

      {cart.lines.length > 0 && (
        <a href="#bill" className="bill-fab">
          <Icon name="receipt" size={18} /> Nota ({cart.count}) · {rupiah(cart.total)}
        </a>
      )}

      {pay && <PayModal onClose={() => setPay(false)} onDone={reset} />}
    </div>
  );
}
