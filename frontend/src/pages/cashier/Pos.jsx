import { useMemo, useState } from 'react';
import MenuCard from '../../components/MenuCard.jsx';
import Icon from '../../components/Icon.jsx';
import PayModal from './PayModal.jsx';
import { useStore } from '../../store.jsx';
import { priceOf } from '../../data.js';
import { sortMenus } from '../../selectors.js';
import { rupiah } from '../../utils.js';

export default function Pos() {
  const { menus, categories, best } = useStore();
  const [cat, setCat] = useState('all');
  const [q, setQ] = useState('');
  const [cart, setCart] = useState([]);
  const [orderType, setOrderType] = useState('dine');
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

  const qtyOf = (id) => cart.find((i) => i.id === id)?.qty || 0;
  const count = cart.reduce((s, i) => s + i.qty, 0);
  const total = cart.reduce((s, i) => s + i.price * i.qty, 0);

  const add = (m) =>
    setCart((prev) => {
      const ex = prev.find((i) => i.id === m.id);
      if (ex) return prev.map((i) => (i.id === m.id ? { ...i, qty: i.qty + 1 } : i));
      return [...prev, { id: m.id, name: m.name, price: priceOf(m, menus), qty: 1, note: '' }];
    });
  const step = (id, d) =>
    setCart((prev) => prev.map((i) => (i.id === id ? { ...i, qty: i.qty + d } : i)).filter((i) => i.qty > 0));
  const remove = (id) => setCart((prev) => prev.filter((i) => i.id !== id));
  const setNote = (id, note) => setCart((prev) => prev.map((i) => (i.id === id ? { ...i, note } : i)));
  const reset = () => {
    setCart([]);
    setNoteOpen(null);
    setPay(false);
    setOrderType('dine');
  };

  return (
    <div className="pos">
      <aside className="pos-bill card" id="bill">
        <div className="bill-head">
          <h3>Nota Pesanan</h3>
          <button className="btn btn-ghost btn-sm" disabled={!cart.length} onClick={reset}>
            Kosongkan
          </button>
        </div>

        <div className="bill-lines">
          {cart.length === 0 && (
            <div className="bill-empty">
              <Icon name="receipt" size={30} />
              <p>Belum ada pesanan.<br />Pilih menu di sebelah kanan.</p>
            </div>
          )}
          {cart.map((i) => (
            <div className="bill-line" key={i.id}>
              <div className="bl-top">
                <div className="bl-name">{i.name}</div>
                <button className="icon-btn xs" onClick={() => remove(i.id)} aria-label={`Hapus ${i.name}`}>
                  <Icon name="trash" size={16} />
                </button>
              </div>
              <div className="bl-mid">
                <div className="qty">
                  <button onClick={() => step(i.id, -1)} aria-label="Kurangi">−</button>
                  <span>{i.qty}</span>
                  <button onClick={() => step(i.id, 1)} aria-label="Tambah">+</button>
                </div>
                <div className="bl-sub">{rupiah(i.price * i.qty)}</div>
              </div>
              {noteOpen === i.id || i.note ? (
                <input
                  className="input sm"
                  placeholder="Catatan (mis. tanpa sambal)"
                  value={i.note}
                  autoFocus={noteOpen === i.id}
                  onChange={(e) => setNote(i.id, e.target.value)}
                />
              ) : (
                <button className="link" onClick={() => setNoteOpen(i.id)}>+ catatan</button>
              )}
            </div>
          ))}
        </div>

        <div className="bill-foot">
          <div className="seg full">
            <button className={orderType === 'dine' ? 'on' : ''} onClick={() => setOrderType('dine')}>Makan di tempat</button>
            <button className={orderType === 'take' ? 'on' : ''} onClick={() => setOrderType('take')}>Takeaway</button>
          </div>
          <div className="bill-total">
            <span>Total ({count} item)</span>
            <b>{rupiah(total)}</b>
          </div>
          <button className="btn btn-primary btn-lg btn-block" disabled={!cart.length} onClick={() => setPay(true)}>
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
              <MenuCard key={m.id} menu={m} menus={menus} rank={rank.get(m.id)?.rank} qty={qtyOf(m.id)} onClick={() => add(m)} />
            ))}
          </div>
        )}
      </section>

      {cart.length > 0 && (
        <a href="#bill" className="bill-fab">
          <Icon name="receipt" size={18} /> Nota ({count}) · {rupiah(total)}
        </a>
      )}

      {pay && <PayModal cart={cart} total={total} orderType={orderType} onClose={() => setPay(false)} onDone={reset} />}
    </div>
  );
}
