import { serviceLabel } from '../lib/service-requests';
import { ArrowRight, Bell, CheckCircle2, CircleAlert, FileCheck2, Inbox } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { Notification, Submission } from '../types';
import { Badge, date, Empty } from './ui';

export function shortReference(id: string) { return `${id.slice(0, 12).toUpperCase()}…`; }
export function SubmissionTable({ items }: { items: Submission[] }) {
  if (!items.length) return <Empty title="No submissions here yet" description="Your applications will appear here after the service receives your documents." />;
  return <div className="customer-request-list">{items.map(s => <Link key={s.id} className="customer-request-row" to={`/submissions/${s.id}`}><div><strong>{serviceLabel(s.requestType)}</strong><small>Submitted {date(s.createdAt)}</small></div><Badge status={s.status}/><ArrowRight size={18}/></Link>)}</div>;
}
export const notificationTitle: Record<string, string> = {
  SUBMISSION_RECEIVED: 'Documents received', VALIDATION_COMPLETED: 'Document checks completed',
  CORRECTION_REQUIRED: 'A little more information is needed', CORRECTION_RECEIVED: 'Updated documents received',
  OPERATIONS_READY: 'Your request was completed', RESOLUTION_MANAGEMENT: 'Your request is under review',
  REQUEST_CANCELLED: 'Your request was cancelled',
};
export function NotificationList({ items, compact = false }: { items: Notification[]; compact?: boolean }) {
  if (!items.length) return <Empty title="You're all caught up" description="Updates about your documents and applications will appear here." />;
  return <div className={`notification-list ${compact ? 'compact' : ''}`}>{items.map(n => {
    const Icon = n.type === 'CORRECTION_REQUIRED' ? CircleAlert : n.type === 'OPERATIONS_READY' ? CheckCircle2 : n.type === 'SUBMISSION_RECEIVED' ? Inbox : n.type === 'VALIDATION_COMPLETED' ? FileCheck2 : Bell;
    return <Link key={n.id} to={`/submissions/${n.submissionId}`} className={`notification-row ${n.type === 'CORRECTION_REQUIRED' ? 'needs-action' : ''}`}><span className="notification-icon"><Icon size={19} /></span><div><strong>{notificationTitle[n.type] || 'Application update'}</strong>{n.type === 'REQUEST_CANCELLED' && <small>{n.message}</small>}<small>{shortReference(n.submissionId)} · {date(n.createdAt, true)}</small></div><ArrowRight size={16} /></Link>;
  })}</div>;
}
