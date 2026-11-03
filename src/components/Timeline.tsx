import { Check, Circle, Clock3 } from 'lucide-react';
import type { Detail } from '../types';
import { date } from './ui';

export function Timeline({ detail }: { detail: Detail }) {
  const s = detail.submission;
  const checked = !!s.validatedAt;
  const verified = ['READY', 'OPERATIONS'].includes(s.status);
  const steps = [
    { title: 'Documents received', done: !!s.createdAt, current: false, text: date(s.createdAt, true) },
    { title: 'Document processing', done: checked, current: s.status === 'PENDING_VALIDATION', text: checked ? 'Package checks have been recorded' : 'Individual processing steps are not reported' },
    { title: 'Validation recorded', done: checked, current: false, text: checked ? date(s.validatedAt, true) : 'Awaiting a recorded result' },
    { title: detail.corrections.length ? 'Corrections or review required' : 'No outstanding customer requests', done: !detail.corrections.length && checked, current: detail.corrections.length > 0, text: detail.corrections.length ? `${detail.corrections.length} outstanding document ${detail.corrections.length === 1 ? 'request' : 'requests'}` : checked ? 'Current package status' : 'Requests appear after processing' },
    { title: 'Required checks satisfied', done: verified, current: false, text: verified ? 'Confirmed by the recorded application status' : 'Not yet confirmed' },
    { title: 'Routed to Operations', done: !!s.routedAt, current: false, text: s.routedAt ? date(s.routedAt, true) : 'Awaiting verified handover' },
  ];
  return <ol className="timeline">{steps.map(step => <li key={step.title} className={step.done ? 'done' : step.current ? 'active' : 'waiting'}><span className="timeline-marker">{step.done ? <Check size={13} /> : step.current ? <Clock3 size={13} /> : <Circle size={9} />}</span><div><strong>{step.title}</strong><small>{step.text}</small></div></li>)}</ol>;
}
