import { useState } from 'react';
import StatTile from '../../components/StatTile.jsx';
import { useStore } from '../../store.jsx';
import { isSale, sourceLabel, statusLabel, statusTone } from '../../selectors.js';
import { fmtDateLong, rupiah, ymd } from '../../utils.js';

const SOURCES = [
  ['semua', 'Semua'],
  ['kasir', 'Kasir'],
  ['online', 'Online'],
];

export default function CashierSales() {
  const { index, now } = useStore();
  const [src, setSrc] = useState('semua');
  const [state, setState] = useState('semua');
  const today = ymd(now);

  const all = (index.byDate.get(today) || []).slice().reverse();
  const sum = index.daily.get(today) || { count: 0, qty: 0, total: 0 };

  const list = all.filter((t) => {
    const s = t.status;
    const srcOk = src === 'semua' || (src === 'online' ? t.channel !== 'kasir' : t.channel === src);
    const stOk = state === 'semua' || (state === 'berlangsung' ? s === 'proses' || s === 'siap' : s === 'selesai');
    return srcOk && stOk;
  });

  return (
    <div className="stack-lg">
      <div>
        <h1 className="h1">Penjualan</h1>
        <p className="muted">{fmtDateLong(today)} · semua pesanan (kasir dan online)</p>
      </div>

      <div className="grid-3">
        <StatTile label="Transaksi hari ini" value={sum.count} />
        <StatTile label="Item terjual" value={sum.qty} />
        <StatTile label="Pendapatan hari ini" value={rupiah(sum.total)} accent />
      </div>

      <div className="spread wrap">
        <div className="chips scroll">
          {SOURCES.map(([id, label]) => (
            <button key={id} className={'chip' + (src === id ? ' active' : '')} onClick={() => setSrc(id)}>{label}</button>
          ))}
        </div>
        <div className="seg">
          {[['semua', 'Semua'], ['berlangsung', 'Berlangsung'], ['selesai', 'Selesai']].map(([id, label]) => (
            <button key={id} className={state === id ? 'on' : ''} onClick={() => setState(id)}>{label}</button>
          ))}
        </div>
      </div>

      <div className="card">
        <div className="table-wrap tall">
          <table className="tbl">
            <thead>
              <tr><th>Jam</th><th>Antrian</th><th>Sumber</th><th>Pesanan</th><th>Status</th><th className="r">Total</th></tr>
            </thead>
            <tbody>
              {list.map((t) => {
                const s = t.status;
                return (
                  <tr key={t.id} className={isSale(t) ? '' : 'dim'}>
                    <td>{t.time}</td>
                    <td><span className="qchip">{t.queue || '—'}</span></td>
                    <td>{sourceLabel(t)}</td>
                    <td className="wrap-cell">{t.items.map((i) => `${i.qty}× ${i.name}`).join(', ')}</td>
                    <td><span className={'badge ' + statusTone(s)}>{statusLabel(t)}</span></td>
                    <td className="r"><b>{rupiah(t.total)}</b></td>
                  </tr>
                );
              })}
              {list.length === 0 && <tr><td colSpan={6} className="empty-note">Belum ada pesanan.</td></tr>}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
