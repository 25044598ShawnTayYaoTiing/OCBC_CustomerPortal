import { serviceLabel, serviceRequests } from '../lib/service-requests';
import { ArrowLeft, ArrowRight, Check, CheckCircle2, FileCheck2, FileText, LockKeyhole } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../auth';
import { FilePicker, size, UploadFeedback, useUpload } from '../components/Upload';
import { Badge, date, Notice, PageHeader, Panel, Reference } from '../components/ui';
import { useIntent } from '../lib/upload-intent';
import type { Detail } from '../types';

const steps = ['Application', 'Documents', 'Review & submit', 'Confirmation'];

export function Submit() {
  const { profile } = useAuth();
  const pending = useIntent(profile!.id);
  const [method, setMethod] = useState(() => pending?.path.split('?')[0] === '/submissions');

  if (pending && pending.path.split('?')[0] !== '/submissions') {
    return (
      <Notice>
        Confirm your earlier upload before starting another application.{' '}
        <Link className="text-link" to={pending.returnTo}>Resume upload</Link>
      </Notice>
    );
  }

  if (method) {
    return (
      <div className="page-stack">
        <div>
          <button className="text-button" onClick={() => setMethod(false)}>
            <ArrowLeft size={15} />
            Choose another submission method
          </button>
        </div>
        <PdfSubmit />
      </div>
    );
  }

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="New Service Request"
        title="Choose how you want to submit"
        description="Both routes run the same automated evidence checks and Resolution Management review."
      />
      <div className="method-grid">
        <article className="method-card recommended">
          <span className="method-tag">Recommended · Instant Prefill</span>
          <div className="service-card-icon"><FileCheck2 size={22} /></div>
          <h2>Guided Digital eForm</h2>
          <p>
            Start with your existing synthetic customer profile. Only fields relevant to your selected service appear, with real-time validation.
          </p>
          <Link className="button primary" to="/submit/digital">
            Complete digital eForm
            <ArrowRight size={16} />
          </Link>
        </article>

        <article className="method-card">
          <span className="method-tag" style={{ background: 'var(--bg-subtle)', color: 'var(--text-secondary)' }}>
            Document Package
          </span>
          <div className="service-card-icon" style={{ background: 'var(--bg-subtle)', color: 'var(--text-primary)' }}>
            <FileText size={22} />
          </div>
          <h2>Upload PDF Forms</h2>
          <p>
            Upload a synthetic service-request PDF for your customer profile along with any supporting evidence documents.
          </p>
          <button className="button secondary" onClick={() => setMethod(true)}>
            Upload PDF forms
            <ArrowRight size={16} />
          </button>
        </article>
      </div>
    </div>
  );
}

