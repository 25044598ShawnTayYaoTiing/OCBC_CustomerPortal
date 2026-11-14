import { ArrowRight, LockKeyhole, ShieldCheck } from 'lucide-react';
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
            <ShieldCheck size={14} /> Synthetic Banking Demo
          </span>
          <h1>Service requests, without the back-and-forth.</h1>
          <p>
            Update your mailing address, contact details, or tax residency from your existing profile—with real-time document checks and clear status tracking.
          </p>
          <div className="auth-preview-card" aria-hidden="true">
            <div className="auth-preview-step">
              <span>01</span>
              <div>
                <strong>Guided eForm or PDF upload</strong>
                <small>Prefilled from your synthetic customer profile</small>
              </div>
            </div>
            <div className="auth-preview-step">
              <span>02</span>
              <div>
                <strong>Automated evidence validation</strong>
                <small>Instant checks catch missing fields before handover</small>
              </div>
            </div>
            <div className="auth-preview-step">
              <span>03</span>
              <div>
                <strong>Direct resolution &amp; tracking</strong>
                <small>Respond to any correction request in one workspace</small>
              </div>
            </div>
          </div>
        </div>
        <div className="auth-showcase-foot">
          <span>AFI Resolve 2.0 · Customer Portal</span>
          <span>Synthetic records only · Not affiliated with OCBC</span>
        </div>
      </section>

      <section className="auth-entry">
        <div className="auth-card">
          <div className="auth-card-head">
            <p className="eyebrow">Customer Access</p>
            <h2>Sign in to your portal</h2>
            <p>Enter your provisioned synthetic customer credentials.</p>
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
          <div className="auth-note">
            <LockKeyhole size={15} style={{ flexShrink: 0, marginTop: 2 }} />
            <span>
              Your session is held in memory only. Never enter real banking credentials or upload real customer documents.
            </span>
          </div>
        </div>
      </section>
    </main>
  );
}
