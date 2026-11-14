import { serviceLabel } from '../lib/service-requests';
import { ArrowRight, Bell, CheckCircle2, CircleAlert, FileCheck2, Inbox } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Notification, Submission } from '../types';
import { Badge, date, Empty } from './ui';

export function shortReference(id: string) { return `${id.slice(0, 12).toUpperCase()}…`; }
export function SubmissionTable({ items }: { items: Submission[] }) {
  if (!items.length) return <Empty title="No submissions here yet" description="Your applications will appear here after the service receives your documents." />;
  return <div className="table-scroll"><table><thead><tr><th>Application</th><th>Submitted</th><th>Source</th><th>Status</th><th><span className="sr-only">Details</span></th></tr></thead><tbody>{items.map(s => <tr key={s.id}><td><Link className="table-primary" title={s.caseReference} to={`/submissions/${s.id}`}>{shortReference(s.caseReference)}</Link><small className="secondary-text">{serviceLabel(s.requestType)}</small></td><td>{date(s.createdAt)}<small className="secondary-text">{date(s.createdAt, true).split(', ').slice(-1)[0]}</small></td><td><span className="source-label">{s.captureMethod === 'DIGITAL_EFORM' ? 'Digital eForm' : 'PDF upload'}</span></td><td><Badge status={s.status} /></td><td><Link className="row-link" aria-label={`View submission ${s.caseReference}`} to={`/submissions/${s.id}`}><ArrowRight size={18} /></Link></td></tr>)}</tbody></table></div>;
}
export const notificationTitle: Record<string, string> = {
  SUBMISSION_RECEIVED: 'Documents received', VALIDATION_COMPLETED: 'Document checks completed',
  CORRECTION_REQUIRED: 'A little more information is needed', CORRECTION_RECEIVED: 'Updated documents received',
  OPERATIONS_READY: 'Your application is with Operations', RESOLUTION_MANAGEMENT: 'With Resolution Management',
};
export function NotificationList({ items, compact = false }: { items: Notification[]; compact?: boolean }) {
  if (!items.length) return <Empty title="You're all caught up" description="Updates about your documents and applications will appear here." />;
  return <div className={`notification-list ${compact ? 'compact' : ''}`}>{items.map(n => {
    const Icon = n.type === 'CORRECTION_REQUIRED' ? CircleAlert : n.type === 'OPERATIONS_READY' ? CheckCircle2 : n.type === 'SUBMISSION_RECEIVED' ? Inbox : n.type === 'VALIDATION_COMPLETED' ? FileCheck2 : Bell;
    return <Link key={n.id} to={`/submissions/${n.submissionId}`} className={`notification-row ${n.type === 'CORRECTION_REQUIRED' ? 'needs-action' : ''}`}><span className="notification-icon"><Icon size={19} /></span><div><strong>{notificationTitle[n.type] || 'Application update'}</strong>{!compact && <p>{n.message}</p>}<small>{shortReference(n.submissionId)} · {date(n.createdAt, true)}</small>{!compact && <span className="delivery-label">{n.emailDeliveryStatus ? `Email: ${n.emailDeliveryStatus === 'SENT' ? 'accepted by SMTP server' : n.emailDeliveryStatus.toLowerCase().replaceAll('_', ' ')} · Recorded in portal inbox` : n.channel === 'PORTAL' ? 'Recorded in your portal inbox' : n.deliveryStatus === 'SIMULATED' ? 'Simulated email · Recorded in your inbox' : 'Recorded notification'}</span>}</div><ArrowRight size={16} /></Link>;
  })}</div>;
}
