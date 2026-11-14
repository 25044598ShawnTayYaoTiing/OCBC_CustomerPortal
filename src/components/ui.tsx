import { AlertCircle, ArrowRight, Check, Copy, FileText, LoaderCircle } from 'lucide-react';
import type { ReactNode } from 'react';
import { useState } from 'react';
import { Link } from 'react-router-dom';

export function Brand({ inverse = false }: { inverse?: boolean }) {
  return <div className={`brand ${inverse ? 'brand-inverse' : ''}`}><span className="brand-mark"><svg viewBox="0 0 40 40" aria-hidden="true"><path d="M9 29 20 9l11 20h-7l-4-8-4 8Z" fill="currentColor" /><path d="M9 33h22" stroke="currentColor" strokeWidth="2" /></svg></span><span><strong>AFI <span>Resolve</span></strong><small>DEMO · BUSINESS DOCUMENTS</small></span></div>;
}
export const statusLabels: Record<string, string> = {
  DRAFT: 'Draft', PENDING_VALIDATION: 'Awaiting checks', CORRECTION_REQUIRED: 'Action required',
  HUMAN_REVIEW: 'Resolution Management', RESOLUTION_MANAGEMENT: 'Resolution Management', READY: 'Checks passed', OPERATIONS: 'With Operations',
};
export function Badge({ status }: { status: string }) { return <span className={`status status-${status.toLowerCase()}`}><i />{statusLabels[status] || status.replaceAll('_', ' ').toLowerCase()}</span>; }
export function date(value: string | null, time = false) {
  if (!value || !Number.isFinite(Date.parse(value))) return 'Not recorded';
  return new Intl.DateTimeFormat('en-SG', { timeZone: 'Asia/Singapore', day: '2-digit', month: 'short', year: 'numeric', ...(time ? { hour: '2-digit', minute: '2-digit' } : {}) }).format(new Date(value));
}
export const titleCase = (value: string) => value.toLowerCase().replaceAll('_', ' ').replace(/\b\w/g, c => c.toUpperCase());
export function PageHeader({ eyebrow, title, description, children }: { eyebrow?: string; title: string; description: string; children?: ReactNode }) {
  return <header className="page-heading"><div>{eyebrow && <p className="eyebrow">{eyebrow}</p>}<h1>{title}</h1><p>{description}</p></div>{children && <div className="heading-actions">{children}</div>}</header>;
}
export function Panel({ title, description, action, children, className = '' }: { title?: string; description?: string; action?: ReactNode; children: ReactNode; className?: string }) {
  return <section className={`panel ${className}`}>{title && <header className="panel-heading"><div><h2>{title}</h2>{description && <p>{description}</p>}</div>{action}</header>}{children}</section>;
}
export function Loading({ text = 'Loading your information…' }: { text?: string }) { return <div className="loading" role="status"><LoaderCircle className="spin" size={20} />{text}</div>; }
export function ErrorBox({ message, retry }: { message: string; retry?: () => void }) {
  return <div className="alert alert-error" role="alert"><AlertCircle size={19} /><div><p>{message}</p>{retry && <button className="text-button" onClick={retry}>Try again <ArrowRight size={14} /></button>}</div></div>;
}
export function Notice({ children, success = false }: { children: ReactNode; success?: boolean }) {
  return <div className={`alert ${success ? 'alert-success' : 'alert-info'}`} role="status">{success ? <Check size={19} /> : <AlertCircle size={19} />}<div>{children}</div></div>;
}
export function Empty({ title, description, action }: { title: string; description: string; action?: ReactNode }) {
  return <div className="empty"><span className="empty-icon"><FileText size={24} /></span><h3>{title}</h3><p>{description}</p>{action}</div>;
}
export function Reference({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return <button className="reference-copy" title={value} aria-label={`Copy reference ${value}`} onClick={() => {
    void navigator.clipboard?.writeText(value).then(() => { setCopied(true); window.setTimeout(() => setCopied(false), 2000); }).catch(() => {});
  }}><span>{value}</span>{copied ? <Check size={14} /> : <Copy size={14} />}{copied && <span className="sr-only" role="status">Copied</span>}</button>;
}
export function ViewLink({ to, children = 'View all' }: { to: string; children?: ReactNode }) { return <Link className="text-link" to={to}>{children}<ArrowRight size={15} /></Link>; }
