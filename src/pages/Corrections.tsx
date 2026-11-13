import { serviceLabel } from '../lib/service-requests';
import { ArrowRight, ClipboardPenLine, RefreshCw } from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';
import { useData } from '../data';
import type { Correction, Submission } from '../types';
import { Badge, Empty, ErrorBox, Loading, PageHeader, Panel } from '../components/ui';
import { shortReference } from '../components/Records';

interface Requests { submission: Submission; items: Correction[]; error?: string }
export function Corrections() {
  const { submissions } = useData(); const [requests, setRequests] = useState<Requests[]>([]);
  const [loading, setLoading] = useState(true); const [version, setVersion] = useState(0);
  const cases = (submissions.data || []).filter(s => ['CORRECTION_REQUIRED', 'HUMAN_REVIEW', 'RESOLUTION_MANAGEMENT'].includes(s.status));
  const signature = cases.map(s => `${s.id}:${s.revision}:${s.validatedAt}`).join('|');
  useEffect(() => {
    if (submissions.loading) return;
    const controller = new AbortController(); setLoading(true);
    void Promise.all(cases.map(async submission => {
      try { return { submission, items: await api<Correction[]>(`/submissions/${encodeURIComponent(submission.id)}/corrections`, { signal: controller.signal }) }; }
      catch (error) { return { submission, items: [], error: error instanceof Error ? error.message : 'Requests could not be loaded.' }; }
    })).then(result => { if (!controller.signal.aborted) { setRequests(result); setLoading(false); } });
    return () => controller.abort();
    // The signature includes all fields that change outstanding correction requests.
  }, [signature, submissions.loading, version]);
  return <div className="page-stack"><PageHeader eyebrow="YOUR NEXT STEPS" title="Corrections required" description="A clear view of what needs your attention and how to respond."><button className="button secondary" onClick={() => { void submissions.refresh(); setVersion(n => n + 1); }} disabled={loading}><RefreshCw size={16} />Refresh requests</button></PageHeader>
    {submissions.error && <ErrorBox message={submissions.error} retry={() => void submissions.refresh()} />}
    {loading ? <Panel><Loading text="Checking your document requests…" /></Panel> : !requests.length ? <Panel><Empty title="You're all up to date" description="There are no applications currently marked for correction or review." action={<Link className="button secondary" to="/submissions">Track your submissions<ArrowRight size={16} /></Link>} /></Panel> : requests.map(({ submission, items, error }) => <Panel key={submission.id} title={serviceLabel(submission.requestType)} description={shortReference(submission.caseReference)} action={<Badge status={submission.status} />}>{error ? <ErrorBox message={error} retry={() => setVersion(n => n + 1)} /> : !items.length ? <div className="form-body"><p>No customer correction request is currently recorded. Your application may require staff review.</p><Link className="text-link" to={`/submissions/${submission.id}`}>View application<ArrowRight size={15} /></Link></div> : <div className="correction-list">{items.map(item => <div className="correction-card" key={item.id}><span className="request-symbol"><ClipboardPenLine size={21} /></span><div><span className="eyebrow">DOCUMENT REQUEST</span><h3>{item.instruction}</h3><p>{item.status === 'ESCALATED' ? 'Review is required. Provide a supported corrected form or contact your demo administrator.' : 'Update the source document, then upload it to your existing application.'}</p><Link className="text-link" to={`/submissions/${submission.id}?request=${encodeURIComponent(item.id)}`}>Review and respond<ArrowRight size={15} /></Link></div></div>)}</div>}</Panel>)}
    <p className="page-note">Requests close only when the service confirms the underlying checks pass.</p>
  </div>;
}
