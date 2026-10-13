import { Navigate } from 'react-router-dom';
import { useAuth } from './AuthContext.jsx';

export default function RequireRole({ role, loginPath, children }) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="login-wrap">
        <div className="login-card">
          <p className="muted">Memuat…</p>
        </div>
      </div>
    );
  }

  if (!user || user.role !== role) return <Navigate to={loginPath} replace />;

  return children;
}
