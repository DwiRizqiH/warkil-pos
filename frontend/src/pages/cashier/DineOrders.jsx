import { useState } from 'react';
import { ReceiptModal } from '../../components/Receipt.jsx';
import Icon from '../../components/Icon.jsx';
import { useStore } from '../../store.jsx';
import { orderTypeLabel, statusLabel, statusTone } from '../../selectors.js';
import { rupiah, ymd } from '../../utils.js';

const FILTERS = [
  { id: 'aktif', label: 'Berlangsung' },
  { id: 'selesai', label: 'Selesai' },
  { id: 'semua', label: 'Semua' },
];

// Papan pesanan yang diinput lewat kasir (makan di tempat & takeaway)
export default function DineOrders() {
  const { index, now, updateTx } = useStore();
  const [filter, setFilter] = useState('aktif');
  const [receipt, setReceipt] = useState(null);
  const today = ymd(now);

  const list = (index.byDate.get(today) || [])
    .filter((t) => {
      if (filter === 'aktif') return t.status === 'proses' || t.status === 'siap';
      if (filter === 'selesai') return t.status === 'selesai';
      return true;
    })
    .slice()
    .reverse();

  return (
    <div className="stack-lg">
      <div>
        <h1 className="h1">Pesanan Kasir</h1>
        <p className="muted">Pesanan yang diinput lewat kasir hari ini, lengkap dengan status penyiapan.</p>
      </div>

      <div className="chips scroll">
        {FILTERS.map((f) => (
          <button key={f.id} className={'chip' + (filter === f.id ? ' active' : '')} onClick={() => setFilter(f.id)}>
            {f.label}
          </button>
        ))}
      </div>

      {list.length === 0 ? (
        <div className="card card-pad empty-note">Tidak ada pesanan pada filter ini.</div>
      ) : (
        <div className="order-grid">
          {list.map((t) => (
            <article key={t.id} className="order card">
              <div className="order-top">
                <div>
                  <div className="queue-big">{t.queue}</div>
                  <div className="muted sm">{t.time} · {t.id.slice(-4)}</div>
                </div>
                <div className="order-badges">
                  <span className="badge mute">{orderTypeLabel(t)}</span>
                  <span className={'badge ' + statusTone(t.status)}>{statusLabel(t)}</span>
                </div>
              </div>

              <ul className="order-items">
                {t.items.map((it, i) => (
                  <li key={i}>
                    <span>{it.qty}× {it.name}</span>
                    {it.note && <em>» {it.note}</em>}
                  </li>
                ))}
              </ul>
              {t.note && <div className="order-note">Catatan: {t.note}</div>}

              <div className="order-foot">
                <div>
                  <b>{rupiah(t.total)}</b>
                  <span className="muted sm"> · {t.payment}</span>
                </div>
                <div className="row">
                  <button className="icon-btn sm" onClick={() => setReceipt(t)} aria-label="Cetak nota">
                    <Icon name="print" size={18} />
                  </button>
                  {t.status === 'proses' && (
                    <button className="btn btn-dark btn-sm" onClick={() => updateTx(t.id, { status: 'siap' })}>
                      Tandai siap
                    </button>
                  )}
                  {t.status === 'siap' && (
                    <button className="btn btn-primary btn-sm" onClick={() => updateTx(t.id, { status: 'selesai' })}>
                      <Icon name="check" size={16} /> Selesai
                    </button>
                  )}
                </div>
              </div>
            </article>
          ))}
        </div>
      )}

      {receipt && <ReceiptModal tx={receipt} onClose={() => setReceipt(null)} />}
    </div>
  );
}
