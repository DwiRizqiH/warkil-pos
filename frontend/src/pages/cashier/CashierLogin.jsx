import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { CASHIERS } from '../../data.js';
import { useStore } from '../../store.jsx';

export default function CashierLogin() {
  const { session, login } = useStore();
  const nav = useNavigate();
  const [name, setName] = useState(CASHIERS[0]);
  const [pin, setPin] = useState('');

  if (session) return <Navigate to="/kasir" replace />;

  const submit = (e) => {
    e.preventDefault();
    login(name);
    nav('/kasir');
  };

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={submit}>
        <div className="brand-mark lg">K</div>
        <h1>Login Kasir</h1>
        <p className="muted">Masuk di awal shift. Jangan lupa log out saat shift selesai.</p>

        <label className="label">Nama kasir</label>
        <div className="pick-list">
          {CASHIERS.map((c) => (
            <button type="button" key={c} className={'pick' + (c === name ? ' on' : '')} onClick={() => setName(c)}>
              {c}
            </button>
          ))}
        </div>

        <label className="label">PIN (ketik 4 angka apa saja)</label>
        <input
          className="input pin"
          inputMode="numeric"
          maxLength={4}
          placeholder="••••"
          type="password"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
        />

        <button className="btn btn-primary btn-lg btn-block" disabled={pin.length < 4}>
          Mulai shift
        </button>
        <Link to="/" className="muted-link center">← Kembali</Link>
      </form>
    </div>
  );
}
