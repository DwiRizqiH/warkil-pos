import { Link, useNavigate } from 'react-router-dom';
import ShiftCard from '../../components/ShiftCard.jsx';
import StatTile from '../../components/StatTile.jsx';
import Icon from '../../components/Icon.jsx';
import { useStore } from '../../store.jsx';
import { getShifts, rangeSum } from '../../selectors.js';
import { MONTHS_ID, addDays, fmtDateLong, rupiah, startOfWeek, ymd } from '../../utils.js';

export default function OwnerDashboard() {
  const { index, now } = useStore();
  const nav = useNavigate();
  const today = ymd(now);
  const monthFrom = today.slice(0, 8) + '01';
  const month = rangeSum(index, monthFrom, today);
  const weekStart = startOfWeek(now);
  const week = rangeSum(index, ymd(weekStart), today);
  const todaySum = rangeSum(index, today, today);
  const averageSale = todaySum.count > 0 ? Math.round(todaySum.total / todaySum.count) : 0;
  const shifts = getShifts(index, today, { now });
  const weekLabel = `${weekStart.getDate()} ${MONTHS_ID[weekStart.getMonth()].slice(0, 3)} – ${addDays(weekStart, 6).getDate()} ${MONTHS_ID[addDays(weekStart, 6).getMonth()].slice(0, 3)}`;

  return (
    <div className="stack-lg">
      <div className="spread wrap">
        <div>
          <h1 className="h1">Halo, Pemilik</h1>
          <p className="muted">{fmtDateLong(today)}</p>
        </div>
        <span className="live-pill">
          <i /> Data diperbarui otomatis
        </span>
      </div>

      <section className="stack">
        <h2 className="section-title">Ringkasan {MONTHS_ID[now.getMonth()]} {now.getFullYear()}</h2>
        <div className="grid-3">
          <StatTile label="Total Transaksi Bulanan" value={month.count.toLocaleString('id-ID')} sub="transaksi bulan ini" />
          <StatTile label="Total Menu Terjual" value={month.qty.toLocaleString('id-ID')} sub="porsi / item bulan ini" />
          <StatTile label="Total Penjualan" value={rupiah(month.total)} sub="dalam rupiah" accent />
        </div>
      </section>

      <section className="stack">
        <div className="spread">
          <h2 className="section-title">Kasir Bertugas Hari Ini</h2>
          <span className="muted sm">Ketuk kartu untuk melihat detail</span>
        </div>
        {shifts.length === 0 ? (
          <div className="card card-pad empty-note">
            Belum ada kasir yang login hari ini. Warung buka pukul 08:00.
          </div>
        ) : (
          <div className="grid-2">
            {shifts.map((s) => (
              <ShiftCard key={s.idx} shift={s} onClick={() => nav(`/pemilik/performa?date=${today}&shift=${s.idx}`)} />
            ))}
            {shifts.length === 1 && (
              <div className="card card-pad recap">
                <div className="spread">
                  <h3>Rata-rata transaksi hari ini</h3>
                  <span className="badge mute">Sampai sekarang</span>
                </div>
                <div className="recap-big">{rupiah(averageSale)}</div>
                <div className="recap-row">
                  <span><b>{todaySum.qty.toLocaleString('id-ID')}</b> menu terjual</span>
                  <span><b>{todaySum.count.toLocaleString('id-ID')}</b> transaksi</span>
                </div>
                <Link to={`/pemilik/performa?date=${today}`} className="link-row">
                  Lihat performa kasir <Icon name="chev" size={16} />
                </Link>
              </div>
            )}
          </div>
        )}
      </section>

      <section className="grid-2">
        <div className="card card-pad recap">
          <div className="spread">
            <h3>Rekap Mingguan</h3>
            <span className="badge mute">{weekLabel}</span>
          </div>
          <div className="recap-big">{rupiah(week.total)}</div>
          <div className="recap-row">
            <span><b>{week.qty.toLocaleString('id-ID')}</b> menu terjual</span>
            <span><b>{week.count.toLocaleString('id-ID')}</b> transaksi</span>
          </div>
          <Link to="/pemilik/penjualan" className="link-row">
            Lihat penjualan <Icon name="chev" size={16} />
          </Link>
        </div>
        <div className="card card-pad recap">
          <div className="spread">
            <h3>Rekap Bulanan</h3>
            <span className="badge mute">{MONTHS_ID[now.getMonth()]} {now.getFullYear()}</span>
          </div>
          <div className="recap-big">{rupiah(month.total)}</div>
          <div className="recap-row">
            <span><b>{month.qty.toLocaleString('id-ID')}</b> menu terjual</span>
            <span><b>{month.count.toLocaleString('id-ID')}</b> transaksi</span>
          </div>
          <Link to="/pemilik/penjualan" className="link-row">
            Lihat penjualan <Icon name="chev" size={16} />
          </Link>
        </div>
      </section>
    </div>
  );
}
