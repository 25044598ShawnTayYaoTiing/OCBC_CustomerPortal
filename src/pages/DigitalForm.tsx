import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ArrowLeft, ArrowRight, Check } from 'lucide-react';
import { useAuth } from '../auth';
import { useData } from '../data';
import { useIntent } from '../lib/upload-intent';
import { api } from '../lib/api';
import { serviceLabel, serviceRequests } from '../lib/service-requests';
import type { Detail, DigitalValues } from '../types';
import { ErrorBox, Loading, Notice, PageHeader, Panel } from '../components/ui';
import { LegacyDigitalForm } from './LegacyDigitalForm';

const today = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Singapore', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

export function DigitalForm() {
  const { id } = useParams();
  const [query] = useSearchParams();
  const [stage, setStage] = useState(id ? 1 : 0);
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { submissions, notifications } = useData();
  const p = profile?.bankingProfile;
  const pending = useIntent(profile!.id);

  const [values, setValues] = useState<DigitalValues>(() => ({
    requestType: ['ADDRESS_CHANGE', 'CONTACT_UPDATE', 'TAX_RESIDENCY_UPDATE'].includes(query.get('requestType') || '')
      ? query.get('requestType')!
      : 'ADDRESS_CHANGE',
    accountType: '',
    currency: '',
    mailingAddress: p?.mailingAddress || '',
    email: p?.email || '',
    mobile: p?.mobile || '',
    occupation: '',
    taxResidency: p?.taxResidency || 'Singapore',
    foreignTaxCountry: '',
    taxIdentifier: '',
    declarationDate: today(),
    taxDeclaration: false,
    authorisation: false,
  }));

  const [review, setReview] = useState(false);
  const [loading, setLoading] = useState(!!id);
  const [loaded, setLoaded] = useState(!id);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [locked, setLocked] = useState(false);
  const [retry, setRetry] = useState(false);
  const intent = useRef<{ key: string; body: string } | null>(null);

  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();
    void Promise.all([
      api<{ values: DigitalValues }>(`/submissions/${encodeURIComponent(id)}/eform`, { signal: controller.signal }),
      api<Detail>(`/submissions/${encodeURIComponent(id)}`, { signal: controller.signal }),
    ])
      .then(([form, detail]) => {
        if (!controller.signal.aborted) {
          setValues({ ...form.values, authorisation: false, expectedRevision: detail.submission.revision });
          setLocked(detail.submission.status === 'OPERATIONS');
          setLoaded(true);
        }
      })
      .catch(e => {
        if (!controller.signal.aborted) setError(e instanceof Error ? e.message : 'Unable to load this request.');
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [id]);

  const update = <K extends keyof DigitalValues>(key: K, value: DigitalValues[K]) =>
    setValues(v => ({ ...v, [key]: value }));

  const address = values.requestType === 'ADDRESS_CHANGE';
  const contact = values.requestType === 'CONTACT_UPDATE';
  const tax = values.requestType === 'TAX_RESIDENCY_UPDATE';
  const foreign = tax && values.taxResidency !== 'Singapore';

  async function submit() {
    setBusy(true);
    setError('');
    if (!intent.current) {
      intent.current = {
        key: crypto.randomUUID(),
        body: JSON.stringify({
          ...values,
          accountType: null,
          currency: null,
          occupation: null,
          mailingAddress: address ? values.mailingAddress : null,
          email: contact ? values.email : null,
          mobile: contact ? values.mobile : null,
          taxResidency: tax ? values.taxResidency : null,
          taxDeclaration: tax && values.taxDeclaration,
          foreignTaxCountry: foreign ? values.foreignTaxCountry : null,
          taxIdentifier: foreign ? values.taxIdentifier : null,
        }),
      };
    }
    try {
      const result = await api<Detail>(id ? `/submissions/${encodeURIComponent(id)}/eform` : '/eforms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Idempotency-Key': intent.current.key },
        body: intent.current.body,
        timeout: 600000,
      });
      intent.current = null;
      void submissions.refresh();
      void notifications.refresh();
      navigate(`/submissions/${result.submission.id}`);
    } catch (e) {
      const uncertain = !(e && typeof e === 'object' && 'status' in e && typeof e.status === 'number' && e.status >= 400 && e.status < 500);
      if (!uncertain) intent.current = null;
      setRetry(uncertain);
      setError(e instanceof Error ? e.message : 'Unable to confirm this request.');
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <Loading text="Loading your service request..." />;
  if (!loaded || !p) return <ErrorBox message={error || 'Your existing synthetic profile is unavailable.'} />;
  if (id && values.requestType === 'ACCOUNT_OPENING') {
    return (
      <>
        <Notice>This is a historical account-opening case. New requests use the existing-customer service workflow.</Notice>
        <LegacyDigitalForm />
      </>
    );
  }
  if (pending) {
    return (
      <Notice>
        Confirm your pending PDF upload first. <Link className="text-link" to={pending.returnTo}>Resume upload</Link>
      </Notice>
    );
  }

  return (
    <div className="page-stack">
      <div>
        <Link className="text-link" to={id ? `/submissions/${id}` : '/submit'}>
          <ArrowLeft size={15} /> Back
        </Link>
      </div>
      <PageHeader
        eyebrow="Guided Digital Request"
        title={id ? 'Correct your service request' : 'Submit a banking service request'}
        description="Prefilled from your synthetic customer profile. Only fields relevant to your selected service are requested."
      />

      <ol className="form-progress" aria-label="Request progress">
        <li aria-current={stage === 0 ? 'step' : undefined}>
          <span>{stage > 0 || review ? <Check size={14} /> : '01'}</span>
          <strong>Choose service</strong>
        </li>
        <li aria-current={!review && stage === 1 ? 'step' : undefined}>
          <span>{review ? <Check size={14} /> : '02'}</span>
          <strong>Your changes</strong>
        </li>
        <li aria-current={review ? 'step' : undefined}>
          <span>03</span>
          <strong>Review &amp; send</strong>
        </li>
      </ol>

      <form
        className="eform-layout"
        onSubmit={e => {
          e.preventDefault();
          if (stage === 0 && !retry) { setStage(1); return; }
          if (!review && !retry) { setReview(true); return; }
          void submit();
        }}
      >
        <div className="page-stack" style={{ gap: 20 }}>
          <div hidden={stage !== 0 || review}>
            <Panel title="Select banking service" description="Your existing profile details are already on hand.">
              <div className="eform-fields">
                <label className="full-width">
                  Request type
                  <select
                    aria-label="Request type"
                    value={values.requestType}
                    disabled={!!id}
                    onChange={e => update('requestType', e.target.value)}
                  >
                    {serviceRequests.map(r => (
                      <option key={r.value} value={r.value}>{r.label}</option>
                    ))}
                  </select>
                </label>
              </div>
            </Panel>
          </div>

          <fieldset hidden={review || stage === 0} disabled={busy || locked || retry || review || stage === 0} className="eform-fieldset">
            {address && (
              <Panel title="New mailing address" description="Your existing account and identity stay the same.">
                <div className="eform-fields">
                  <label className="full-width">
                    Requested mailing address
                    <input
                      required
                      maxLength={500}
                      autoComplete="street-address"
                      value={values.mailingAddress}
                      onChange={e => update('mailingAddress', e.target.value)}
                    />
                  </label>
                </div>
              </Panel>
            )}

            {contact && (
              <Panel title="Contact-detail update" description="Change your email, phone number, or both. No tax or address declaration is required.">
                <div className="eform-fields">
                  <label>
                    New email
                    <input type="email" maxLength={254} value={values.email} onChange={e => update('email', e.target.value)} />
                  </label>
                  <label>
                    New phone number
                    <input type="tel" maxLength={40} value={values.mobile} onChange={e => update('mobile', e.target.value)} />
                  </label>
                </div>
                <div className="form-body" style={{ paddingTop: 0 }}>
                  <Notice>
                    After submission, verify an email OTP. A changed email is verified at the new address; a phone-only change uses your registered email to authorise the request. New phone ownership still requires independent Resolution Management verification.
                  </Notice>
                </div>
              </Panel>
            )}

            {tax && (
              <Panel title="Tax-residency declaration" description="Declare your synthetic tax jurisdictions.">
                <div className="eform-fields">
                  <label className={foreign ? '' : 'full-width'}>
                    Tax residency
                    <select
                      aria-label="Tax residency"
                      value={values.taxResidency}
                      onChange={e => update('taxResidency', e.target.value)}
                    >
                      <option value="Singapore">Singapore only</option>
                      <option value="Foreign">Outside Singapore / multiple jurisdictions</option>
                    </select>
                  </label>
                  {foreign && (
                    <>
                      <label>
                        Foreign tax country / jurisdictions
                        <input
                          required
                          maxLength={500}
                          value={values.foreignTaxCountry}
                          onChange={e => update('foreignTaxCountry', e.target.value)}
                        />
                      </label>
                      <label className="full-width">
                        TIN / tax identifiers
                        <input
                          required
                          maxLength={500}
                          value={values.taxIdentifier}
                          onChange={e => update('taxIdentifier', e.target.value)}
                        />
                      </label>
                    </>
                  )}
                  <label className="checkbox-label full-width">
                    <input
                      type="checkbox"
                      required
                      checked={values.taxDeclaration}
                      onChange={e => update('taxDeclaration', e.target.checked)}
                    />
                    <span>I declare that my synthetic tax jurisdictions and TIN details are complete and accurate.</span>
                  </label>
                </div>
              </Panel>
            )}

            <Panel title="Customer declaration and authorisation">
              <div className="eform-fields">
                <label>
                  Declaration date
                  <input
                    type="date"
                    required
                    max={today()}
                    value={values.declarationDate}
                    onChange={e => update('declarationDate', e.target.value)}
                  />
                </label>
                <label className="checkbox-label full-width">
                  <input
                    type="checkbox"
                    required
                    checked={values.authorisation}
                    onChange={e => update('authorisation', e.target.checked)}
                  />
                  <span>
                    I authorise this {serviceLabel(values.requestType).toLowerCase()} using synthetic demonstration information and the evidence provided. This records an authenticated declaration, not a handwritten signature.
                  </span>
                </label>
              </div>
            </Panel>
          </fieldset>

          {review && (
            <Panel title="Review your service request" description="Check the details below before sending.">
              <dl className="review-summary">
                <div><dt>Service</dt><dd>{serviceLabel(values.requestType)}</dd></div>
                <div><dt>Customer reference</dt><dd className="mono">{profile!.customerReference}</dd></div>
                {address && <div><dt>New mailing address</dt><dd>{values.mailingAddress}</dd></div>}
                {contact && (
                  <>
                    <div><dt>Email</dt><dd>{values.email || 'Unchanged'}</dd></div>
                    <div><dt>Phone</dt><dd>{values.mobile || 'Unchanged'}</dd></div>
                  </>
                )}
                {tax && (
                  <>
                    <div><dt>Tax residency</dt><dd>{values.taxResidency}</dd></div>
                    {foreign && (
                      <>
                        <div><dt>Jurisdictions</dt><dd>{values.foreignTaxCountry}</dd></div>
                        <div><dt>Tax identifiers</dt><dd>{values.taxIdentifier}</dd></div>
                      </>
                    )}
                  </>
                )}
                <div><dt>Declaration date</dt><dd>{values.declarationDate}</dd></div>
                <div><dt>Authorisation</dt><dd>{values.authorisation ? 'Confirmed' : 'Not confirmed'}</dd></div>
              </dl>
              <div className="form-actions">
                <button type="button" className="button secondary" disabled={busy || retry} onClick={() => setReview(false)}>
                  Edit details
                </button>
              </div>
            </Panel>
          )}

          {error && <ErrorBox message={error} />}
          {retry && (
            <Notice>
              The outcome is unconfirmed. Retry the same request in this tab or check My submissions before creating another request.
            </Notice>
          )}

          <div className="panel" style={{ overflow: 'visible' }}>
            <div className="form-actions" style={{ borderTop: 0, borderRadius: 'var(--radius-lg)' }}>
              <div className="step-back-actions">
                {stage === 1 && !review && (
                  <button type="button" className="button secondary" disabled={busy || retry || !!id} onClick={() => setStage(0)}>
                    Change service
                  </button>
                )}
                <Link className="text-link" to="/submissions">My submissions</Link>
              </div>
              <button className="button primary" disabled={busy || locked || (!retry && stage !== 0 && !values.authorisation)}>
                {busy
                  ? 'Checking request...'
                  : retry
                    ? 'Retry original request'
                    : stage === 0
                      ? 'Continue to your changes'
                      : !review
                        ? 'Review request'
                        : id
                          ? 'Submit correction'
                          : 'Submit service request'}
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>

        <aside className="submission-aside">
          <div className="aside-card">
            <h3 style={{ fontSize: 15 }}>Existing customer profile</h3>
            <dl className="data-list">
              <div><dt>Customer</dt><dd>{profile!.name}</dd></div>
              <div><dt>Customer reference</dt><dd className="mono">{profile!.customerReference}</dd></div>
              <div><dt>Synthetic identity</dt><dd className="mono">{p.identityNumber}</dd></div>
              <div><dt>Current mailing address</dt><dd>{p.mailingAddress}</dd></div>
              <div><dt>Registered contact</dt><dd>{p.email}<br />{p.mobile}</dd></div>
            </dl>
          </div>
          <div className="aside-card">
            <h3 style={{ fontSize: 14 }}>{serviceLabel(values.requestType)}</h3>
            {address ? (
              <Notice>A supporting PDF must contain your customer reference and corroborate the requested new mailing address.</Notice>
            ) : foreign ? (
              <Notice>A supporting PDF must corroborate the declared foreign tax jurisdiction and TIN and identify your customer reference.</Notice>
            ) : contact ? (
              <p className="muted">Contact updates follow deterministic verification checks. An unavailable OTP channel keeps the request unverified.</p>
            ) : (
              <p className="muted">No extra supporting PDF is required for a Singapore-only declaration.</p>
            )}
            <p className="muted">Resolution Management approves the validated request for Operations.</p>
          </div>
        </aside>
      </form>
    </div>
  );
}
