import { ArrowRight, CheckCircle2 } from 'lucide-react';
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
  return <div className="page-stack customer-home">
    <header className="home-welcome"><div><h1>Hello, {profile!.name.split(' ')[0]}.</h1><p>Manage your banking requests and see what needs your attention.</p></div><Link className="button primary" to="/submit">New request<ArrowRight size={18}/></Link></header>
    {submissions.error && <ErrorBox message={submissions.error} retry={() => void submissions.refresh()}/>}
    {submissions.loading ? <Loading/> : submissions.data && <section className={`attention-strip ${attention.length ? 'needs-action' : ''}`} aria-label="Your next action">
      {attention.length ? <><h2>{attention.length === 1 ? 'One request needs your attention' : `${attention.length} requests need your attention`}</h2><p>Open a request to see exactly what to update.</p><div className="action-links">{attention.map(s => <Link key={s.id} to={`/submissions/${s.id}`}><span>{serviceLabel(s.requestType)}</span><span>View action <ArrowRight size={16}/></span></Link>)}</div></> : <><CheckCircle2 size={22}/><div><h2>No action needed from you</h2><p>We will let you know here if we need more information.</p></div></>}
    </section>}
    <Panel title="Recent requests" action={<ViewLink to="/submissions">View all requests</ViewLink>}>{submissions.loading ? <Loading/> : submissions.data && <SubmissionTable items={items.slice(0,5)}/>}</Panel>
    <div className="home-help"><p>Updating your details?</p><Link to="/submit/digital?requestType=ADDRESS_CHANGE">Change address</Link><Link to="/submit/digital?requestType=CONTACT_UPDATE">Update contact details</Link><Link to="/submit/digital?requestType=TAX_RESIDENCY_UPDATE">Update tax residency</Link></div>
  </div>;
}
