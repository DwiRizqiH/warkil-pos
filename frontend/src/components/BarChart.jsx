import { rupiah, rupiahShort } from '../utils.js';

function niceMax(v) {
  const e = Math.pow(10, Math.floor(Math.log10(v)));
  const f = v / e;
  const nf = f <= 1 ? 1 : f <= 2 ? 2 : f <= 2.5 ? 2.5 : f <= 5 ? 5 : 10;
  return nf * e;
}

// Diagram batang sederhana (SVG, responsif)
export default function BarChart({ data, height = 260 }) {
  const W = 680;
  const H = height;
  const padL = 56;
  const padR = 8;
  const padT = 12;
  const padB = 30;
  const max = Math.max(1, ...data.map((d) => d.value));
  const nice = niceMax(max);
  const ticks = [0, 0.25, 0.5, 0.75, 1].map((f) => nice * f);
  const bw = (W - padL - padR) / data.length;
  const every = Math.ceil(data.length / 12);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="chart" role="img" aria-label="Diagram penjualan">
      {ticks.map((t) => {
        const y = padT + (H - padT - padB) * (1 - t / nice);
        return (
          <g key={t}>
            <line x1={padL} x2={W - padR} y1={y} y2={y} className="grid" />
            <text x={padL - 8} y={y + 4} textAnchor="end" className="ax">
              {rupiahShort(t)}
            </text>
          </g>
        );
      })}
      {data.map((d, i) => {
        const h = (H - padT - padB) * (d.value / nice);
        const w = bw * 0.68;
        const x = padL + i * bw + (bw - w) / 2;
        const y = H - padB - h;
        return (
          <g key={i}>
            <rect x={x} y={y} width={w} height={Math.max(h, 0)} rx={Math.min(4, w / 2)} className={'bar' + (d.hl ? ' hl' : '')}>
              <title>{`${d.title || d.label}: ${rupiah(d.value)}`}</title>
            </rect>
            {i % every === 0 && (
              <text x={x + w / 2} y={H - 10} textAnchor="middle" className="ax">
                {d.label}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
}
