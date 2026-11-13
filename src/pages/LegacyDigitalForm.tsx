import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, ClipboardPenLine, ShieldCheck } from 'lucide-react';
import { useAuth } from '../auth';
import { useData } from '../data';
import { useIntent } from '../lib/upload-intent';
import { api } from '../lib/api';
import type { Detail, DigitalValues } from '../types';
import { ErrorBox, Loading, Notice, PageHeader, Panel } from '../components/ui';

export function LegacyDigitalForm() {
  const { id } = useParams(); const { profile } = useAuth(); const navigate = useNavigate();
  const { submissions, notifications } = useData(); const p = profile?.bankingProfile; const pendingUpload = useIntent(profile!.id);
  const [values, setValues] = useState<DigitalValues>(() => ({ requestType: 'ACCOUNT_OPENING', accountType: p?.accountType || 'SAVINGS', currency: p?.currency || 'SGD', mailingAddress: p?.mailingAddress || '', email: p?.email || '', mobile: p?.mobile || '', occupation: p?.occupation || '', taxResidency: p?.taxResidency || 'Singapore', foreignTaxCountry: '', taxIdentifier: '', declarationDate: new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Singapore', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date()), taxDeclaration: false, authorisation: false }));
  const [loading, setLoading] = useState(!!id); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const [locked, setLocked] = useState(false); const [retrying, setRetrying] = useState(false);
  const intent = useRef<{ key: string; body: string } | null>(null);
  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();
    void Promise.all([api<{ values: DigitalValues }>(`/submissions/${encodeURIComponent(id)}/eform`, { signal: controller.signal }), api<Detail>(`/submissions/${encodeURIComponent(id)}`, { signal: controller.signal })])
      .then(([form, detail]) => { if (!controller.signal.aborted) { setValues({ ...form.values, authorisation: false, expectedRevision: detail.submission.revision }); setLocked(detail.submission.status === 'OPERATIONS'); } })
      .catch(e => { if (!controller.signal.aborted) setError(e instanceof Error ? e.message : 'Unable to load your declaration.'); })
      .finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [id]);
  const update = <K extends keyof DigitalValues>(key: K, value: DigitalValues[K]) => setValues(v => ({ ...v, [key]: value }));
  const foreign = values.taxResidency !== 'Singapore';
  const changedAddress = values.mailingAddress.trim().toLowerCase().replace(/\s+/g, ' ') !== p?.mailingAddress.trim().toLowerCase().replace(/\s+/g, ' ');
  async function submit() {
    setBusy(true); setError('');
    if (!intent.current) intent.current = { key: crypto.randomUUID(), body: JSON.stringify({ ...values, foreignTaxCountry: foreign ? values.foreignTaxCountry : '', taxIdentifier: foreign ? values.taxIdentifier : '' }) };
    try {
      const result = await api<Detail>(id ? `/submissions/${encodeURIComponent(id)}/eform` : '/eforms', { method: 'POST', headers: { 'Content-Type': 'application/json', 'Idempotency-Key': intent.current.key }, body: intent.current.body, timeout: 600000 });
      intent.current = null; void submissions.refresh(); void notifications.refresh(); navigate(`/submissions/${result.submission.id}`);
    } catch (e) {
      // Freeze the original request after an uncertain response; an exact retry cannot create a duplicate.
      const uncertain = !(e && typeof e === 'object' && 'status' in e && typeof e.status === 'number' && e.status >= 400 && e.status < 500);
      if (!uncertain) intent.current = null;
      setRetrying(uncertain); setError(e instanceof Error ? e.message : 'Unable to confirm this application.');
    } finally { setBusy(false); }
  }
  if (pendingUpload) return <Notice>Confirm your earlier PDF upload before submitting a digital declaration. <Link className="text-link" to={pendingUpload.returnTo}>Resume upload</Link></Notice>;
  if (loading) return <Panel><Loading text="Loading your digital declaration…" /></Panel>;
  if (!p || (id && !values.expectedRevision && error)) return <ErrorBox message={error || 'Your synthetic customer profile is unavailable. Contact Resolution Management.'} />;
  return <div className="page-stack"><Link className="back-link" to={id ? `/submissions/${id}` : '/submit'}><ArrowLeft size={16} />{id ? 'Back to application' : 'Choose submission method'}</Link>
    <PageHeader eyebrow="DIGITAL APPLICATION" title={id ? 'Correct your declaration' : 'Open an account'} description="Your existing synthetic customer details are prefilled. Complete one declaration for the shared validation workflow." />
    <form className="eform-layout" onSubmit={e => { e.preventDefault(); void submit(); }}>
      <div className="page-stack">
        <Panel title="1. Your customer profile" description="Fictional core-banking records · No Singpass connection"><dl className="data-list eform-profile"><div><dt>Customer</dt><dd>{profile!.name}</dd></div><div><dt>Customer reference</dt><dd>{profile!.customerReference}</dd></div><div><dt>Synthetic identity</dt><dd>{p.identityNumber}</dd></div><div><dt>Residential address</dt><dd>{p.residentialAddress}</dd></div><div><dt>Nationality</dt><dd>{p.nationality}</dd></div></dl></Panel>
        <fieldset disabled={busy || locked || retrying} className="eform-fieldset">
          <Panel title="2. Account request"><div className="eform-fields"><label>Account type<select value={values.accountType} onChange={e => update('accountType', e.target.value)}><option value="SAVINGS">Savings account</option><option value="CURRENT">Current account</option></select></label><label>Currency<select value={values.currency} onChange={e => update('currency', e.target.value)}><option>SGD</option><option>USD</option></select></label></div></Panel>
          <Panel title="3. Contact details" description="Update only the details that need changing."><div className="eform-fields"><label className="full-width">Mailing address<input required maxLength={500} value={values.mailingAddress} onChange={e => update('mailingAddress', e.target.value)} autoComplete="street-address" /></label><label>Email<input type="email" required maxLength={254} value={values.email} onChange={e => update('email', e.target.value)} autoComplete="email" /></label><label>Mobile number<input type="tel" required maxLength={40} value={values.mobile} onChange={e => update('mobile', e.target.value)} autoComplete="tel" /></label><label className="full-width">Occupation<input required maxLength={160} value={values.occupation} onChange={e => update('occupation', e.target.value)} /></label></div></Panel>
          <Panel title="4. Tax declaration"><div className="eform-fields"><label>Tax residency<select value={values.taxResidency} onChange={e => update('taxResidency', e.target.value)}><option value="Singapore">Singapore only</option><option value="Foreign">Outside Singapore / multiple jurisdictions</option></select></label><label>Declaration date<input type="date" required value={values.declarationDate} max={new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Singapore', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date())} onChange={e => update('declarationDate', e.target.value)} /></label>{foreign && <><label>Other tax country / jurisdictions<input required maxLength={160} value={values.foreignTaxCountry} onChange={e => update('foreignTaxCountry', e.target.value)} /></label><label>Tax identifier(s)<input required maxLength={160} value={values.taxIdentifier} onChange={e => update('taxIdentifier', e.target.value)} /></label></>}<label className="checkbox-label full-width"><input type="checkbox" required checked={values.taxDeclaration} onChange={e => update('taxDeclaration', e.target.checked)} /><span>I confirm my declared tax residency and identifiers are complete and supported by the synthetic evidence I provide.</span></label></div></Panel>
          <Panel title="5. Customer authorisation"><div className="form-body"><label className="checkbox-label"><input type="checkbox" required checked={values.authorisation} onChange={e => update('authorisation', e.target.checked)} /><span>I confirm these are synthetic demonstration details. I authorise AFI Resolve to validate this declaration against my synthetic profile and authorised documents. I understand that this authenticated confirmation is recorded and no handwritten signature is created.</span></label></div></Panel>
        </fieldset>
        {error && <ErrorBox message={error} />}{retrying && <Notice>The outcome is unconfirmed. Retry the original declaration in this tab, or check My submissions before starting another application. Form contents are not saved in browser storage.</Notice>}
        {locked ? <Notice>This application has been handed to Operations and is closed to changes.</Notice> : <div className="form-actions"><Link className="button secondary" to="/submissions">My submissions</Link><button className="button primary" disabled={busy || (!retrying && !values.authorisation)}>{busy ? 'Validating declaration…' : retrying ? 'Retry original declaration' : id ? 'Submit correction' : 'Submit application'}<ArrowRight size={16} /></button></div>}
      </div>
      <aside className="submission-aside"><ClipboardPenLine size={28} /><h2>One declaration.<br />Shared checks.</h2><p>Your declaration becomes versioned case evidence. Supporting PDFs are processed by the existing extraction and validation service.</p>{changedAddress || foreign ? <Notice><strong>Supporting PDF required</strong><p>{changedAddress ? 'Your mailing address differs from the profile. ' : ''}{foreign ? 'Foreign tax residency needs supporting evidence. ' : ''}After submitting, open the document request to upload a synthetic supporting PDF with your customer reference{changedAddress ? ' and the declared new mailing address' : ''}.</p></Notice> : <Notice>No extra supporting PDF is required for unchanged address details and Singapore-only tax residency.</Notice>}<p><ShieldCheck size={17} /> Resolution Management must approve current, validated evidence before Operations handover.</p></aside>
    </form></div>;
}
