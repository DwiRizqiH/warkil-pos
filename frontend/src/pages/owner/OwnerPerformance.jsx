import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import CalendarGrid from '../../components/CalendarGrid.jsx';
import ShiftCard, { TopCashierCard } from '../../components/ShiftCard.jsx';
import { useStore } from '../../store.jsx';
import { cashierTotals, getShifts, orderTypeLabel, txQty } from '../../selectors.js';
import { MONTHS_ID, fmtDateLong, parseYmd, rupiah, ymd } from '../../utils.js';

export default function OwnerPerformance() {
  const { index, now, getMark } = useStore();
  const [params, setParams] = useSearchParams();
  const today = ymd(now);
  const selected = params.get('date') || today;
  const focus = params.get('shift');
  const detailRefs = useRef(new Map());

useEffect(() => {
  if (!focus) return;

  const target = detailRefs.current.get(focus);

  if (target) {
    target.scrollIntoView({
      behavior: 'smooth',
      block: 'start',
    });
  }
}, [focus, selected]);
  const [cursor, setCursor] = useState(() => {
    const d = parseYmd(selected);
    return new Date(d.getFullYear(), d.getMonth(), 1);
  });

  const ctx = { now };
  const monthFrom = today.slice(0, 8) + '01';
  const top = cashierTotals(index, monthFrom, today, ctx).slice(0, 2);
  const shifts = getShifts(index, selected, ctx);

  return (
    <div className="stack-lg">
      <h1 className="h1">Performa Kasir</h1>

      <section className="stack">
        <h2 className="section-title">Kasir terbaik · {MONTHS_ID[now.getMonth()]} {now.getFullYear()}</h2>
        <div className="grid-2">
          {top.map((t, i) => (
            <TopCashierCard key={t.cashier} rank={i + 1} data={t} periodLabel="bulan ini" />
          ))}
          {top.length === 0 && <div className="card card-pad empty-note">Belum ada data bulan ini.</div>}
        </div>
      </section>

      <div className="cal-layout">
        <div className="card card-pad stack">
          <h2 className="section-title">Pilih tanggal</h2>
          <CalendarGrid
            cursor={cursor}
            onCursor={setCursor}
            selected={selected}
            onSelect={(d) => setParams({ date: d })}
            getMark={getMark}
            todayStr={today}
          />
        </div>

        <div className="stack">
          <h2 className="section-title">Kasir bertugas · {fmtDateLong(selected)}</h2>
          {shifts.length === 0 ? (
            <div className="card card-pad empty-note">Belum ada data kasir pada tanggal ini.</div>
          ) : (
            <div className="grid-2 tight">
              {shifts.map((s) => (
                <ShiftCard
                  key={s.idx}
                  shift={s}
                  focus={focus === String(s.idx)}
                  onClick={() => setParams({ date: selected, shift: String(s.idx) })}
                />
              ))}
            </div>
          )}
        </div>
      </div>

{shifts.map((s) => (
  <section key={s.idx} ref={(el) => { if (el) { detailRefs.current.set(String(s.idx), el); } else { detailRefs.current.delete(String(s.idx)); }}}  style={{ scrollMarginTop: '76px' }} className={'card card-pad stack' + (focus === String(s.idx) ? ' ring' : '')}>
          <div className="spread wrap">
            <h3>Detail penjualan · {s.cashier} ({s.label})</h3>
            <span className="muted">{s.count} transaksi · <b>{rupiah(s.total)}</b></span>
          </div>
          <div className="table-wrap tall">
            <table className="tbl">
              <thead>
                <tr><th>Jam</th><th>Antrian</th><th>Tipe</th><th>Pesanan</th><th>Bayar</th><th className="r">Total</th></tr>
              </thead>
              <tbody>
                {[...s.txs].reverse().map((t) => (
                  <tr key={t.id}>
                    <td>{t.time}</td>
                    <td><span className="qchip">{t.queue}</span></td>
                    <td>{orderTypeLabel(t)}</td>
                    <td className="wrap-cell">{t.items.map((i) => `${i.qty}× ${i.name}`).join(', ')} <span className="muted">({txQty(t)} item)</span></td>
                    <td>{t.payment}</td>
                    <td className="r"><b>{rupiah(t.total)}</b></td>
                  </tr>
                ))}
                {s.txs.length === 0 && <tr><td colSpan={6} className="empty-note">Belum ada transaksi.</td></tr>}
              </tbody>
            </table>
          </div>
        </section>
      ))}
    </div>
  );
}
