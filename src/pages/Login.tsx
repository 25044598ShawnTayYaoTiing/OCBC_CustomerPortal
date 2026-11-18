import { ArrowRight, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { configurationError } from '../lib/api';
import { Brand, ErrorBox } from '../components/ui';

export function Login() {
  const { login, profile, reason } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const destination =
    typeof location.state?.from === 'string' &&
    location.state.from.startsWith('/') &&
    !location.state.from.startsWith('//')
      ? location.state.from
      : '/';

  if (profile) return <Navigate to={destination} replace />;

  return (
    <main className="auth-page">
      <section className="auth-showcase">
        <Brand inverse />
        <div className="auth-showcase-body">
          <span className="auth-badge">
            <ShieldCheck size={14} /> Demo
          </span>
          <h1>Manage your banking requests</h1>
          <p>
            Update your details, upload documents and check your request status.
          </p>

        </div>
      </section>

      <section className="auth-entry">
        <div className="auth-card">
          <div className="auth-card-head">
            <h2>Sign in</h2>
          </div>
          {reason && <p className="alert alert-info" role="status" style={{ marginBottom: 16 }}>{reason}</p>}
          {configurationError && <div style={{ marginBottom: 16 }}><ErrorBox message={configurationError} /></div>}
          <form
            className="auth-form"
            onSubmit={async e => {
              e.preventDefault();
              setBusy(true);
              setError('');
              try {
                await login(username.trim(), password);
                setPassword('');
                navigate(destination, { replace: true });
              } catch (err) {
                setError(err instanceof Error ? err.message : 'Unable to sign in.');
              } finally {
                setBusy(false);
              }
            }}
          >
            <label>
              Customer username
              <input
                autoComplete="username"
                name="username"
                required
                maxLength={80}
                placeholder="e.g. alex.tan"
                value={username}
                onChange={e => setUsername(e.target.value)}
              />
            </label>
            <label>
              Password
              <input
                autoComplete="current-password"
                name="password"
                type="password"
                required
                maxLength={128}
                placeholder="Enter your password"
                value={password}
                onChange={e => setPassword(e.target.value)}
              />
            </label>
            {error && <ErrorBox message={error} />}
            <button className="button primary full" disabled={busy || !!configurationError}>
              {busy ? 'Signing in…' : 'Sign in'}
              <ArrowRight size={16} />
            </button>
          </form>
        </div>
      </section>
    </main>
  );
}
