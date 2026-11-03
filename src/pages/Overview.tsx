import { ArrowRight, CheckCircle2, ClipboardPenLine, Clock3, FilePlus2, Files } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth';
import { useData } from '../data';
import { ErrorBox, Loading, Panel, ViewLink } from '../components/ui';
import { NotificationList, SubmissionTable } from '../components/Records';

export function Overview() {
  const { profile } = useAuth(); const { submissions, notifications } = useData();
  const items = submissions.data || [];
  const attention = items.filter(s => ['CORRECTION_REQUIRED', 'HUMAN_REVIEW'].includes(s.status));
  const stats = [
    { label: 'Total submissions', value: items.length, icon: Files, tone: 'navy', detail: 'Your document applications' },
    { label: 'Awaiting checks', value: items.filter(s => ['DRAFT', 'PENDING_VALIDATION'].includes(s.status)).length, icon: Clock3, tone: 'blue', detail: 'Pending recorded validation' },
    { label: 'Needs attention', value: attention.length, icon: ClipboardPenLine, tone: 'amber', detail: 'Applications to review' },
    { label: 'With Operations', value: items.filter(s => s.status === 'OPERATIONS').length, icon: CheckCircle2, tone: 'teal', detail: 'Checks passed and handed over' },
  ];
  return <div className="page-stack">
    <section className="business-welcome"><div><p className="eyebrow">YOUR CUSTOMER WORKSPACE</p><h1>Welcome back, {profile!.name.split(' ')[0]}.</h1><p>Manage your document applications and outstanding requests.</p></div><Link className="button primary" to="/submit"><FilePlus2 size={17} />Submit new documents<ArrowRight size={17} /></Link></section>
    {submissions.error && <ErrorBox message={submissions.error} retry={() => void submissions.refresh()} />}
    <div className="metrics-grid">{stats.map(s => <div className="metric" key={s.label}><div className="metric-top"><span>{s.label}</span><span className={`metric-symbol ${s.tone}`}><s.icon size={19} /></span></div><strong>{submissions.loading || submissions.error ? '\u2014' : s.value}</strong><small>{s.detail}</small></div>)}</div>
    <Panel title="Recent submissions" description="Account-opening applications and their recorded status." action={<ViewLink to="/submissions" />}>{submissions.loading ? <Loading /> : submissions.data ? <SubmissionTable items={items.slice(0, 4)} /> : null}</Panel>
    <Panel title="Latest updates" description="The latest updates recorded for your applications." action={<ViewLink to="/notifications" />}>{notifications.error ? <ErrorBox message={notifications.error} retry={() => void notifications.refresh()} /> : notifications.loading ? <Loading /> : <NotificationList items={(notifications.data || []).slice(0, 3)} compact />}</Panel>
  </div>;
}
