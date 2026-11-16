import { useState } from 'react';
import { ArrowLeft, ArrowRight, MapPin, RefreshCw } from 'lucide-react';
import { api } from '../lib/api';
import { useResource } from '../data';
import { date, Empty, ErrorBox, Loading, Notice, PageHeader, Panel, titleCase } from '../components/ui';
import type { AddressBook, AddressRequest, Candidate, SearchResult } from '../address-types';

export function AddressChange() {
  const registered = useResource<AddressBook>('/addresses');
  const [kind, setKind] = useState('MAILING');
  const [postal, setPostal] = useState('');
  const [search, setSearch] = useState<SearchResult | null>(null);
  const [selected, setSelected] = useState<Candidate | null>(null);
  const [unit, setUnit] = useState('');
  const [manual, setManual] = useState(false);
  const [manualAddress, setManualAddress] = useState('');
  const [step, setStep] = useState('edit');
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [requestKey, setRequestKey] = useState(() => crypto.randomUUID());
  const old = registered.data?.addresses.find(item => item.addressType === kind);
  function changed() { setStep('edit'); setNotice(''); setError(''); setRequestKey(crypto.randomUUID()); }
  const proposed = manual ? manualAddress.trim() : selected?.address || '';

  async function lookup() {
    if (!/^\d{6}$/.test(postal)) { setError('Enter a six-digit Singapore postal code.'); return; }
    setBusy('search'); setError(''); setSelected(null); setSearch(null); setManual(false); changed();
    try { setSearch(await api<SearchResult>(`/addresses/search?postalCode=${encodeURIComponent(postal)}`, { timeout: 90000 })); }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'Address lookup could not be completed.'); setSearch({ status: 'UNAVAILABLE', message: 'The address lookup could not be completed. Retry, or request manual review.', postalCode: postal, candidates: [], complete: false, checkedAt: new Date().toISOString() }); }
    finally { setBusy(''); }
  }

  async function submit() {
    setBusy('submit'); setError('');
    try {
      const result = await api<AddressRequest>('/address-changes', { method: 'POST', headers: { 'Content-Type': 'application/json' }, timeout: 90000, body: JSON.stringify({ addressType: kind, postalCode: postal, candidateId: manual ? null : selected?.id, address: proposed, unit: unit.trim(), manualReview: manual, requestKey }) });
      setNotice(result.status === 'PENDING_APPROVAL' ? 'The new building address was revalidated by the backend. Your change is awaiting reviewer approval; the registered address has not changed.' : 'Your request was sent for manual review. The address is not marked invalid or verified, and the registered address has not changed.');
      setStep('submitted'); void registered.refresh();
    } catch (failure) { setError(failure instanceof Error ? failure.message : 'Your request could not be confirmed. Retry the same request safely.'); }
    finally { setBusy(''); }
  }

  return <div className="page-stack"><PageHeader eyebrow="EXISTING CUSTOMER SERVICES" title="Change your address" description="Check your proposed new address before requesting a change. Your registered address stays unchanged until approval." />
    {registered.error && <ErrorBox message={registered.error} retry={() => void registered.refresh()} />}
    {error && <ErrorBox message={error} />}{notice && <Notice success={step === 'submitted'}>{notice}</Notice>}
    <Panel title="1. Registered address" description="Loaded from your customer record. This is not the address being validated.">
      <div className="form-body"><label>Address to change<select value={kind} disabled={!!busy} onChange={event => { setKind(event.target.value); changed(); }}><option value="MAILING">Mailing address</option><option value="RESIDENTIAL">Residential address</option></select></label>
        {registered.loading ? <Loading /> : old ? <div className="address-record"><strong>{old.address.address}</strong>{old.address.unit && <p>Unit: {old.address.unit}</p>}<small>Registered record · Updated {date(old.updatedAt, true)} SGT</small></div> : <p className="context-note">No registered {kind.toLowerCase()} address is recorded. We will not infer one from your uploaded documents.</p>}
      </div>
    </Panel>
    {step !== 'submitted' && <Panel title={step === 'review' ? '3. Review your request' : '2. Find your new address'} description="OneMap checks the building address. Enter your unit number separately; it does not verify unit numbers or occupancy.">
      {step === 'review' ? <div className="form-body"><dl className="data-list"><div><dt>Address type</dt><dd>{titleCase(kind)}</dd></div><div><dt>Registered address</dt><dd>{old?.address.address || 'Not recorded'}{old?.address.unit ? `, unit ${old.address.unit}` : ''}</dd></div><div><dt>Requested new address</dt><dd>{proposed}</dd></div><div><dt>Unit number</dt><dd>{unit || 'Not provided'}</dd></div><div><dt>Verification</dt><dd>{manual ? 'Manual review requested; not verified' : 'Live OneMap selection; backend will revalidate on submission'}</dd></div></dl><Notice>Address verification does not waive applicable supporting-document or approval requirements.</Notice><div className="form-actions"><button className="button secondary" disabled={!!busy} onClick={() => setStep('edit')}><ArrowLeft size={16} />Edit request</button><button className="button primary" disabled={!!busy} onClick={() => void submit()}>{busy ? 'Checking and submitting...' : manual ? 'Submit for manual review' : 'Submit address change'}<ArrowRight size={16} /></button></div></div> : <form className="form-body" onSubmit={event => { event.preventDefault(); void lookup(); }}>
        <div className="address-postal-search"><label>New postal code<input value={postal} inputMode="numeric" autoComplete="postal-code" maxLength={6} placeholder="e.g. 200640" disabled={!!busy} onChange={event => { setPostal(event.target.value.replace(/\D/g, '')); setSearch(null); setSelected(null); setManual(false); changed(); }} /></label><button className="button secondary" disabled={!!busy || !/^\d{6}$/.test(postal)}><MapPin size={16} />{busy === 'search' ? 'Searching OneMap...' : 'Search OneMap'}</button></div>
        {search && <div className="address-search-result" role="status"><strong>{search.status === 'LIVE_RESULTS' ? 'Live OneMap results' : 'Address not yet confirmed'}</strong><p>{search.message}</p><small>Checked {date(search.checkedAt, true)} SGT</small></div>}
        {!!search?.candidates.length && <fieldset className="address-candidates"><legend>Select your new building address</legend>{search.candidates.map(candidate => <label key={candidate.id} className={`address-candidate ${selected?.id === candidate.id && !manual ? 'selected' : ''}`}><input type="radio" name="new-address" checked={!manual && selected?.id === candidate.id} disabled={!!busy} onChange={() => { setSelected(candidate); setManual(false); changed(); }} /><span><strong>{candidate.address}</strong><small>{candidate.building || 'Building address'} · Singapore {candidate.postalCode} · Live OneMap</small></span></label>)}</fieldset>}
        {search && <label className="checkbox-label"><input type="checkbox" checked={manual} disabled={!!busy} onChange={event => { setManual(event.target.checked); changed(); }} /><span>My address could not be confirmed. Request manual review.</span></label>}
        {manual && <label>Proposed new address for review<textarea value={manualAddress} maxLength={1000} disabled={!!busy} onChange={event => { setManualAddress(event.target.value); changed(); }} placeholder="Enter the new block, street and postal code" /><small>This is unverified customer input. A clear conflict with live OneMap records must still be corrected.</small></label>}
        <label>Unit number (if applicable)<input value={unit} maxLength={30} placeholder="e.g. #12-34" disabled={!!busy} onChange={event => { setUnit(event.target.value); changed(); }} autoComplete="address-line2" /><small>Kept separate from the building address. OneMap does not confirm this value.</small></label>
        <div className="form-actions"><button className="button primary" type="button" disabled={!!busy || !registered.data || !/^\d{6}$/.test(postal) || !proposed} onClick={() => setStep('review')}>Continue to review<ArrowRight size={16} /></button></div>
      </form>}
    </Panel>}
    {step === 'submitted' && <button className="button secondary" onClick={() => { setPostal(''); setSearch(null); setSelected(null); setManual(false); setManualAddress(''); setUnit(''); changed(); }}>Start another address request</button>}
    <Panel title="Address-change requests" description="Verification and approval are separate steps." action={<button className="text-button" onClick={() => void registered.refresh()}><RefreshCw size={15} />Refresh</button>}>
      {!registered.data?.requests.length ? <Empty title="No address changes requested" description="Your requests and their review status will appear here." /> : <div className="address-request-list">{registered.data.requests.map(request => <article key={request.id}><div className="task-heading"><strong>{titleCase(request.addressType)} address</strong><span className="source-label">{titleCase(request.status)}</span></div><p>{request.proposedAddress.address}{request.proposedAddress.unit ? `, unit ${request.proposedAddress.unit}` : ''}</p><p><strong>{titleCase(request.verification.status)}:</strong> {request.verification.message}</p>{request.reviewNote && <p>Reviewer: {request.reviewNote}</p>}<small>{date(request.createdAt, true)} SGT · {request.verification.source === 'ONEMAP_LIVE' ? 'Live OneMap lookup' : 'No live confirmation'}</small></article>)}</div>}
    </Panel>
  </div>;
}
