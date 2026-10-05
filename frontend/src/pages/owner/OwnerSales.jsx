import { useMemo, useState } from 'react';
import BarChart from '../../components/BarChart.jsx';
import StatTile from '../../components/StatTile.jsx';
import Icon from '../../components/Icon.jsx';
import { useStore } from '../../store.jsx';
import { isSale, sourceLabel, txQty } from '../../selectors.js';
import { MONTHS_ID, addDays, fmtDateShort, parseYmd, rupiah, ymd } from '../../utils.js';

const PAGE = 15;

export default function OwnerSales() {
  const { index, allTx, now } = useStore();
  const today = ymd(now);
  const [mode, setMode] = useState('harian'); // harian | bulanan
  const [tableMode, setTableMode] = useState('bulan'); // semua | bulan
  const [month, setMonth] = useState(today.slice(0, 7));
  const [page, setPage] = useState(0);

  const all = useMemo(() => {
    let count = 0, qty = 0, total = 0;
    for (const s of index.daily.values()) {
      count += s.count;
      qty += s.qty;
      total += s.total;
    }
    return { count, qty, total, days: index.daily.size };
  }, [index]);

  const daily = useMemo(() => {
    const out = [];
    for (let i = 29; i >= 0; i--) {
      const d = addDays(now, -i);
      const key = ymd(d);
      out.push({
        label: String(d.getDate()),
        title: `${d.getDate()} ${MONTHS_ID[d.getMonth()]}`,
        value: index.daily.get(key)?.total || 0,
        hl: key === today,
      });
    }
    return out;
  }, [index, now, today]);

  const monthly = useMemo(() => {
    const map = new Map();
    for (const [date, s] of index.daily) {
      const k = date.slice(0, 7);
      map.set(k, (map.get(k) || 0) + s.total);
    }
    return [...map.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-6)
      .map(([k, v]) => {
        const m = parseInt(k.slice(5), 10) - 1;
        return { label: MONTHS_ID[m].slice(0, 3), title: `${MONTHS_ID[m]} ${k.slice(0, 4)}`, value: v, hl: k === today.slice(0, 7) };
      });
  }, [index, today]);

  const rows = useMemo(() => {
    const list = allTx.filter((t) => isSale(t) && (tableMode === 'semua' || t.date.startsWith(month)));
    list.sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
    return list;
  }, [allTx, tableMode, month]);

  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const cur = Math.min(page, pages - 1);
  const shown = rows.slice(cur * PAGE, cur * PAGE + PAGE);
  const monthTotal = rows.reduce((s, t) => s + t.total, 0);

  const shiftMonth = (n) => {
    const d = parseYmd(month + '-01');
    const nd = new Date(d.getFullYear(), d.getMonth() + n, 1);
    setMonth(ymd(nd).slice(0, 7));
    setPage(0);
  };
  const mLabel = `${MONTHS_ID[parseInt(month.slice(5), 10) - 1]} ${month.slice(0, 4)}`;

  return (
    <div className="stack-lg">
      <h1 className="h1">Penjualan</h1>

      <section className="stack">
        <h2 className="section-title">Rekap penjualan selama ini</h2>
        <div className="grid-4">
          <StatTile label="Total Penjualan" value={rupiah(all.total)} accent />
          <StatTile label="Total Transaksi" value={all.count.toLocaleString('id-ID')} />
          <StatTile label="Menu Terjual" value={all.qty.toLocaleString('id-ID')} />
          <StatTile label="Rata-rata per Hari" value={rupiah(all.days ? all.total / all.days : 0)} />
        </div>
      </section>

      <section className="card card-pad stack">
        <div className="spread wrap">
          <h2 className="section-title">Diagram penjualan</h2>
          <div className="seg">
            <button className={mode === 'harian' ? 'on' : ''} onClick={() => setMode('harian')}>Harian</button>
            <button className={mode === 'bulanan' ? 'on' : ''} onClick={() => setMode('bulanan')}>Bulanan</button>
          </div>
        </div>
        <BarChart data={mode === 'harian' ? daily : monthly} />
        <p className="muted sm">
          {mode === 'harian' ? '30 hari terakhir. Batang merah = hari ini.' : 'Bulan paling awal dan bulan berjalan belum penuh.'}
        </p>
      </section>

      <section className="card card-pad stack">
        <div className="spread wrap">
          <h2 className="section-title">Tabel transaksi</h2>
          <div className="seg">
            <button className={tableMode === 'bulan' ? 'on' : ''} onClick={() => { setTableMode('bulan'); setPage(0); }}>1 bulan</button>
            <button className={tableMode === 'semua' ? 'on' : ''} onClick={() => { setTableMode('semua'); setPage(0); }}>Selama ini</button>
          </div>
        </div>
        {tableMode === 'bulan' && (
          <div className="spread wrap">
            <div className="row">
              <button className="icon-btn sm" onClick={() => shiftMonth(-1)} aria-label="Bulan sebelumnya"><Icon name="back" /></button>
              <b>{mLabel}</b>
              <button className="icon-btn sm" onClick={() => shiftMonth(1)} aria-label="Bulan berikutnya"><Icon name="chev" /></button>
            </div>
            <span className="muted">{rows.length} transaksi · <b>{rupiah(monthTotal)}</b></span>
          </div>
        )}
        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Tanggal</th><th>Jam</th><th>ID Transaksi</th><th>Antrian</th><th>Sumber</th><th>Kasir</th><th>Item</th><th>Bayar</th><th className="r">Total</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((t) => (
                <tr key={t.id}>
                  <td>{fmtDateShort(t.date)}</td>
                  <td>{t.time}</td>
                  <td className="mono">{t.id}</td>
                  <td><span className="qchip">{t.queue}</span></td>
                  <td>{sourceLabel(t)}</td>
                  <td>{t.cashier}</td>
                  <td>{txQty(t)}</td>
                  <td>{t.payment}</td>
                  <td className="r"><b>{rupiah(t.total)}</b></td>
                </tr>
              ))}
              {shown.length === 0 && (
                <tr><td colSpan={9} className="empty-note">Tidak ada transaksi.</td></tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="spread">
          <span className="muted sm">Halaman {cur + 1} dari {pages}</span>
          <div className="row">
            <button className="btn btn-ghost btn-sm" disabled={cur === 0} onClick={() => setPage(cur - 1)}>Sebelumnya</button>
            <button className="btn btn-ghost btn-sm" disabled={cur >= pages - 1} onClick={() => setPage(cur + 1)}>Berikutnya</button>
          </div>
        </div>
      </section>
    </div>
  );
}
