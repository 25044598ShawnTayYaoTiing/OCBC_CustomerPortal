import { CancelRequest } from "../components/CancelRequest";
import { DocumentRequirements } from "../components/DocumentRequirements";
import { customerActions, requestNextStep } from "../lib/customer-actions";
import { api } from "../lib/api";
import { ContactVerification } from "../components/ContactVerification";
import { serviceLabel } from "../lib/service-requests";
import {
  ArrowLeft,
  ArrowRight,
  CheckCircle2,
  ClipboardPenLine,
  FilePlus2,
  FileText,
  RefreshCw,
  UploadCloud,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { jsonPost } from "../lib/api";
import { useAuth } from "../auth";
import { useData, useResource } from "../data";
import { intentFiles, useIntent } from "../lib/upload-intent";
import type { Correction, Detail, Document } from "../types";
import {
  Badge,
  date,
  Empty,
  ErrorBox,
  Loading,
  Notice,
  PageHeader,
  Panel,
  Reference,
  titleCase,
} from "../components/ui";
import { FilePicker, UploadFeedback, useUpload } from "../components/Upload";
import { Timeline } from "../components/Timeline";
import { NotificationList } from "../components/Records";

interface UploadTarget {
  document?: Document;
  request?: Correction;
  add?: boolean;
}
function CorrectionDialog({
  detail,
  target,
  onClose,
  onSuccess,
}: {
  detail: Detail;
  target: UploadTarget;
  onClose: () => void;
  onSuccess: (data: Detail) => void;
}) {
  const { profile } = useAuth();
  const dialog = useRef<HTMLDialogElement>(null);
  const options = target.request?.documentIds.length
    ? detail.documents.filter((d) => target.request!.documentIds.includes(d.id))
    : detail.documents;
  const [selected, setSelected] = useState(
    target.document?.id || (options.length === 1 ? options[0].id : ""),
  );
  const path = `/submissions/${encodeURIComponent(detail.submission.id)}/documents${target.add ? "" : `/${encodeURIComponent(selected || "select-document")}/replacement`}`;
  const uploader = useUpload(path, `/submissions/${detail.submission.id}`);
  const [files, setFiles] = useState<File[]>(() => uploader.initialFiles());
  useEffect(() => {
    const element = dialog.current;
    element?.showModal();
    return () => {
      element?.close();
    };
  }, []);
  return (
    <dialog
      ref={dialog}
      className="upload-dialog"
      aria-labelledby="upload-dialog-title"
      onCancel={(e) => {
        if (uploader.busy) e.preventDefault();
        else onClose();
      }}
    >
      <div className="dialog-heading">
        <div>
          <p className="eyebrow">YOUR EXISTING APPLICATION</p>
          <h2 id="upload-dialog-title">
            {target.add ? "Add missing documents" : "Upload a corrected document"}
          </h2>
        </div>
        <button
          className="icon-button"
          aria-label="Close upload"
          disabled={uploader.busy}
          onClick={onClose}
        >
          <X size={19} />
        </button>
      </div>
      <div className="dialog-content">
        {target.request && <Notice>{target.request.instruction}</Notice>}
        {!target.add && (
          <label>
            Document to replace
            <select
              aria-label="Document to replace"
              value={selected}
              onChange={(e) => {
                setSelected(e.target.value);
                setFiles([]);
              }}
              disabled={uploader.busy || !!uploader.pending}
            >
              <option value="">Choose the affected document</option>
              {options.map((d) => (
                <option key={d.id} value={d.id}>
                  {titleCase(d.type)} — {d.filename}
                </option>
              ))}
            </select>
          </label>
        )}
        {uploader.samePath && (
          <p className="field-hint">
            Retrying your original request. Required files, in order:{" "}
            {uploader.pending!.files.map((f) => f.name).join(", ")}.
          </p>
        )}
        <DocumentRequirements
          requestType={detail.submission.requestType || ""}
        />
        <FilePicker
          files={files}
          setFiles={setFiles}
          max={target.add || uploader.combineImages ? 10 : 1}
          disabled={uploader.busy}
          restoring={uploader.samePath}
        />
        <p className="field-hint">
          Replacing a document retains its earlier version. Requests stay open
          until the service confirms successful revalidation.
        </p>
        <UploadFeedback uploader={uploader} />
        {uploader.pending && !uploader.samePath && (
          <Notice>
            Another document request is awaiting confirmation. Close this dialog
            and use “Resume upload” on the application.
          </Notice>
        )}
      </div>
      <div className="dialog-actions">
        <button
          className="button secondary"
          disabled={uploader.busy}
          onClick={onClose}
        >
          Cancel
        </button>
        <button
          className="button primary"
          disabled={
            uploader.busy ||
            !files.length ||
            (!target.add && !selected) ||
            !!(uploader.pending && !uploader.samePath)
          }
          onClick={async () => {
            const result = await uploader.submit(files);
            if (result) onSuccess(result);
          }}
        >
          <UploadCloud size={16} />
          {uploader.busy
            ? "Waiting for confirmation…"
            : uploader.samePath
              ? "Retry original request"
              : target.add
                ? "Upload documents"
                : "Submit correction"}
        </button>
      </div>
    </dialog>
  );
}

function SubmittedDetails({ id }: { id: string }) {
  const form = useResource<{ values: Record<string, unknown> }>(
    `/submissions/${encodeURIComponent(id)}/eform`,
  );
  const labels: Record<string, string> = {
    mailingAddress: "Requested address",
    email: "Email",
    mobile: "Mobile number",
    accountType: "Account type",
    currency: "Currency",
    taxResidency: "Tax residency",
    foreignTaxCountry: "Other tax countries",
    taxIdentifier: "Tax identifier",
    sourceOfFunds: "Source of funds",
  };
  return (
    <details className="customer-details">
      <summary>Details you submitted</summary>
      {form.loading ? (
        <Loading />
      ) : form.error ? (
        <ErrorBox
          message="Your submitted details could not be loaded."
          retry={() => void form.refresh()}
        />
      ) : (
        <dl className="data-list form-body">
          {Object.entries(labels)
            .filter(([k]) => !!form.data?.values[k])
            .map(([k, label]) => (
              <div key={k}>
                <dt>{label}</dt>
                <dd>{String(form.data!.values[k])}</dd>
              </div>
            ))}
        </dl>
      )}
    </details>
  );
}
export function SubmissionDetail() {
  const { id = "" } = useParams();
  const result = useResource<Detail>(`/submissions/${encodeURIComponent(id)}`);
  const { notifications } = useData();
  const { profile } = useAuth();
  const pending = useIntent(profile!.id);
  const [target, setTarget] = useState<UploadTarget | null>(null);
  const [notice, setNotice] = useState("");
  useEffect(() => {
    setTarget(null);
    setNotice("");
  }, [id]);
  const data = result.data;
  if (result.loading) return <Loading text="Loading your request..." />;
  if (!data)
    return (
      <ErrorBox
        message={result.error || "Request not found."}
        retry={() => void result.refresh()}
      />
    );
  const digital = data.submission.captureMethod === "DIGITAL_EFORM";
  const locked = ["OPERATIONS", "CANCELLED"].includes(data.submission.status);
  const actions = customerActions(data);
  const activities = (notifications.data || []).filter(
    (n) => n.submissionId === id,
  );
  function openAction(request: Correction) {
    setTarget(
      request.documentIds.length ? { request } : { request, add: true },
    );
  }
  function resume() {
    if (!pending) return;
    const doc = pending.path.match(/\/documents\/([^/]+)\/replacement$/)?.[1];
    setTarget(
      doc
        ? {
            document: data!.documents.find(
              (d) => d.id === decodeURIComponent(doc),
            ),
          }
        : { add: true },
    );
  }
  return (
    <div className="page-stack customer-journey">
      <Link className="back-link" to="/submissions">
        <ArrowLeft size={16} />
        My requests
      </Link>
      <PageHeader
        title={serviceLabel(data.submission.requestType)}
        description={`Submitted ${date(data.submission.createdAt)}`}
      >
        <Badge status={data.submission.status} />
        <button
          className="button secondary"
          disabled={result.refreshing}
          onClick={() => {
            void result.refresh();
            void notifications.refresh();
          }}
        >
          <RefreshCw size={16} />
          Refresh
        </button>
      </PageHeader>
      {result.error && (
        <ErrorBox message={result.error} retry={() => void result.refresh()} />
      )}{" "}
      {notice && <Notice>{notice}</Notice>}
      <section
        className={`request-summary ${actions.length ? "needs-action" : ""}`}
      >
        <h2>
          {data.submission.status === "CANCELLED"
            ? "Closed request"
            : actions.length
              ? "What you need to do"
              : locked
                ? "What happens next"
                : "What happens next"}
        </h2>
        <p>{requestNextStep(data.submission.status, actions.length)}</p>
      </section>
      {data.submission.status !== "CANCELLED" && <CancelRequest
        submission={data.submission}
        onCancelled={() => {
          setTarget(null);
          void result.refresh();
        }}
      />}
      {pending?.returnTo === `/submissions/${id}` && (
        <Notice>
          <strong>Your upload has not been confirmed.</strong>{" "}
          <button className="text-button" onClick={resume}>
            Check or retry the same upload
          </button>
        </Notice>
      )}
      {!locked && data.submission.requestType === "CONTACT_UPDATE" && (
        <div id="contact-verification">
          <ContactVerification
            id={id}
            verified={!!data.contactVerification?.emailVerified}
            onUpdate={() => {
              void result.refresh();
              void notifications.refresh();
            }}
          />
        </div>
      )}
      {!!actions.length && (
        <Panel
          title={
            actions.length === 1
              ? "One action to continue"
              : `${actions.length} actions to continue`
          }
        >
          <div className="correction-list">
            {actions.map((request) => (
              <article className="correction-card" key={request.id}>
                <span className="request-symbol">
                  <ClipboardPenLine size={20} />
                </span>
                <div>
                  <h3>{request.instruction}</h3>
                  <div className="correction-actions">
                    {["SERVICE_OTP", "SERVICE_PHONE"].includes(
                      request.ruleKey || "",
                    ) ? (
                      <a
                        className="button primary"
                        href="#contact-verification"
                      >
                        Verify contact details
                      </a>
                    ) : [
                        "SERVICE_SUPPORT",
                        "ATTACH_SUPPORTING_DOCUMENT",
                      ].includes(request.ruleKey || "") ||
                      !digital ||
                      request.documentType === "SUPPORTING_DOCUMENT" ? (
                      <button
                        className="button primary"
                        disabled={locked}
                        onClick={() => openAction(request)}
                      >
                        Upload document
                      </button>
                    ) : (
                      <Link
                        className="button primary"
                        to={`/submissions/${id}/form`}
                      >
                        Update details
                      </Link>
                    )}
                  </div>
                </div>
              </article>
            ))}
          </div>
        </Panel>
      )}
      {digital && <SubmittedDetails id={id} />}
      <Panel
        title="Your documents"
        action={
          !locked &&
          !actions.length && (
            <button
              className="text-button"
              onClick={() => setTarget({ add: true })}
            >
              Add document
              <FilePlus2 size={16} />
            </button>
          )
        }
      >
        {data.documents.length ? (
          <ul className="document-records">
            {data.documents.map((document) => (
              <li key={document.id}>
                <span className="file-icon">
                  <FileText size={21} />
                </span>
                <div>
                  <strong>{document.filename}</strong>
                  <p>
                    {document.captureMethod === "DIGITAL_EFORM"
                      ? "Your submitted declaration"
                      : "Supporting document"}
                  </p>
                </div>
                {!locked && document.captureMethod !== "DIGITAL_EFORM" && (
                  <button
                    className="text-button"
                    onClick={() => setTarget({ document })}
                  >
                    Replace document
                  </button>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <Empty
            title="No documents yet"
            description="Your uploaded documents will appear here."
          />
        )}
      </Panel>
      <details className="customer-details">
        <summary>Request reference and updates</summary>
        <div className="form-body">
          <Reference value={data.submission.caseReference} />
        </div>
        {notifications.error ? (
          <ErrorBox
            message="Updates could not be loaded."
            retry={() => void notifications.refresh()}
          />
        ) : (
          <NotificationList items={activities} />
        )}
      </details>
      {!locked && (
        <details className="customer-details">
          <summary>Change this request or ask for help</summary>
          <div className="form-body">
            <p>
              Updates may need to be checked again. If you cannot provide the
              requested information, ask our team to review your request.
            </p>
            <div className="heading-actions">
              {digital && (
                <Link
                  className="button secondary"
                  to={`/submissions/${id}/form`}
                >
                  Edit submitted details
                </Link>
              )}
              <button
                className="button secondary"
                onClick={async () => {
                  try {
                    await jsonPost(
                      `/submissions/${encodeURIComponent(id)}/escalate`,
                      {},
                    );
                    setNotice(
                      "Your request has been sent to our team for review.",
                    );
                    void result.refresh();
                  } catch (e) {
                    setNotice(
                      e instanceof Error ? e.message : "Please try again.",
                    );
                  }
                }}
              >
                Ask for review
              </button>
            </div>
          </div>
        </details>
      )}
      {target && (
        <CorrectionDialog
          detail={data}
          target={target}
          onClose={() => setTarget(null)}
          onSuccess={() => {
            setTarget(null);
            setNotice(
              "Your document was received. Check the updated status below.",
            );
            void result.refresh();
            void notifications.refresh();
          }}
        />
      )}
    </div>
  );
}
