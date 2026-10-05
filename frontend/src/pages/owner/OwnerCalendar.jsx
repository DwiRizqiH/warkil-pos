import { useState } from 'react';
import CalendarGrid from '../../components/CalendarGrid.jsx';
import DayRecap from '../../components/DayRecap.jsx';
import Modal from '../../components/Modal.jsx';
import { useStore } from '../../store.jsx';
import { fmtDateLong, pad, useNow, ymd } from '../../utils.js';

function LiveClock() {
  const n = useNow(1000);
  return (
    <div className="clock">
      <div className="clock-time">
        {pad(n.getHours())}:{pad(n.getMinutes())}
        <small>:{pad(n.getSeconds())}</small>
      </div>
      <div className="muted">{fmtDateLong(ymd(n))}</div>
    </div>
  );
}

export default function OwnerCalendar() {
  const { now, getMark, marks, setMarks, sundayOff, setSundayOff } = useStore();
  const today = ymd(now);
  const [cursor, setCursor] = useState(() => new Date(now.getFullYear(), now.getMonth(), 1));
  const [selected, setSelected] = useState(today);
  const [sheet, setSheet] = useState(null); // null | 'action' | 'event'
  const [evName, setEvName] = useState('');

  const mark = getMark(selected);
  const future = selected > today;

  const pick = (date) => {
    setSelected(date);
    if (date > today) setSheet('action');
  };
  const setMark = (value) => {
    setMarks((prev) => ({ ...prev, [selected]: value }));
    setSheet(null);
    setEvName('');
  };
  const removeMark = () => {
    setMarks((prev) => {
      const next = { ...prev };
      delete next[selected];
      return next;
    });
    setSheet(null);
  };

  return (
    <div className="stack-lg">
      <div className="spread wrap">
        <h1 className="h1">Kalender</h1>
        <label className="switch">
          <input type="checkbox" checked={sundayOff} onChange={(e) => setSundayOff(e.target.checked)} />
          <span className="track" />
          <span>Setiap hari Minggu libur</span>
        </label>
      </div>

      <div className="cal-layout">
        <div className="card card-pad stack">
          <LiveClock />
          <CalendarGrid
            cursor={cursor}
            onCursor={setCursor}
            selected={selected}
            onSelect={pick}
            getMark={getMark}
            todayStr={today}
          />
          <div className="legend">
            <span><i className="dot red" /> Libur</span>
            <span><i className="dot dark" /> Event</span>
            <span><i className="dot ring" /> Hari ini</span>
          </div>
        </div>

        <div className="stack">
          {future ? (
            <div className="card card-pad stack">
              <h2 className="section-title">{fmtDateLong(selected)}</h2>
              <p className="muted">Tanggal ini belum terjadi, jadi belum ada rekap penjualan.</p>
              {mark ? (
                <div className="spread">
                  <span className={'badge ' + (mark.type === 'libur' ? 'red' : 'dark')}>
                    {mark.type === 'libur' ? 'Libur' : `Event: ${mark.name}`}
                  </span>
                  {!mark.auto && (
                    <button className="btn btn-ghost btn-sm" onClick={removeMark}>
                      Hapus tanda
                    </button>
                  )}
                </div>
              ) : (
                <button className="btn btn-dark" onClick={() => setSheet('action')}>
                  Tandai event / libur
                </button>
              )}
              {mark?.auto && <p className="muted sm">Libur otomatis hari Minggu. Matikan lewat pengaturan di atas.</p>}
            </div>
          ) : (
            <DayRecap date={selected} />
          )}
        </div>
      </div>

      {sheet === 'action' && (
        <Modal title={fmtDateLong(selected)} onClose={() => setSheet(null)}>
          {mark && (
            <p className="muted">
              Saat ini ditandai: <b>{mark.type === 'libur' ? 'Libur' : `Event — ${mark.name}`}</b>
            </p>
          )}
          <div className="stack">
            <button className="btn btn-dark btn-lg btn-block" onClick={() => setSheet('event')}>
              Tandai Event
            </button>
            <button className="btn btn-primary btn-lg btn-block" onClick={() => setMark({ type: 'libur' })}>
              Tandai Libur
            </button>
            {mark && !mark.auto && (
              <button className="btn btn-ghost btn-block" onClick={removeMark}>
                Hapus tanda
              </button>
            )}
          </div>
        </Modal>
      )}

      {sheet === 'event' && (
        <Modal
          title="Tandai Event"
          onClose={() => setSheet(null)}
          footer={
            <>
              <button className="btn btn-ghost" onClick={() => setSheet('action')}>
                Kembali
              </button>
              <button
                className="btn btn-primary"
                disabled={!evName.trim()}
                onClick={() => setMark({ type: 'event', name: evName.trim() })}
              >
                Simpan
              </button>
            </>
          }
        >
          <label className="label">Nama event</label>
          <input
            className="input"
            autoFocus
            placeholder="mis. Promo Gajian / Bazar Kampus"
            value={evName}
            onChange={(e) => setEvName(e.target.value)}
          />
          <p className="muted sm">Nama event akan tampil di layar pegawai kasir.</p>
        </Modal>
      )}
    </div>
  );
}
