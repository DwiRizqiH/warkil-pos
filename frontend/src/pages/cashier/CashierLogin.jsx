import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../../api/client.js';
import { useAuth } from '../../auth/AuthContext.jsx';

export default function CashierLogin() {
  const { user, loginCashier } = useAuth();
  const nav = useNavigate();
  const [cashierId, setCashierId] = useState('');
  const [pin, setPin] = useState('');
  const [error, setError] = useState('');

  const { data: cashiers = [], isLoading } = useQuery({
    queryKey: ['cashiers', 'public'],
    queryFn: () => api.get('/auth/cashiers'),
  });

  // Only a cashier session turns this screen away: an owner who is still signed in can hand the
  // tablet over by letting the next cashier start a shift here.
  if (user?.role === 'CASHIER') return <Navigate to="/kasir" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await loginCashier.mutateAsync({ cashierId, pin });
      nav('/kasir', { replace: true });
    } catch (err) {
      setError(err.message);
      setPin('');
    }
  };

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={submit}>
        <div className="brand-mark lg">K</div>
        <h1>Login Kasir</h1>
        <p className="muted">Masuk di awal shift. Jangan lupa log out saat shift selesai.</p>

        <label className="label">Nama kasir</label>
        {isLoading ? (
          <p className="muted sm">Memuat daftar kasir…</p>
        ) : (
          <div className="pick-list">
            {cashiers.map((cashier) => (
              <button
                type="button"
                key={cashier.id}
                className={'pick' + (cashier.id === cashierId ? ' on' : '')}
                onClick={() => setCashierId(cashier.id)}
              >
                {cashier.name}
              </button>
            ))}
          </div>
        )}

        <label className="label">PIN</label>
        <input
          className="input pin"
          inputMode="numeric"
          maxLength={4}
          placeholder="••••"
          type="password"
          value={pin}
          onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
        />

        {error && <p className="muted sm">{error}</p>}

        <button className="btn btn-primary btn-lg btn-block" disabled={!cashierId || pin.length < 4 || loginCashier.isPending}>
          Mulai shift
        </button>
        <Link to="/" className="muted-link center">← Kembali</Link>
      </form>
    </div>
  );
}
