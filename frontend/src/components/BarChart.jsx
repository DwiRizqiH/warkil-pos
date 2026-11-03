import {
  Bar,
  BarChart as RechartsBarChart,
  Brush,
  CartesianGrid,
  Cell,
  LabelList,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { rupiah, rupiahShort } from '../utils.js';

const AXIS_TICK = { fill: 'var(--mute)', fontSize: 11 };

export default function BarChart({ data, height = 260 }) {
  if (data.length === 0) {
    return <p className="empty-note">Belum ada penjualan pada periode ini.</p>;
  }

  return (
    <div className="chart-wrap" style={{ height }} role="img" aria-label="Diagram penjualan">
      <ResponsiveContainer width="100%" height="100%">
        <RechartsBarChart data={data} accessibilityLayer margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid stroke="var(--line)" vertical={false} />
          <XAxis
            dataKey="label"
            axisLine={false}
            tickLine={false}
            tick={AXIS_TICK}
            interval="preserveStartEnd"
            minTickGap={12}
          />
          <YAxis
            width={52}
            axisLine={false}
            tickLine={false}
            tick={AXIS_TICK}
            tickFormatter={rupiahShort}
          />
          <Tooltip
            cursor={{ fill: 'rgba(20, 18, 17, 0.05)' }}
            contentStyle={{
              background: '#fff',
              border: '1px solid var(--line)',
              borderRadius: 10,
              boxShadow: 'var(--shadow)',
              fontSize: 12,
              fontFamily: 'inherit',
            }}
            labelStyle={{ color: 'var(--mute)', fontWeight: 600, marginBottom: 4 }}
            itemStyle={{ color: 'var(--ink)', fontWeight: 700 }}
            labelFormatter={(label, payload) => payload?.[0]?.payload?.title ?? label}
            formatter={(value) => [rupiah(value), 'Penjualan']}
          />
          <Bar dataKey="value" name="Penjualan" radius={[4, 4, 0, 0]} maxBarSize={54}>
            {data.map((point) => (
              <Cell key={point.label} fill={point.hl ? 'var(--red)' : 'var(--ink)'} />
            ))}
            {data.length <= 7 && (
              <LabelList
                dataKey="value"
                position="top"
                formatter={(value) => (value ? rupiahShort(value) : '')}
                fill="var(--mute)"
                fontSize={10}
              />
            )}
          </Bar>
          {data.length > 14 && (
            <Brush
              dataKey="label"
              height={26}
              travellerWidth={12}
              stroke="var(--red)"
              fill="#fff"
            />
          )}
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
}
