import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth';
import { useData } from '../data';
import { ErrorBox, Loading, Panel, ViewLink } from '../components/ui';
import { SubmissionTable } from '../components/Records';
import { serviceLabel } from '../lib/service-requests';

export function Overview() {
  const { profile } = useAuth();
  const { submissions } = useData();
  const items = submissions.data || [];
  const attention = items.filter(s => s.status === 'CORRECTION_REQUIRED');
  const recent = items.filter(s => s.status !== 'CORRECTION_REQUIRED').slice(0, 5);
  return <div className="page-stack customer-home">
    <header className="home-welcome"><div><h1>Hello, {profile!.name.split(' ')[0]}.</h1><p>Request a banking service, send supporting documents, and track your progress.</p></div><Link className="button primary" to="/submit">New request<ArrowRight size={18}/></Link></header>
    {submissions.error && <ErrorBox message={submissions.error} retry={() => void submissions.refresh()}/>}
    {submissions.loading ? <Loading/> : attention.length > 0 && <section className={`attention-strip ${attention.length ? 'needs-action' : ''}`} aria-label="Your next action">
      {attention.length ? <><h2>{attention.length === 1 ? 'One request needs your attention' : `${attention.length} requests need your attention`}</h2><p>Open a request to see exactly what to update.</p><div className="action-links">{attention.map(s => <Link key={s.id} to={`/submissions/${s.id}`}><span>{serviceLabel(s.requestType)}</span><span>View action <ArrowRight size={16}/></span></Link>)}</div></> : null}
    </section>}
    <Panel title="Recent requests" action={<ViewLink to="/submissions">View all requests</ViewLink>}>{submissions.loading ? <Loading/> : submissions.data && <SubmissionTable items={recent}/>}</Panel>
  </div>;
}
