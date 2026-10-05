import { useState } from 'react';
import Icon from '../../components/Icon.jsx';
import { useStore } from '../../store.jsx';
import { DRIVERS, PLATFORMS, priceOf } from '../../data.js';
import { statusLabel, statusTone } from '../../selectors.js';
import { rupiah, ymd } from '../../utils.js';

export default function OnlineOrders() {
  const { index, now, menus, createOrder, updateTx } = useStore();
  const [platform, setPlatform] = useState('semua');
  const [tab, setTab] = useState('aktif');
  const today = ymd(now);

  const online = (index.byDate.get(today) || []).filter((t) => t.channel !== 'kasir');
  const stat = (code) => {
    const l = online.filter((t) => t.channel === code && t.status !== 'batal');
    return { active: l.filter((t) => t.status !== 'selesai').length, done: l.filter((t) => t.status === 'selesai').length };
  };

  const list = online
    .filter((t) => platform === 'semua' || t.channel === platform)
    .filter((t) => (tab === 'aktif' ? t.status === 'proses' || t.status === 'siap' : tab === 'selesai' ? t.status === 'selesai' : true))
    .slice()
    .reverse();

  // Simulasi pesanan masuk dari aplikasi (untuk demo)
  const simulate = (code) => {
    const pool = menus.filter((m) => !m.items);
    const items = [];
    for (let i = 0; i < 2 + Math.floor(Math.random() * 2); i++) {
      const m = pool[Math.floor(Math.random() * pool.length)];
      if (!items.find((x) => x.id === m.id)) items.push({ id: m.id, name: m.name, qty: 1 + Math.floor(Math.random() * 2), price: priceOf(m, menus), note: '' });
    }
    createOrder({
      channel: code,
      orderType: 'take',
      payment: 'Aplikasi',
      status: 'proses',
      items,
      driver: DRIVERS[Math.floor(Math.random() * DRIVERS.length)],
      ref: `${code}-${1000 + Math.floor(Math.random() * 8999)}`,
    });
  };

  return (
    <div className="stack-lg">
      <div className="spread wrap">
        <div>
          <h1 className="h1">Pesanan Online</h1>
          <p className="muted">Pesanan GoFood, GrabFood, dan ShopeeFood dengan antrian terpisah.</p>
        </div>
      </div>

      <div className="platform-grid">
        <button className={'platform' + (platform === 'semua' ? ' on' : '')} onClick={() => setPlatform('semua')}>
          <b>Semua</b>
          <small>{online.filter((t) => t.status !== 'selesai' && t.status !== 'batal').length} berlangsung</small>
        </button>
        {PLATFORMS.map((p) => {
          const s = stat(p.code);
          return (
            <button key={p.code} className={'platform' + (platform === p.code ? ' on' : '')} onClick={() => setPlatform(p.code)}>
              <span className="pcode">{p.code}</span>
              <b>{p.name}</b>
              <small>{s.active} berlangsung · {s.done} selesai</small>
            </button>
          );
        })}
      </div>

      <div className="spread wrap">
        <div className="chips scroll">
          {[['aktif', 'Berlangsung'], ['selesai', 'Sudah diambil'], ['semua', 'Semua']].map(([id, label]) => (
            <button key={id} className={'chip' + (tab === id ? ' active' : '')} onClick={() => setTab(id)}>{label}</button>
          ))}
        </div>
        <div className="row">
          <span className="muted sm">Demo pesanan masuk:</span>
          {PLATFORMS.map((p) => (
            <button key={p.code} className="btn btn-ghost btn-sm" onClick={() => simulate(p.code)}>+ {p.code}</button>
          ))}
        </div>
      </div>

      {list.length === 0 ? (
        <div className="card card-pad empty-note">Belum ada pesanan online pada filter ini.</div>
      ) : (
        <div className="order-grid">
          {list.map((t) => (
            <article key={t.id} className="order card">
              <div className="order-top">
                <div>
                  <div className="queue-big online">{t.queue}</div>
                  <div className="muted sm">{PLATFORMS.find((p) => p.code === t.channel)?.name} · {t.ref}</div>
                </div>
                <div className="order-badges">
                  <span className={'badge ' + statusTone(t.status)}>{statusLabel(t)}</span>
                  <span className="muted sm">{t.time}</span>
                </div>
              </div>
              <div className="driver"><Icon name="user" size={16} /> Driver: <b>{t.driver}</b></div>
              <ul className="order-items">
                {t.items.map((it, i) => (
                  <li key={i}><span>{it.qty}× {it.name}</span>{it.note && <em>» {it.note}</em>}</li>
                ))}
              </ul>
              <div className="order-foot">
                <b>{rupiah(t.total)}</b>
                {t.status === 'proses' && (
                  <button className="btn btn-dark btn-sm" onClick={() => updateTx(t.id, { status: 'siap' })}>Tandai siap diambil</button>
                )}
                {t.status === 'siap' && (
                  <button className="btn btn-primary btn-sm" onClick={() => updateTx(t.id, { status: 'selesai' })}>
                    <Icon name="check" size={16} /> Sudah diambil driver
                  </button>
                )}
                {t.status === 'selesai' && <span className="muted sm">Selesai</span>}
              </div>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
