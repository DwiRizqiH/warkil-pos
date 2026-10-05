import Icon from './Icon.jsx';
import { MONTHS_ID, pad } from '../utils.js';

// Kalender bulanan. Tanggal libur berwarna merah, event ditandai dengan nama.
export default function CalendarGrid({ cursor, onCursor, selected, onSelect, getMark, todayStr }) {
  const y = cursor.getFullYear();
  const m = cursor.getMonth();
  const lead = new Date(y, m, 1).getDay();
  const days = new Date(y, m + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < lead; i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push(d);
  while (cells.length % 7) cells.push(null);

  return (
    <div className="cal">
      <div className="cal-head">
        <button className="icon-btn sm" onClick={() => onCursor(new Date(y, m - 1, 1))} aria-label="Bulan sebelumnya">
          <Icon name="back" />
        </button>
        <div className="cal-title">
          {MONTHS_ID[m]} {y}
        </div>
        <button className="icon-btn sm" onClick={() => onCursor(new Date(y, m + 1, 1))} aria-label="Bulan berikutnya">
          <Icon name="chev" />
        </button>
      </div>
      <div className="cal-grid cal-dow">
        {['Min', 'Sen', 'Sel', 'Rab', 'Kam', 'Jum', 'Sab'].map((d, i) => (
          <div key={d} className={i === 0 ? 'sun' : ''}>
            {d}
          </div>
        ))}
      </div>
      <div className="cal-grid">
        {cells.map((d, i) => {
          if (!d) return <div key={i} className="cal-cell empty" />;
          const date = `${y}-${pad(m + 1)}-${pad(d)}`;
          const mark = getMark ? getMark(date) : null;
          const cls = ['cal-cell'];
          if (mark?.type === 'libur') cls.push('libur');
          if (mark?.type === 'event') cls.push('event');
          if (date === todayStr) cls.push('today');
          if (date === selected) cls.push('sel');
          if (date > todayStr) cls.push('future');
          return (
            <button key={i} className={cls.join(' ')} onClick={() => onSelect(date)}>
              <span className="cal-num">{d}</span>
              {mark?.type === 'event' && <span className="cal-ev">{mark.name}</span>}
              {mark?.type === 'libur' && <span className="cal-ev">Libur</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
