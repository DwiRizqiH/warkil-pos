import { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../auth/AuthContext.jsx';
import BrandMark from '../../components/BrandMark.jsx';

export default function OwnerLogin() {
  const { user, loginOwner } = useAuth();
  const nav = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  // Only an owner session turns this screen away, so a signed-in cashier cannot bounce back into
  // the guarded route that sent them here.
  if (user?.role === 'OWNER') return <Navigate to="/pemilik" replace />;

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await loginOwner.mutateAsync({ username, password });
      nav('/pemilik', { replace: true });
    } catch (err) {
      setError(err.message);
      setPassword('');
    }
  };

  return (
    <div className="login-wrap">
      <form className="login-card" onSubmit={submit}>
        <BrandMark size="lg" />
        <h1>Login Pemilik</h1>
        <p className="muted">Dashboard pemilik: rekap, kalender, menu dan performa kasir.</p>

        <label className="label">Username</label>
        <input
          className="input"
          autoComplete="username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
        />

        <label className="label">Password</label>
        <input
          className="input"
          type="password"
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />

        {error && <p className="muted sm">{error}</p>}

        <button
          className="btn btn-primary btn-lg btn-block"
          disabled={!username || !password || loginOwner.isPending}
        >
          Masuk
        </button>
        <Link to="/" className="muted-link center">← Kembali</Link>
      </form>
    </div>
  );
}
