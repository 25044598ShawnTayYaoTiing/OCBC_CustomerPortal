import { ArrowRight, Check, FileCheck2, Files, LockKeyhole, ShieldCheck } from 'lucide-react';
import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth';
import { configurationError } from '../lib/api';
import { Brand, ErrorBox } from '../components/ui';

export function Login() {
  const { login, profile, reason } = useAuth();
  const location = useLocation(); const navigate = useNavigate();
  const [username, setUsername] = useState(''); const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const destination = typeof location.state?.from === 'string' && location.state.from.startsWith('/') && !location.state.from.startsWith('//') ? location.state.from : '/';
  if (profile) return <Navigate to={destination} replace />;
  return <main className="login-page business-login">
    <header className="login-header"><Brand /><div className="login-header-description">Business document services<span>Customer access</span></div><span className="login-demo-label"><ShieldCheck size={15} />Demonstration only</span></header>
    <div className="login-disclaimer"><ShieldCheck size={16} /><span>Fictional banking portal. Synthetic customer accounts only. Not affiliated with OCBC.</span></div>
    <div className="login-body">
      <section className="login-story"><div className="login-story-content"><p className="eyebrow">AFI BANKING DEMO &middot; BUSINESS DOCUMENTS</p><h1>Your business documents.<br /><em>A clearer way forward.</em></h1><p>Submit an application, keep track of your documents, and respond to requests from one customer workspace.</p>
        <div className="banking-illustration" aria-hidden="true"><div className="illustration-rule" /><div className="illustration-document"><span className="illustration-heading"><Files size={21} /><i /></span><div /><div /><div /><span className="illustration-stamp"><Check size={23} /></span></div><div className="illustration-caption"><span>DOCUMENT SERVICES</span><strong>Submit. Track. Respond.</strong><small>One connected application journey.</small></div></div>
        <div className="story-steps">{[[FileCheck2, 'Submit your documents', 'Send your synthetic account-opening forms.'], [Files, 'Track your application', 'See the status recorded by the service.'], [Check, 'Respond to requests', 'Return corrected PDFs to the same case.']].map(([Icon, title, description], i) => { const Symbol = Icon as typeof Check; return <div key={String(title)}><span className="story-step-number">0{i + 1}</span><Symbol size={19} /><div><strong>{String(title)}</strong><small>{String(description)}</small></div></div>; })}</div>
      </div></section>
      <section className="login-entry"><div className="login-form"><div className="login-card-heading"><LockKeyhole size={21} /><div><p className="eyebrow">CUSTOMER ACCESS</p><h2>Sign in to your portal</h2></div></div><p>Use your provisioned synthetic customer account.</p>
        {reason && <p className="session-message" role="status">{reason}</p>}{configurationError && <ErrorBox message={configurationError} />}
        <form onSubmit={async e => { e.preventDefault(); setBusy(true); setError(''); try { await login(username.trim(), password); setPassword(''); navigate(destination, { replace: true }); } catch (e) { setError(e instanceof Error ? e.message : 'Unable to sign in.'); } finally { setBusy(false); } }}>
          <label>Customer username<input autoComplete="username" name="username" required maxLength={80} placeholder="Enter your username" value={username} onChange={e => setUsername(e.target.value)} /></label>
          <label>Password<input autoComplete="current-password" name="password" type="password" required maxLength={128} placeholder="Enter your password" value={password} onChange={e => setPassword(e.target.value)} /></label>
          {error && <ErrorBox message={error} />}<button className="button primary full" disabled={busy || !!configurationError}>{busy ? 'Signing you in...' : 'Sign in'}<ArrowRight size={17} /></button>
        </form>
        <div className="login-help"><ShieldCheck size={18} /><p>Need access to the demonstration?<br /><span>Contact your demo administrator for a customer account.</span></p></div><p className="login-session-note">Your session stays in memory. Refreshing this page requires you to sign in again.</p>
      </div><div className="login-access-note"><LockKeyhole size={15} /><p>Never enter real banking credentials or upload real customer documents in this demonstration.</p></div></section>
    </div><footer className="login-bottomline"><span>&copy; AFI Banking Demo &middot; Independent hackathon project</span><span>Fictional branding. Synthetic documents. Real submission workflow.</span></footer>
  </main>;
}
