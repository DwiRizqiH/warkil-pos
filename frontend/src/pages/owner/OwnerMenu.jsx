import { useMemo, useRef, useState } from 'react';
import MenuCard from '../../components/MenuCard.jsx';
import Modal from '../../components/Modal.jsx';
import Icon from '../../components/Icon.jsx';
import { useStore } from '../../store.jsx';
import { api } from '../../api/client.js';
import { grossOf, priceOf } from '../../data.js';
import { menusForCategory } from '../../selectors.js';
import { rupiah } from '../../utils.js';

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;

function readPhoto(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ''));
    reader.onerror = () => reject(new Error('Foto gagal dibaca. Silakan coba lagi.'));
    reader.readAsDataURL(file);
  });
}

function loadPhoto(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Foto tidak bisa ditampilkan. Pilih file lain.'));
    image.src = src;
  });
}

// localStorage is the store, so a 5 MB camera photo would blow the quota. Shrink to menu-card size.
async function preparePhoto(file) {
  const source = await readPhoto(file);
  const image = await loadPhoto(source);
  const scale = Math.min(1, 900 / Math.max(image.width, image.height));
  if (scale === 1 && source.length < 500 * 1024) return source;

  const canvas = document.createElement('canvas');
  canvas.width = Math.round(image.width * scale);
  canvas.height = Math.round(image.height * scale);
  canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL('image/jpeg', 0.82);
}