function PdfSubmit() {
  const { profile } = useAuth();
  const pending = useIntent(profile!.id);
  const [requestType, setRequestType] = useState(
    () =>
      new URLSearchParams(pending?.path.split('?')[1]).get('requestType') ||
      (pending?.path === '/submissions' ? 'ACCOUNT_OPENING' : 'ADDRESS_CHANGE')
  );
  const upload = useUpload(
    requestType === 'ACCOUNT_OPENING'
      ? '/submissions'
      : '/submissions?requestType=' + encodeURIComponent(requestType),
    '/submit'
  );
  const [files, setFiles] = useState<File[]>(upload.initialFiles);
  const [step, setStep] = useState(upload.samePath ? (files.length ? 2 : 1) : 0);
  const [acknowledged, setAcknowledged] = useState(false);
  const [confirmed, setConfirmed] = useState<Detail>();
  const blocked = upload.pending && !upload.samePath;

  return (
    <div className="page-stack">
      <PageHeader
        eyebrow="PDF Upload Workflow"
        title="Upload a banking service request"
        description="Submit synthetic request documents for your existing customer profile."
      />
      <ol className="wizard-steps" aria-label="Submission steps">
        {steps.map((name, i) => (
          <li
            key={name}
            className={i === step ? 'current' : i < step ? 'complete' : ''}
            aria-current={i === step ? 'step' : undefined}
          >
            <span>{i < step ? <Check size={14} /> : `0${i + 1}`}</span>
            <strong>{name}</strong>
          </li>
        ))}
      </ol>

      {blocked ? (
        <Notice>
          <p>Confirm your earlier document request before starting a new submission.</p>
          <Link className="text-link" to={upload.pending!.returnTo}>
            Return to the earlier upload <ArrowRight size={14} />
          </Link>
        </Notice>
      ) : (
        <div className="submission-grid">
          <div>
            {step === 0 && (
              <Panel title="Application information" description="Select the service request type for your PDF package.">
                <div className="form-body">
                  <label>
                    Request type
                    <select
                      aria-label="PDF request type"
                      value={requestType}
                      disabled={!!upload.pending}
                      onChange={e => setRequestType(e.target.value)}
                    >
                      {requestType === 'ACCOUNT_OPENING' ? (
                        <option value="ACCOUNT_OPENING">Historical account-opening retry</option>
                      ) : (
                        serviceRequests.map(r => (
                          <option key={r.value} value={r.value}>{r.label}</option>
                        ))
                      )}
                    </select>
                  </label>
                  <dl className="data-list">
                    <div><dt>Applicant</dt><dd>{profile!.name}</dd></div>
                    <div><dt>Customer reference</dt><dd className="mono">{profile!.customerReference}</dd></div>
                  </dl>
                  <p className="muted">Your PDFs must reference this customer reference.</p>
                </div>
                <div className="form-actions">
                  <span className="muted">Step 1 of 4</span>
                  <button className="button primary" onClick={() => setStep(1)}>
                    Continue <ArrowRight size={16} />
                  </button>
                </div>
              </Panel>
            )}

            {step === 1 && (
              <Panel
                title={upload.samePath ? 'Restore your upload' : 'Upload your documents'}
                description="Choose text-readable PDFs labelled as synthetic demonstration data."
              >
                <div className="form-body">
                  {upload.samePath && (
                    <Notice>
                      <p>Reselect your original files in the same order to confirm the earlier request:</p>
                      <ol className="restore-files">
                        {upload.pending!.files.map((f, i) => (
                          <li key={i}>{f.name} · {size(f.size)}</li>
                        ))}
                      </ol>
                    </Notice>
                  )}
                  <FilePicker files={files} setFiles={setFiles} restoring={upload.samePath} disabled={upload.busy} />
                  <p className="muted">Documents are classified automatically after upload.</p>
                </div>
                <div className="form-actions">
                  <button className="button ghost" disabled={upload.busy} onClick={() => setStep(0)}>
                    <ArrowLeft size={16} /> Back
                  </button>
                  <button className="button primary" disabled={!files.length || upload.busy} onClick={() => setStep(2)}>
                    Review documents <ArrowRight size={16} />
                  </button>
                </div>
              </Panel>
            )}

            {step === 2 && (
              <Panel title="Review your submission" description="Verify your selected documents before sending.">
                <div className="form-body">
                  <dl className="data-list">
                    <div><dt>Request</dt><dd>{serviceLabel(requestType)}</dd></div>
                    <div><dt>Applicant</dt><dd>{profile!.name}</dd></div>
                    <div><dt>Customer reference</dt><dd className="mono">{profile!.customerReference}</dd></div>
                  </dl>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h3 style={{ fontSize: 14 }}>Selected documents</h3>
                    <span className="muted">{files.length} {files.length === 1 ? 'file' : 'files'}</span>
                  </div>
                  <ul className="review-files">
                    {files.map((f, i) => (
                      <li key={i}>
                        <span className="file-icon"><FileText size={18} /></span>
                        <span style={{ flex: 1 }}>{f.name}</span>
                        <small className="muted">{size(f.size)}</small>
                      </li>
                    ))}
                  </ul>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={acknowledged}
                      onChange={e => setAcknowledged(e.target.checked)}
                      disabled={upload.busy}
                    />
                    <span>I confirm these are synthetic demonstration documents and understand they will be processed by AFI Resolve.</span>
                  </label>
                  <UploadFeedback uploader={upload} />
                </div>
                <div className="form-actions">
                  <button className="button ghost" disabled={upload.busy} onClick={() => setStep(1)}>
                    <ArrowLeft size={16} /> Back
                  </button>
                  <button
                    className="button primary"
                    disabled={!acknowledged || !files.length || upload.busy}
                    onClick={async () => {
                      const result = await upload.submit(files);
                      if (result) {
                        setConfirmed(result);
                        setStep(3);
                      }
                    }}
                  >
                    {upload.busy ? 'Waiting for confirmation…' : upload.samePath ? 'Retry original request' : 'Submit application'}
                    {!upload.busy && <ArrowRight size={16} />}
                  </button>
                </div>
              </Panel>
            )}

            {step === 3 && confirmed && (
              <Panel>
                <div className="confirmation">
                  <span className="confirmation-symbol"><CheckCircle2 size={28} /></span>
                  <p className="eyebrow">Submission Confirmed</p>
                  <h2>Your documents are received.</h2>
                  <p>Keep this reference to track validation and Resolution Management updates.</p>
                  <div className="confirmation-reference">
                    <small className="muted">Submission reference</small>
                    <Reference value={confirmed.submission.caseReference} />
                  </div>
                  <dl className="confirmation-details">
                    <div><dt className="muted">Submitted</dt><dd><strong>{date(confirmed.submission.createdAt, true)} SGT</strong></dd></div>
                    <div><dt className="muted">Status</dt><dd><Badge status={confirmed.submission.status} /></dd></div>
                  </dl>
                  {confirmed.corrections.length > 0 && (
                    <Notice>
                      {confirmed.corrections.length} document {confirmed.corrections.length === 1 ? 'request needs' : 'requests need'} your attention.
                    </Notice>
                  )}
                  <Link className="button primary" to={`/submissions/${confirmed.submission.id}`}>
                    Track this submission <ArrowRight size={16} />
                  </Link>
                </div>
              </Panel>
            )}
          </div>

          <aside className="submission-aside">
            <div className="aside-card">
              <h3 style={{ fontSize: 15 }}>Before you upload</h3>
              <p className="muted">Ensure your synthetic PDFs include:</p>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'grid', gap: 8, fontSize: 13 }}>
                <li style={{ display: 'flex', gap: 8 }}><Check size={16} style={{ color: 'var(--success-text)', flexShrink: 0 }} />One synthetic banking service request</li>
                <li style={{ display: 'flex', gap: 8 }}><Check size={16} style={{ color: 'var(--success-text)', flexShrink: 0 }} />Matching customer reference &amp; date</li>
                <li style={{ display: 'flex', gap: 8 }}><Check size={16} style={{ color: 'var(--success-text)', flexShrink: 0 }} />Supporting address or foreign-tax proof if applicable</li>
              </ul>
              <div style={{ borderTop: '1px solid var(--border)', paddingTop: 12, display: 'flex', gap: 8, fontSize: 12, color: 'var(--text-muted)' }}>
                <LockKeyhole size={15} style={{ flexShrink: 0 }} />
                <span>Only your authenticated customer account can access this submission.</span>
              </div>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
