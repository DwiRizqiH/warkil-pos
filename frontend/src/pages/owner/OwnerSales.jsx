
import { useMemo, useState } from 'react';
import BarChart from '../../components/BarChart.jsx';
import StatTile from '../../components/StatTile.jsx';
import { useStore } from '../../store.jsx';
import { isSale, orderTypeLabel, txQty } from '../../selectors.js';
import { MONTHS_ID, addDays, fmtDateShort, parseYmd, rupiah, ymd } from '../../utils.js';

const PAGE = 15;

export default function OwnerSales() {
  const { allTx, now } = useStore();
  const today = ymd(now);

  const [mode, setMode] = useState('harian');
  const [period, setPeriod] = useState('bulan');
  const [page, setPage] = useState(0);

  // Menentukan batas tanggal berdasarkan filter periode.
  const startDate = useMemo(() => {
    if (period === 'hari') return today;
    if (period === 'bulan') return `${today.slice(0, 7)}-01`;
    return ymd(addDays(now, -29));
  }, [period, today, now]);

  // Transaksi yang masuk dalam periode terpilih.
  const rows = useMemo(() => {
    return allTx
      .filter((t) => isSale(t) && t.date >= startDate && t.date <= today)
      .slice()
      .sort((a, b) => (b.date + b.time).localeCompare(a.date + a.time));
  }, [allTx, startDate, today]);

  // Rekap mengikuti periode yang dipilih.
  const summary = useMemo(() => {
    let count = 0;
    let qty = 0;
    let total = 0;
    const days = new Set();

    for (const t of rows) {
      count++;
      qty += txQty(t);
      total += t.total;
      days.add(t.date);
    }

    return {
      count,
      qty,
      total,
      days: days.size,
    };
  }, [rows]);

  // Diagram harian mengikuti periode terpilih.
  const daily = useMemo(() => {
    const out = [];
    const totals = new Map();

    for (const t of rows) {
      totals.set(t.date, (totals.get(t.date) || 0) + t.total);
    }

    const start = parseYmd(startDate);
    const end = parseYmd(today);

    for (
      let d = new Date(start.getFullYear(), start.getMonth(), start.getDate());
      d <= end;
      d.setDate(d.getDate() + 1)
    ) {
      const key = ymd(d);
      out.push({
        label: String(d.getDate()),
        title: `${d.getDate()} ${MONTHS_ID[d.getMonth()]}`,
        value: totals.get(key) || 0,
        hl: key === today,
      });
    }

    return out;
  }, [rows, startDate, today]);

  // Diagram bulanan mengikuti periode terpilih.
  const monthly = useMemo(() => {
    const map = new Map();

    for (const t of rows) {
      const key = t.date.slice(0, 7);
      map.set(key, (map.get(key) || 0) + t.total);
    }

    return [...map.entries()]
      .sort((a, b) => a[0].localeCompare(b[0]))
      .slice(-6)
      .map(([key, value]) => {
        const m = parseInt(key.slice(5), 10) - 1;

        return {
          label: MONTHS_ID[m].slice(0, 3),
          title: `${MONTHS_ID[m]} ${key.slice(0, 4)}`,
          value,
          hl: key === today.slice(0, 7),
        };
      });
  }, [rows, today]);

  const pages = Math.max(1, Math.ceil(rows.length / PAGE));
  const cur = Math.min(page, pages - 1);
  const shown = rows.slice(cur * PAGE, cur * PAGE + PAGE);

  const periodLabel = {
    hari: 'Hari Ini',
    bulan: 'Bulan Ini',
    semua: 'Semua Hari',
  }[period];

  const changePeriod = (value) => {
    setPeriod(value);
    setPage(0);
  };

  return (
    <div className="stack-lg">
      <h1 className="h1">Penjualan</h1>

      <section className="stack">
        <div className="spread wrap">
          <h2 className="section-title">Rekap penjualan</h2>
          <span className="muted sm">{periodLabel}</span>
        </div>

        <div className="seg">
          <button
            className={period === 'hari' ? 'on' : ''}
            onClick={() => changePeriod('hari')}
          >
            Hari Ini
          </button>
          <button
            className={period === 'bulan' ? 'on' : ''}
            onClick={() => changePeriod('bulan')}
          >
            Bulan Ini
          </button>
          <button
            className={period === 'semua' ? 'on' : ''}
            onClick={() => changePeriod('semua')}
          >
            Semua Hari
          </button>
        </div>

        <div className="grid-4">
          <StatTile label="Total Penjualan" value={rupiah(summary.total)} accent />
          <StatTile label="Total Transaksi" value={summary.count.toLocaleString('id-ID')} />
          <StatTile label="Menu Terjual" value={summary.qty.toLocaleString('id-ID')} />
          <StatTile
            label="Rata-rata per Hari"
            value={rupiah(summary.days ? summary.total / summary.days : 0)}
          />
        </div>
      </section>

      <section className="card card-pad stack">
        <div className="spread wrap">
          <h2 className="section-title">Diagram penjualan</h2>
          <div className="seg">
            <button
              className={mode === 'harian' ? 'on' : ''}
              onClick={() => setMode('harian')}
            >
              Harian
            </button>
            <button
              className={mode === 'bulanan' ? 'on' : ''}
              onClick={() => setMode('bulanan')}
            >
              Bulanan
            </button>
          </div>
        </div>

        <BarChart data={mode === 'harian' ? daily : monthly} />

        <p className="muted sm">
          Diagram menyesuaikan periode laporan yang dipilih.
        </p>
      </section>

      <section className="card card-pad stack">
        <div className="spread wrap">
          <h2 className="section-title">Tabel transaksi</h2>
          <span className="muted sm">
            {rows.length} transaksi · <b>{rupiah(summary.total)}</b>
          </span>
        </div>

        <div className="table-wrap">
          <table className="tbl">
            <thead>
              <tr>
                <th>Tanggal</th>
                <th>Jam</th>
                <th>ID Transaksi</th>
                <th>Antrian</th>
                <th>Tipe</th>
                <th>Kasir</th>
                <th>Item</th>
                <th>Bayar</th>
                <th className="r">Total</th>
              </tr>
            </thead>
            <tbody>
              {shown.map((t) => (
                <tr key={t.id}>
                  <td>{fmtDateShort(t.date)}</td>
                  <td>{t.time}</td>
                  <td className="mono">{t.id}</td>
                  <td><span className="qchip">{t.queue}</span></td>
                  <td>{orderTypeLabel(t)}</td>
                  <td>{t.cashier}</td>
                  <td>{txQty(t)}</td>
                  <td>{t.payment}</td>
                  <td className="r"><b>{rupiah(t.total)}</b></td>
                </tr>
              ))}

              {shown.length === 0 && (
                <tr>
                  <td colSpan={9} className="empty-note">
                    Tidak ada transaksi pada periode ini.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="spread">
          <span className="muted sm">
            Halaman {cur + 1} dari {pages}
          </span>

          <div className="row">
            <button
              className="btn btn-ghost btn-sm"
              disabled={cur === 0}
              onClick={() => setPage(cur - 1)}
            >
              Sebelumnya
            </button>
            <button
              className="btn btn-ghost btn-sm"
              disabled={cur >= pages - 1}
              onClick={() => setPage(cur + 1)}
            >
              Berikutnya
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