function MenuForm({ initial, defaultCat, menus, categories, onSave, onClose }) {
  const fileInputRef = useRef(null);
  const [photoError, setPhotoError] = useState('');
  const [f, setF] = useState(() =>
    initial
      ? {
          name: initial.name,
          cat: initial.cat,
          emoji: initial.emoji || '🍽️',
          image: initial.image || '',
          price: initial.price ?? '',
          discount: initial.discount ?? 10,
          items: initial.items ? initial.items.map((x) => ({ ...x })) : [],
        }
      : { name: '', cat: defaultCat, emoji: '🍽️', image: '', price: '', discount: 10, items: [] }
  );
  const isPaket = Boolean(categories.find((c) => c.id === f.cat)?.isBundle);
  const pool = menus.filter((m) => !m.isBundle && m.id !== initial?.id);
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));

  const draft = { items: f.items, discount: Number(f.discount) || 0 };
  const gross = grossOf(draft, menus);
  const final = priceOf(draft, menus);
  const valid = f.name.trim() && (isPaket ? f.items.length > 0 : Number(f.price) > 0);

  const addItem = (id) => {
    if (!id) return;
    setF((p) => {
      const ex = p.items.find((x) => x.id === id);
      return {
        ...p,
        items: ex ? p.items.map((x) => (x.id === id ? { ...x, qty: x.qty + 1 } : x)) : [...p.items, { id, qty: 1 }],
      };
    });
  };
  const setQty = (id, d) =>
    setF((p) => ({
      ...p,
      items: p.items.map((x) => (x.id === id ? { ...x, qty: x.qty + d } : x)).filter((x) => x.qty > 0),
    }));

  const save = () => {
    const base = {
      ...(initial?.id ? { id: initial.id } : {}),
      name: f.name.trim(),
      cat: f.cat,
      emoji: f.emoji || '🍽️',
      image: f.image.trim() || null,
    };
    onSave(isPaket ? { ...base, items: f.items, discount: Number(f.discount) || 0 } : { ...base, price: Number(f.price) });
  };

  return (
    <Modal
      title={initial ? 'Edit Menu' : 'Tambah Menu'}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose}>Batal</button>
          <button className="btn btn-primary" disabled={!valid} onClick={save}>Simpan</button>
        </>
      }
    >
      <div className="form">
        <div>
          <label className="label">Nama menu</label>
          <input className="input" value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="mis. Sop Kikil" />
        </div>
        <div className="form-row">
          <div>
            <label className="label">Kategori</label>
            <select className="input" value={f.cat} onChange={(e) => set('cat', e.target.value)}>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
          {!isPaket && (
            <div>
              <label className="label">Harga (Rp)</label>
              <input className="input" type="number" min="0" value={f.price} onChange={(e) => set('price', e.target.value)} />
            </div>
          )}
          {isPaket && (
            <div>
              <label className="label">Diskon (%)</label>
              <input className="input" type="number" min="0" max="100" value={f.discount} onChange={(e) => set('discount', e.target.value)} />
            </div>
          )}
        </div>

        {isPaket && (
          <div>
            <label className="label">Isi paket</label>
            <div className="paket-list">
              {f.items.length === 0 && <div className="muted sm">Belum ada menu di paket ini.</div>}
              {f.items.map((it) => {
                const m = menus.find((x) => x.id === it.id);
                return (
                  <div key={it.id} className="paket-row">
                    <span>{m?.name || '(menu dihapus)'}</span>
                    <div className="qty">
                      <button onClick={() => setQty(it.id, -1)}>−</button>
                      <span>{it.qty}</span>
                      <button onClick={() => setQty(it.id, 1)}>+</button>
                    </div>
                  </div>
                );
              })}
            </div>
            <select className="input" value="" onChange={(e) => addItem(e.target.value)}>
              <option value="">+ Tambah menu ke paket…</option>
              {pool.map((m) => (
                <option key={m.id} value={m.id}>{m.name} — {rupiah(m.price)}</option>
              ))}
            </select>
            <div className="paket-sum">
              <span>Harga normal <s>{rupiah(gross)}</s></span>
              <b>Harga paket {rupiah(final)}</b>
            </div>
          </div>
        )}

        <div className="form-row">
          <div>
            <label className="label">Emoji (sementara pengganti foto)</label>
            <input className="input" value={f.emoji} onChange={(e) => set('emoji', e.target.value)} />
            <p className="muted sm">Gunakan emoji jika belum memiliki foto menu.</p>
          </div>
          <div>
            <label className="label">Foto menu (opsional)</label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              hidden
              onChange={async (e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (!file) return;
                if (!file.type.startsWith('image/')) {
                  setPhotoError('Pilih file gambar yang valid.');
                  return;
                }
                if (file.size > MAX_PHOTO_BYTES) {
                  setPhotoError('Ukuran foto maksimal 5 MB.');
                  return;
                }
                setPhotoError('');
                try {
                  set('image', await preparePhoto(file));
                } catch (error) {
                  setPhotoError(error.message);
                }
              }}
            />

            <button type="button" className="upload-btn" onClick={() => fileInputRef.current?.click()}>
              <Icon name="upload" size={18} />
              {f.image ? 'Ganti foto' : 'Pilih foto'}
            </button>

            <p className="muted sm">
              {f.image ? 'Foto sudah dipilih.' : 'Belum ada foto, emoji tetap dipakai.'} Maksimal 5 MB.
            </p>
            {photoError && <p className="form-error">{photoError}</p>}

            {f.image && (
              <div className="upload-preview">
                <img src={f.image} alt="Pratinjau foto menu" />
                <button type="button" className="btn btn-ghost btn-sm" onClick={() => set('image', '')}>
                  Hapus foto, gunakan emoji
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
}

function CategoryManager({ categories, menus, refreshMenus, onClose }) {
  const [name, setName] = useState('');
  const [drafts, setDrafts] = useState({});
  const [error, setError] = useState('');
  const countOf = (id) => menus.filter((m) => m.cat === id).length;

  const rename = async (category) => {
    const next = (drafts[category.id] ?? category.name).trim();
    if (!next || next === category.name) return;
    try {
      await api.patch(`/categories/${category.id}`, { name: next });
      await refreshMenus();
      setError('');
    } catch (err) {
      setError(err.message);
    }
  };

  const remove = async (category) => {
    try {
      await api.del(`/categories/${category.id}`);
      await refreshMenus();
      setError('');
    } catch (err) {
      setError(err.message);
    }
  };

  const add = async () => {
    if (!name.trim()) return;
    try {
      await api.post('/categories', { name: name.trim() });
      setName('');
      await refreshMenus();
      setError('');
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <Modal title="Kelola Kategori" onClose={onClose} footer={<button className="btn btn-dark" onClick={onClose}>Selesai</button>}>
      <div className="stack">
        {error && <p className="form-error" role="alert">{error}</p>}
        {categories.map((c) => (
          <div key={c.id} className="cat-row">
            <input
              className="input"
              value={drafts[c.id] ?? c.name}
              onChange={(e) => setDrafts((prev) => ({ ...prev, [c.id]: e.target.value }))}
              onBlur={() => rename(c)}
            />
            <span className="muted sm">{countOf(c.id)} menu</span>
            <button
              className="icon-btn sm"
              disabled={countOf(c.id) > 0}
              title={countOf(c.id) > 0 ? 'Kosongkan kategori dulu sebelum dihapus' : 'Hapus kategori'}
              onClick={() => remove(c)}
            >
              <Icon name="trash" size={18} />
            </button>
          </div>
        ))}
        <div className="cat-row">
          <input className="input" placeholder="Nama kategori baru" value={name} onChange={(e) => setName(e.target.value)} />
          <button className="btn btn-primary" disabled={!name.trim()} onClick={add}>
            Tambah
          </button>
        </div>
        <p className="muted sm">Kategori yang masih berisi menu tidak bisa dihapus.</p>
      </div>
    </Modal>
  );
}

export default function OwnerMenu() {
  const { menus, categories, best, hasMonthData, dataDays, refreshMenus } = useStore();
  const [catId, setCatId] = useState('all');
  const [form, setForm] = useState(null); // { menu? }
  const [del, setDel] = useState(null);
  const [catModal, setCatModal] = useState(false);
  const [error, setError] = useState('');

  const rank = useMemo(() => new Map(best.map((b) => [b.id, b])), [best]);
  const catOrder = useMemo(() => new Map(categories.map((c, i) => [c.id, i])), [categories]);
  const list = useMemo(() => menusForCategory(menus, catId, rank, catOrder), [menus, catId, rank, catOrder]);
  // "Semua" tab: start on a single-item category so the add form opens with price, not package builder.
  const defaultCat = catId === 'all'
    ? (categories.find((c) => !c.isBundle)?.id ?? categories[0]?.id)
    : catId;

  const save = async (menu) => {
    try {
      if (menu.id) await api.patch(`/menus/${menu.id}`, menu);
      else await api.post('/menus', menu);
      await refreshMenus();
      setError('');
      setForm(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const removeMenu = async () => {
    try {
      await api.del(`/menus/${del.id}`);
      await refreshMenus();
      setError('');
      setDel(null);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="stack-lg">
      <div className="spread wrap">
        <h1 className="h1">Menu dan Kategori</h1>
        <div className="row">
          <button className="btn btn-ghost" onClick={() => setCatModal(true)}>Kelola kategori</button>
          <button className="btn btn-primary" onClick={() => setForm({})}>
            <Icon name="plus" size={18} /> Tambah menu
          </button>
        </div>
      </div>

      {error && <p className="form-error" role="alert">{error}</p>}

      <section className="card card-pad stack">
        <div className="spread wrap">
          <h2 className="section-title">★ Best Seller</h2>
        </div>
        {hasMonthData ? (
          <>
            <div className="best-row">
              {best.map((b) => {
                const m = menus.find((x) => x.id === b.id);
                return (
                  <div key={b.id} className="best-item">
                    <span className="best-rank">★ {b.rank}</span>
                    <b>{m?.name}</b>
                    <small>{b.qty} terjual · 30 hari terakhir</small>
                  </div>
                );
              })}
            </div>
            <p className="muted sm">
              Top 3 dihitung dari seluruh menu (bukan per kategori) dan terus diperbarui mengikuti penjualan 30 hari terakhir. Menu yang masuk
              akan di-pin di paling atas kategorinya.
            </p>
          </>
        ) : (
          <p className="muted">
            Belum ada tanda ★ karena data penjualan belum mencapai 1 bulan ({dataDays} hari terkumpul).
          </p>
        )}
      </section>

      <div className="chips scroll">
        <button className={'chip' + (catId === 'all' ? ' active' : '')} onClick={() => setCatId('all')}>
          Semua <span className="chip-n">{menus.length}</span>
        </button>
        {categories.map((c) => (
          <button key={c.id} className={'chip' + (c.id === catId ? ' active' : '')} onClick={() => setCatId(c.id)}>
            {c.name} <span className="chip-n">{menus.filter((m) => m.cat === c.id).length}</span>
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <div className="card card-pad empty-note">Belum ada menu.</div>
      ) : (
        <div className="menu-grid">
          {list.map((m) => (
            <MenuCard
              key={m.id}
              menu={m}
              menus={menus}
              rank={rank.get(m.id)?.rank}
              footer={
                <div className="menu-actions">
                  <button className="btn btn-ghost btn-sm" onClick={() => setForm({ menu: m })}>
                    <Icon name="edit" size={15} /> Edit
                  </button>
                  <button className="btn btn-ghost btn-sm danger" onClick={() => setDel(m)}>
                    <Icon name="trash" size={15} /> Hapus
                  </button>
                </div>
              }
            />
          ))}
        </div>
      )}

      {form && (
        <MenuForm
          initial={form.menu}
          defaultCat={defaultCat}
          menus={menus}
          categories={categories}
          onSave={save}
          onClose={() => setForm(null)}
        />
      )}
      {catModal && (
        <CategoryManager categories={categories} menus={menus} refreshMenus={refreshMenus} onClose={() => setCatModal(false)} />
      )}
      {del && (
        <Modal
          title="Hapus menu?"
          onClose={() => setDel(null)}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setDel(null)}>Batal</button>
              <button className="btn btn-primary" onClick={removeMenu}>
                Ya, hapus
              </button>
            </>
          }
        >
          <p>
            <b>{del.name}</b> akan dihapus dari daftar menu. Riwayat penjualan tetap tersimpan.
          </p>
        </Modal>
      )}
    </div>
  );
}
