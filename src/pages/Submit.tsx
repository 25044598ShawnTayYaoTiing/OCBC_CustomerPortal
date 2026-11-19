import { DocumentRequirements } from "../components/DocumentRequirements";
import {
  readPdfDraft,
  savePdfDraft,
  clearPdfDraft,
  useEformIntent,
} from "../lib/request-draft";
import { serviceLabel, serviceRequests } from "../lib/service-requests";
import {
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  FileText,
} from "lucide-react";
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth";
import {
  FilePicker,
  size,
  UploadFeedback,
  useUpload,
} from "../components/Upload";
import {
  Badge,
  date,
  Notice,
  PageHeader,
  Panel,
  Reference,
} from "../components/ui";
import { useIntent } from "../lib/upload-intent";
import type { Detail } from "../types";

const steps = ["Service", "Documents", "Review & send"];

export function Submit() {
  const { profile } = useAuth();
  const pending = useIntent(profile!.id);
  const pendingEform = useEformIntent(profile!.id);
  const [method, setMethod] = useState(
    () => pending?.path.split("?")[0] === "/submissions",
  );

  if (pendingEform) {
    return (
      <Notice>
        Confirm or check the status of your earlier digital request before starting another application.{" "}
        <Link className="text-link" to={pendingEform.returnTo}>
          Review pending request
        </Link>
      </Notice>
    );
  }
  if (pending && pending.path.split("?")[0] !== "/submissions") {
    return (
      <Notice>
        Confirm your earlier upload before starting another application.{" "}
        <Link className="text-link" to={pending.returnTo}>
          Resume upload
        </Link>
      </Notice>
    );
  }

  if (method) {
    return (
      <div className="page-stack">
        <div>
          <button className="text-button" onClick={() => setMethod(false)}>
            <ArrowLeft size={15} />
            Back to request options
          </button>
        </div>
        <PdfSubmit />
      </div>
    );
  }

  return (
    <div className="page-stack">
      <PageHeader
        title="New request"
        description="Choose a service and tell us what you’d like to change."
      />
      <Panel title="Choose a service">
        <ul className="demo-service-list">
          {serviceRequests.map((service) => (
            <li key={service.value}>
              <Link to={"/submit/digital?step=1&requestType=" + service.value}>
                <span><strong>{service.label}</strong><small>{service.description}</small></span><ArrowRight size={17} />
              </Link>
            </li>
          ))}
        </ul>
        <div className="form-actions">
          <button className="text-button" onClick={() => setMethod(true)}>Upload an existing request form <ArrowRight size={16} /></button>
        </div>
      </Panel>
    </div>
  );
}

