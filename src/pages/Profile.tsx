import { Link } from 'react-router-dom';
import { Clock3, ShieldCheck, UserRound } from 'lucide-react';
import { useAuth } from '../auth';
import { date, PageHeader, Panel } from '../components/ui';

export function Profile() {
  const { profile, expiresAt } = useAuth();
  return <div className="page-stack"><PageHeader eyebrow="YOUR CUSTOMER ACCOUNT" title="Account & profile" description="Your provisioned demo identity and current session." /><div className="profile-grid"><Panel title="Customer information"><div className="profile-card"><span className="profile-avatar"><UserRound size={31} /></span><h2>{profile!.name}</h2><span className="source-label">Synthetic customer account</span><dl className="data-list"><div><dt>Customer reference</dt><dd>{profile!.customerReference}</dd></div><div><dt>Customer ID</dt><dd className="break-all">{profile!.id}</dd></div><div><dt>Application type</dt><dd>Account opening</dd></div></dl><p className="muted">Your registered mailing and residential addresses can be reviewed through the address-change service.</p></div><Link className="button secondary" to="/addresses">Review or change your address</Link></Panel><Panel title="Session & access"><div className="session-card"><span className="guide-icon"><ShieldCheck size={24} /></span><h3>Your session stays in this tab.</h3><p>Sign-in credentials and bearer tokens are kept in memory. Refreshing or closing the page ends your local session.</p><div className="session-expiry"><Clock3 size={18} /><div><small>Current session expires</small><strong>{date(expiresAt, true)} SGT</strong></div></div></div></Panel></div></div>;
}
