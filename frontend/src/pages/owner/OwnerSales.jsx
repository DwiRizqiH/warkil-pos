
import { useMemo, useState } from 'react';
import DataTable from 'datatables.net-react';
import DT from 'datatables.net-dt';
import 'datatables.net-dt/css/dataTables.dataTables.css';
import BarChart from '../../components/BarChart.jsx';
import StatTile from '../../components/StatTile.jsx';
import Icon from '../../components/Icon.jsx';
import { useStore } from '../../store.jsx';
import { isSale, orderTypeLabel, txQty } from '../../selectors.js';
import { downloadCsv } from '../../csv.js';
import { MONTHS_ID, addDays, fmtDateShort, parseYmd, rupiah, ymd } from '../../utils.js';

// `use` here registers the DataTables library with its React wrapper; it is not a React hook.
// eslint-disable-next-line react-hooks/rules-of-hooks
DataTable.use(DT);

const SALES_COLUMNS = [
  {
    data: 'date',
    title: 'Tanggal',
    type: 'string',
    render: (value, type) => (type === 'sort' ? value : fmtDateShort(value)),
  },
  { data: 'time', title: 'Jam', type: 'string' },
  { data: 'id', title: 'ID Transaksi', className: 'mono', type: 'string' },
  {
    data: 'queue',
    title: 'Antrian',
    type: 'num',
    render: (value, type) => (type === 'display' ? `<span class="qchip">${value}</span>` : value),
  },
  { data: 'type', title: 'Tipe', type: 'string' },
  { data: 'cashier', title: 'Kasir', type: 'string', render: DT.render.text() },
  { data: 'qty', title: 'Item', type: 'num' },
  { data: 'payment', title: 'Bayar', type: 'string' },
  {
    data: 'total',
    title: 'Total',
    className: 'r',
    type: 'num',
    render: (value, type) => {
      if (type === 'sort') return value;

      const text = rupiah(value);
      return type === 'display' ? `<b>${text}</b>` : text;
    },
  },
];

const SALES_TABLE_OPTIONS = {
  order: [
    [0, 'desc'],
    [1, 'desc'],
  ],
  pageLength: 15,
  lengthMenu: [10, 15, 25, 50, 100],
  autoWidth: false,
  language: {
    search: 'Cari:',
    searchPlaceholder: 'Cari transaksi…',
    lengthMenu: 'Tampilkan _MENU_ transaksi',
    info: 'Menampilkan _START_–_END_ dari _TOTAL_ transaksi',
    infoEmpty: 'Tidak ada transaksi',
    infoFiltered: '(difilter dari _MAX_ transaksi)',
    zeroRecords: 'Tidak ada transaksi yang cocok.',
    emptyTable: 'Tidak ada transaksi pada periode ini.',
    paginate: {
      first: 'Awal',
      previous: 'Sebelumnya',
      next: 'Berikutnya',
      last: 'Akhir',
    },
  },
};

export default function OwnerSales() {
  const { allTx, now } = useStore();
  const today = ymd(now);

  const [mode, setMode] = useState('harian');
  const [period, setPeriod] = useState('bulan');

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

  const tableRows = useMemo(
    () =>
      rows.map((t) => ({
        date: t.date,
        time: t.time,
        id: t.id,
        queue: t.queue,
        type: orderTypeLabel(t),
        cashier: t.cashier,
        qty: txQty(t),
        payment: t.payment,
        total: t.total,
      })),
    [rows],
  );

  const periodLabel = {
    hari: 'Hari Ini',
    bulan: 'Bulan Ini',
    semua: 'Semua Hari',
  }[period];

  const downloadSales = () => {
    downloadCsv(`rekap-penjualan-${startDate}-${today}.csv`, [
      ['Rekap Penjualan', 'Warung Kikil Abang'],
      ['Periode', startDate, today],
      ['Total Penjualan', summary.total],
      ['Total Transaksi', summary.count],
      ['Menu Terjual', summary.qty],
      [],
      ['Tanggal', 'Jam', 'ID Transaksi', 'Antrian', 'Tipe', 'Kasir', 'Item', 'Bayar', 'Total'],
      ...rows.map((t) => [t.date, t.time, t.id, t.queue, orderTypeLabel(t), t.cashier, txQty(t), t.payment, t.total]),
    ]);
  };

  return (
    <div className="stack-lg">
      <div className="spread wrap">
        <h1 className="h1">Penjualan</h1>
        <button className="btn btn-ghost" disabled={rows.length === 0} onClick={downloadSales}>
          <Icon name="download" size={18} /> Unduh Excel
        </button>
      </div>

      <section className="stack">
        <div className="spread wrap">
          <h2 className="section-title">Rekap penjualan</h2>
          <span className="muted sm">{periodLabel}</span>
        </div>

        <div className="seg">
          <button
            className={period === 'hari' ? 'on' : ''}
            onClick={() => setPeriod('hari')}
          >
            Hari Ini
          </button>
          <button
            className={period === 'bulan' ? 'on' : ''}
            onClick={() => setPeriod('bulan')}
          >
            Bulan Ini
          </button>
          <button
            className={period === 'semua' ? 'on' : ''}
            onClick={() => setPeriod('semua')}
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

        <div className="sales-table">
          <DataTable
            key={period}
            data={tableRows}
            columns={SALES_COLUMNS}
            options={SALES_TABLE_OPTIONS}
            className="tbl"
          />
        </div>
      </section>
    </div>
  );
}