function PdfSubmit() {
  const { profile } = useAuth();
  const pending = useIntent(profile!.id);
  const draft = readPdfDraft(profile!.id);
  const [requestType, setRequestType] = useState(
    () =>
      new URLSearchParams(pending?.path.split("?")[1]).get("requestType") ||
      draft?.requestType ||
      (pending?.path === "/submissions" ? "ACCOUNT_OPENING" : "ADDRESS_CHANGE"),
  );
  const upload = useUpload(
    requestType === "ACCOUNT_OPENING"
      ? "/submissions"
      : "/submissions?requestType=" + encodeURIComponent(requestType),
    "/submit",
    draft?.combineImages,
  );
  const [files, setFiles] = useState<File[]>(
    () => draft?.files || upload.initialFiles(),
  );
  const [step, setStep] = useState(
    upload.samePath ? (files.length ? 2 : 1) : draft?.step || 0,
  );
  const [acknowledged, setAcknowledged] = useState(
    draft?.acknowledged || false,
  );
  useEffect(() => {
    if (step < 3)
      savePdfDraft(profile!.id, { requestType, files, step, acknowledged, combineImages: upload.combineImages });
  }, [profile, requestType, files, step, acknowledged, upload.combineImages]);
  const [confirmed, setConfirmed] = useState<Detail>();
  const blocked = upload.pending && !upload.samePath;

  return (
    <div className="page-stack">
      <PageHeader
        title="Upload a request"
        description="Send your completed form and any required supporting documents."
      />
      {step < steps.length && <ol className="wizard-steps" aria-label="Submission steps">
        {steps.map((name, i) => (
          <li
            key={name}
            className={i === step ? "current" : i < step ? "complete" : ""}
            aria-current={i === step ? "step" : undefined}
          >
            <span>{i < step ? <Check size={14} /> : `0${i + 1}`}</span>
            <strong>{name}</strong>
          </li>
        ))}
      </ol>}

      {blocked ? (
        <Notice>
          <p>
            Confirm your earlier document request before starting a new
            submission.
          </p>
          <Link className="text-link" to={upload.pending!.returnTo}>
            Return to the earlier upload <ArrowRight size={14} />
          </Link>
        </Notice>
      ) : (
        <div className="submission-grid">
          <div>
            {step === 0 && (
              <Panel
                title="Application information"
                description="Select the service request type for your document package."
              >
                <div className="form-body">
                  <label>
                    Request type
                    <select
                      aria-label="Document request type"
                      value={requestType}
                      disabled={!!upload.pending}
                      onChange={(e) => setRequestType(e.target.value)}
                    >
                      {requestType === "ACCOUNT_OPENING" ? (
                        <option value="ACCOUNT_OPENING">
                          Historical account-opening retry
                        </option>
                      ) : (
                        serviceRequests.map((r) => (
                          <option key={r.value} value={r.value}>
                            {r.label}
                          </option>
                        ))
                      )}
                    </select>
                  </label>
                  <dl className="data-list">
                    <div>
                      <dt>Applicant</dt>
                      <dd>{profile!.name}</dd>
                    </div>
                    <div>
                      <dt>Customer reference</dt>
                      <dd className="mono">{profile!.customerReference}</dd>
                    </div>
                  </dl>
                  <p className="muted">
                    Your uploads will be linked to this request.
                  </p>
                </div>
                <div className="form-actions">
                  <span className="muted">
                    Step 1 of 4 · Your selected files are retained when you go
                    Back.
                  </span>
                  <button className="button primary" onClick={() => setStep(1)}>
                    Continue <ArrowRight size={16} />
                  </button>
                </div>
              </Panel>
            )}

            {step === 1 && (
              <Panel
                title={
                  upload.samePath
                    ? "Restore your upload"
                    : "Upload your documents"
                }
                description="Choose PDFs, screenshots or clear photos."
              >
                <div className="form-body">
                  {upload.samePath && (
                    <Notice>
                      <p>
                        Reselect your original files in the same order to
                        confirm the earlier request:
                      </p>
                      <ol className="restore-files">
                        {upload.pending!.files.map((f, i) => (
                          <li key={i}>
                            {f.name} · {size(f.size)}
                          </li>
                        ))}
                      </ol>
                    </Notice>
                  )}
                  <DocumentRequirements
                    requestType={requestType}

                  />
                  <FilePicker
                    files={files}
                    setFiles={setFiles}
                    restoring={upload.samePath}
                    disabled={upload.busy}
                  />
                  <p className="muted">
                    Documents are classified automatically after upload.
                  </p>
                </div>
                <div className="form-actions">
                  <button
                    className="button ghost"
                    disabled={upload.busy}
                    onClick={() => setStep(0)}
                  >
                    <ArrowLeft size={16} /> Back
                  </button>
                  <button
                    className="button primary"
                    disabled={!files.length || upload.busy}
                    onClick={() => setStep(2)}
                  >
                    Review documents <ArrowRight size={16} />
                  </button>
                </div>
              </Panel>
            )}

            {step === 2 && (
              <Panel
                title="Review your submission"
                description="Verify your selected documents before sending."
              >
                <div className="form-body">
                  <dl className="data-list">
                    <div>
                      <dt>Request</dt>
                      <dd>{serviceLabel(requestType)}</dd>
                    </div>
                    <div>
                      <dt>Applicant</dt>
                      <dd>{profile!.name}</dd>
                    </div>
                    <div>
                      <dt>Customer reference</dt>
                      <dd className="mono">{profile!.customerReference}</dd>
                    </div>
                  </dl>
                  <div
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                    }}
                  >
                    <h3 style={{ fontSize: 14 }}>Selected documents</h3>
                    <span className="muted">
                      {files.length} {files.length === 1 ? "file" : "files"}
                    </span>
                  </div>
                  <ul className="review-files">
                    {files.map((f, i) => (
                      <li key={i}>
                        <span className="file-icon">
                          <FileText size={18} />
                        </span>
                        <span style={{ flex: 1 }}>{f.name}</span>
                        <small className="muted">{size(f.size)}</small>
                      </li>
                    ))}
                  </ul>
                  <label className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={acknowledged}
                      onChange={(e) => setAcknowledged(e.target.checked)}
                      disabled={upload.busy}
                    />
                    <span>
                      I confirm these documents contain fictional data and
                      understand they will be processed by AFI Resolve.
                    </span>
                  </label>
                  <UploadFeedback uploader={upload} />
                </div>
                <div className="form-actions">
                  <button
                    className="button ghost"
                    disabled={upload.busy}
                    onClick={() => setStep(1)}
                  >
                    <ArrowLeft size={16} /> Back
                  </button>
                  <button
                    className="button primary"
                    disabled={!acknowledged || !files.length || upload.busy}
                    onClick={async () => {
                      const result = await upload.submit(files);
                      if (result) {
                        clearPdfDraft(profile!.id);
                        setConfirmed(result);
                        setStep(3);
                      }
                    }}
                  >
                    {upload.busy
                      ? "Waiting for confirmation…"
                      : upload.samePath
                        ? "Retry original request"
                        : "Submit application"}
                    {!upload.busy && <ArrowRight size={16} />}
                  </button>
                </div>
              </Panel>
            )}

            {step === 3 && confirmed && (
              <Panel>
                <div className="confirmation">
                  <span className="confirmation-symbol">
                    <CheckCircle2 size={28} />
                  </span>
                  <p className="eyebrow">Submission Confirmed</p>
                  <h2>Request sent</h2>
                  <p>Keep this reference to track your request.</p>
                  <div className="confirmation-reference">
                    <small className="muted">Submission reference</small>
                    <Reference value={confirmed.submission.caseReference} />
                  </div>
                  <dl className="confirmation-details">
                    <div>
                      <dt className="muted">Submitted</dt>
                      <dd>
                        <strong>
                          {date(confirmed.submission.createdAt, true)} SGT
                        </strong>
                      </dd>
                    </div>
                    <div>
                      <dt className="muted">Status</dt>
                      <dd>
                        <Badge status={confirmed.submission.status} />
                      </dd>
                    </div>
                  </dl>
                  {confirmed.corrections.length > 0 && (
                    <Notice>
                      {confirmed.corrections.length} document{" "}
                      {confirmed.corrections.length === 1
                        ? "request needs"
                        : "requests need"}{" "}
                      your attention.
                    </Notice>
                  )}
                  <Link
                    className="button primary"
                    to={`/submissions/${confirmed.submission.id}`}
                  >
                    Track this submission <ArrowRight size={16} />
                  </Link>
                </div>
              </Panel>
            )}
          </div>

          <aside className="submission-aside">
            <div className="aside-card">
              <DocumentRequirements
                requestType={requestType}

              />
              <p>
                Include a service-request document with your name,
                reference, request type, date and explicit authorisation.
                Supporting documents alone do not constitute a request.
              </p>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}
