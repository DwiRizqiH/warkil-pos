import { useStore } from '../store.jsx';
import { DAYS_ID, MONTHS_ID, addDays, parseYmd, ymd } from '../utils.js';

// Event / libur yang ditandai pemilik, tampil di layar kasir
export default function EventBanner() {
  const { getMark, now } = useStore();
  const today = ymd(now);
  const mark = getMark(today);
  const upcoming = [];
  for (let i = 1; i <= 7; i++) {
    const d = ymd(addDays(now, i));
    const m = getMark(d);
    if (m?.type === 'event') {
      const dd = parseYmd(d);
      upcoming.push({ date: d, name: m.name, label: `${DAYS_ID[dd.getDay()].slice(0, 3)}, ${dd.getDate()} ${MONTHS_ID[dd.getMonth()].slice(0, 3)}` });
    }
  }
  if (!mark && upcoming.length === 0) return null;
  return (
    <div className="event-bar">
      {mark?.type === 'event' && <span className="badge dark">Hari ini: {mark.name}</span>}
      {mark?.type === 'libur' && <span className="badge red">Hari ini ditandai libur</span>}
      {upcoming.map((u) => (
        <span key={u.date} className="badge mute">
          {u.label}: {u.name}
        </span>
      ))}
    </div>
  );
}
