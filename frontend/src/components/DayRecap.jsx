import { useNavigate } from 'react-router-dom';
import ShiftCard from './ShiftCard.jsx';
import StatTile from './StatTile.jsx';
import { useStore } from '../store.jsx';
import { getShifts } from '../selectors.js';
import { fmtDateLong, rupiah } from '../utils.js';

// Rekap satu hari: 3 ringkasan + ID card tiap shift (dipakai di kalender pemilik)
export default function DayRecap({ date }) {
  const { index, now, session, getMark } = useStore();
  const nav = useNavigate();
  const mark = getMark(date);
  const sum = index.daily.get(date) || { count: 0, qty: 0, total: 0 };
  const shifts = getShifts(index, date, { session, now });

  return (
    <section className="stack">
      <div className="spread">
        <h2 className="section-title">Rekap {fmtDateLong(date)}</h2>
        {mark?.type === 'libur' && <span className="badge red">Libur</span>}
        {mark?.type === 'event' && <span className="badge dark">Event: {mark.name}</span>}
      </div>
      <div className="grid-3">
        <StatTile label="Total Transaksi" value={sum.count} />
        <StatTile label="Menu Terjual" value={sum.qty} />
        <StatTile label="Total Penjualan" value={rupiah(sum.total)} accent />
      </div>
      {shifts.length === 0 ? (
        <div className="card card-pad empty-note">Belum ada data shift pada tanggal ini.</div>
      ) : (
        <div className="grid-2">
          {shifts.map((s) => (
            <ShiftCard
              key={s.idx}
              shift={s}
              onClick={() => nav(`/pemilik/performa?date=${date}&shift=${s.idx}`)}
            />
          ))}
        </div>
      )}
    </section>
  );
}
