import { AddressFields } from "../components/AddressFields";
import { useEffect, useRef, useState } from "react";
import {
  Link,
  useNavigate,
  useParams,
  useSearchParams,
} from "react-router-dom";
import { ArrowLeft, ArrowRight, Check } from "lucide-react";
import { useAuth } from "../auth";
import { useData } from "../data";
import { useIntent } from "../lib/upload-intent";
import { api, ApiError } from "../lib/api";
import { serviceLabel, serviceRequests } from "../lib/service-requests";
import type { Detail, DigitalValues } from "../types";
import { ErrorBox, Loading, Notice, PageHeader, Panel } from "../components/ui";
import { FilePicker, ImagePageOption, validateFiles } from "../components/Upload";
import { DocumentRequirements } from "../components/DocumentRequirements";
import { readDraft, saveDraft, clearDraft } from "../lib/request-draft";
import { LegacyDigitalForm } from "./LegacyDigitalForm";

const today = () =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Singapore",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

export function DigitalForm() {
  const { id } = useParams();
  const [query, setQuery] = useSearchParams();
  const selectedService = serviceRequests.find((service) => service.value === query.get("requestType"))?.value;
  const requestedStage = Number(query.get("step") || (id || selectedService ? 1 : 0));
  const stage =
    Number.isInteger(requestedStage) &&
    requestedStage >= (selectedService ? 1 : 0) &&
    requestedStage <= 3
      ? requestedStage
      : selectedService ? 1 : 0;
  function setStage(step: number) {
    setError("");
    setQuery((previous) => {
      const next = new URLSearchParams(previous);
      next.set("step", String(step));
      return next;
    });
  }
  const review = stage === 3;
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { submissions, notifications } = useData();
  const p = profile?.bankingProfile;
  const pending = useIntent(profile!.id);
  const draftKey = `${profile!.id}:${id || selectedService || "new"}`;
  const draft = readDraft(draftKey);
  const [files, setFiles] = useState<File[]>(() => draft?.files || []);
  const [combineImages, setCombineImages] = useState(draft?.combineImages || false);
  const [progress, setProgress] = useState(0);
  const [existingSupport, setExistingSupport] = useState(false);
  const submitting = useRef(false);

  const [values, setValues] = useState<DigitalValues>(
    () =>
      draft?.values || {
        requestType: serviceRequests
          .map((request) => request.value)
          .includes(query.get("requestType") || "")
          ? query.get("requestType")!
          : "ADDRESS_CHANGE",
        accountType: p?.accountType || "SAVINGS",
        currency: p?.currency || "SGD",
        mailingAddress:
          query.get("requestType") === "RESIDENTIAL_ADDRESS_CHANGE"
            ? p?.residentialAddress || ""
            : p?.mailingAddress || "",
        email: p?.email || "",
        mobile: p?.mobile || "",
        occupation: "",
        taxResidency: p?.taxResidency || "Singapore",
        foreignTaxCountry: "",
        taxIdentifier: "",
        declarationDate: today(),
        taxDeclaration: false,
        authorisation: false,
      },
  );

  const [addressReady, setAddressReady] = useState(draft?.addressReady ?? !!id);
  const [loading, setLoading] = useState(!!id);
  const [loaded, setLoaded] = useState(!id);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [locked, setLocked] = useState(false);
  const [retry, setRetry] = useState(draft?.retry || false);
  const intent = useRef<{
    key: string;
    body: string;
    multipart: boolean;
  } | null>(draft?.intent || null);
  useEffect(() => {
    saveDraft(draftKey, {
      values,
      files,
      combineImages,
      addressReady,
      retry,
      intent: intent.current,
    });
  }, [draftKey, values, files, combineImages, addressReady, retry]);

  useEffect(() => {
    if (!id) return;
    const controller = new AbortController();
    void Promise.all([
      api<{ values: DigitalValues }>(
        `/submissions/${encodeURIComponent(id)}/eform`,
        { signal: controller.signal },
      ),
      api<Detail>(`/submissions/${encodeURIComponent(id)}`, {
        signal: controller.signal,
      }),
    ])
      .then(([form, detail]) => {
        if (!controller.signal.aborted) {
          setValues({
            ...(draft?.values || form.values),
            authorisation: false,
            expectedRevision: detail.submission.revision,
          });
          setLocked(
            ["OPERATIONS", "CANCELLED"].includes(detail.submission.status),
          );
          setExistingSupport(
            detail.documents.some(
              (document) => document.type === "SUPPORTING_DOCUMENT",
            ),
          );
          setLoaded(true);
        }
      })
      .catch((e) => {
        if (!controller.signal.aborted)
          setError(
            e instanceof Error ? e.message : "Unable to load this request.",
          );
      })
      .finally(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [id]);

  const update = <K extends keyof DigitalValues>(
    key: K,
    value: DigitalValues[K],
  ) => setValues((v) => ({ ...v, [key]: value }));

  const address = ["ADDRESS_CHANGE", "RESIDENTIAL_ADDRESS_CHANGE"].includes(
    values.requestType,
  );
  const additionalAccount = values.requestType === "ADDITIONAL_ACCOUNT";
  const contact = values.requestType === "CONTACT_UPDATE";
  const tax = values.requestType === "TAX_RESIDENCY_UPDATE";
  const foreign = tax && values.taxResidency !== "Singapore";

  const supportRequired = address || foreign;
  function detailsError() {
    if (!values.authorisation)
      return "Confirm your authorisation before continuing.";
    if (address && (!addressReady || !values.mailingAddress.trim()))
      return "Find your new address or enter it for manual review.";
    if (
      tax &&
      (!values.taxDeclaration ||
        (foreign &&
          (!values.foreignTaxCountry.trim() || !values.taxIdentifier.trim())))
    )
      return "Complete your tax declaration, jurisdictions and TIN.";
    if (
      additionalAccount &&
      values.accountType === "CURRENT" &&
      !values.sourceOfFunds?.trim()
    )
      return "Provide a source-of-funds description for this current-account request.";
    if (contact && values.email === p?.email && values.mobile === p?.mobile)
      return "Change your email, phone number, or both before continuing.";
    return "";
  }
  async function submit() {
    if (submitting.current || locked) return;
    const validation = retry ? "" : detailsError();
    if (validation) {
      setError(validation);
      return;
    }
    if (!retry && supportRequired && !existingSupport && !files.length) {
      setError("Add the required supporting document before submitting.");
      setStage(2);
      return;
    }
    if (files.length) {
      const problem = await validateFiles(files);
      if (problem) {
        setError(problem);
        return;
      }
    }
    if (submitting.current) return;
    submitting.current = true;
    setBusy(true);
    setProgress(0);
    setError("");
    if (!intent.current) {
      intent.current = {
        key: crypto.randomUUID(),
        multipart: files.length > 0,
        body: JSON.stringify({
          ...values,
          accountType: additionalAccount ? values.accountType : null,
          currency: additionalAccount ? values.currency : null,
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
    saveDraft(draftKey, {
      values,
      files,
      combineImages,
      addressReady,
      retry: true,
      intent: intent.current,
    });
    try {
      const multipart = new FormData();
      if (intent.current.multipart) {
        multipart.append(
          "form",
          new Blob([intent.current.body], { type: "application/json" }),
        );
        files.forEach((file) => multipart.append("files", file, file.name));
        multipart.append("combineImages", String(combineImages));
      }
      const result = await api<Detail>(
        (id ? `/submissions/${encodeURIComponent(id)}/eform` : "/eforms") +
          (intent.current.multipart ? "/with-documents" : ""),
        {
          method: "POST",
          headers: {
            ...(intent.current.multipart
              ? {}
              : { "Content-Type": "application/json" }),
            "Idempotency-Key": intent.current.key,
          },
          body: intent.current.multipart ? multipart : intent.current.body,
          timeout: 600000,
          onUploadProgress: setProgress,
        },
      );
      if (
        !result?.submission?.id ||
        !Array.isArray(result.documents) ||
        !Array.isArray(result.corrections)
      ) {
        throw new ApiError(
          502,
          "The submission response could not be confirmed. Retry this original request safely or check My requests.",
          "",
          true,
        );
      }
      intent.current = null;
      clearDraft(draftKey);
      void submissions.refresh();
      void notifications.refresh();
      navigate(`/submissions/${result.submission.id}`);
    } catch (e) {
      const uncertain = !(
        e &&
        typeof e === "object" &&
        "status" in e &&
        typeof e.status === "number" &&
        e.status >= 400 &&
        e.status < 500
      );
      if (!uncertain) {
        intent.current = null;
        if (
          e instanceof ApiError &&
          files.length > 0 &&
          ["INVALID_PDF", "PDF_ENCRYPTED", "PDF_PAGE_LIMIT", "INVALID_DOCUMENT",
            "INVALID_IMAGE", "IMAGE_QUALITY", "EXTRACTION_FAILED", "UNSUPPORTED_FORMAT",
            "UNSUPPORTED_DOCUMENT", "EDIT_EFORM"].includes(e.code)
        ) {
          setStage(2);
          saveDraft(draftKey, { values, files, combineImages, addressReady, retry: false, intent: null });
        }
      }
      setRetry(uncertain);
      setError(
        e instanceof Error ? e.message : "Unable to confirm this request.",
      );
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }

  if (loading) return <Loading text="Loading your service request..." />;
  if (!loaded || !p)
    return (
      <ErrorBox
        message={error || "Your existing synthetic profile is unavailable."}
      />
    );
  if (id && values.requestType === "ACCOUNT_OPENING") {
    return (
      <>
        <Notice>
          This is a historical account-opening case. New requests use the
          existing-customer service workflow.
        </Notice>
        <LegacyDigitalForm />
      </>
    );
  }
  if (pending) {
    return (
      <Notice>
        Confirm your pending document upload first.{" "}
        <Link className="text-link" to={pending.returnTo}>
          Resume upload
        </Link>
      </Notice>
    );
  }

  return (
    <div className="page-stack">
      {stage === 0 && <div>
        <button
          type="button"
          className="text-button"
          disabled={busy || retry}
          onClick={() =>
            stage > 0 ? setStage(stage - 1) : navigate("/submit")
          }
        >
          <ArrowLeft size={15} />
          Back to request options
        </button>
      </div>}
      <PageHeader
        title={
          id
            ? "Update your request"
            : serviceLabel(values.requestType)
        }
      />

      <ol className="form-progress" aria-label="Request progress">
        {[
          "Choose service",
          "Your changes",
          "Supporting documents",
          "Review & send",
        ].map((name, index) => selectedService && index === 0 ? null : (
          <li key={name} aria-current={stage === index ? "step" : undefined}>
            <span>{stage > index ? <Check size={14} /> : index + (selectedService ? 0 : 1)}</span>
            <button
              type="button"
              className="text-button"
              disabled={index >= stage || busy || retry}
              onClick={() => setStage(index)}
            >
              {name}
            </button>
          </li>
        ))}
      </ol>

      <form
        className={`eform-layout creation-step-${stage}`}
        onSubmit={(e) => {
          e.preventDefault();
          if (!retry && stage < 3) {
            if (stage === 1) {
              const problem = detailsError();
              if (problem) {
                setError(problem);
                return;
              }
            }
            if (
              stage === 2 &&
              supportRequired &&
              !existingSupport &&
              !files.length
            ) {
              setError("Add a supporting document matching the requirements below.");
              return;
            }
            setStage(stage + 1);
            return;
          }
          void submit();
        }}
      >
        <div className="page-stack" style={{ gap: 20 }}>
          <div hidden={stage !== 0 || review}>
            <Panel
              title="Choose a service"
            >
              <div className="eform-fields">
                <label className="full-width">
                  Request type
                  <select
                    aria-label="Request type"
                    value={values.requestType}
                    disabled={!!id || !!selectedService}
                    onChange={(e) => {
                      const nextType = e.target.value;
                      setValues((v) => ({
                        ...v,
                        requestType: nextType,
                        mailingAddress:
                          nextType === "RESIDENTIAL_ADDRESS_CHANGE"
                            ? p?.residentialAddress || ""
                            : nextType === "ADDRESS_CHANGE"
                              ? p?.mailingAddress || ""
                              : v.mailingAddress,
                      }));
                      setAddressReady(false);
                    }}
                  >
                    {serviceRequests.map((r) => (
                      <option key={r.value} value={r.value}>
                        {r.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            </Panel>
          </div>

          <fieldset
            hidden={stage !== 1}
            disabled={busy || locked || retry || stage !== 1}
            className="eform-fieldset"
          >
            {address && (
              <Panel
                title={
                  values.requestType === "RESIDENTIAL_ADDRESS_CHANGE"
                    ? "New residential address"
                    : "New mailing address"
                }
                description="Find your new building address, then add your unit number if applicable."
              >
                <AddressFields
                  key={values.requestType}
                  existing={!!id || addressReady}
                  value={values.mailingAddress}
                  onChange={(value) => update("mailingAddress", value)}
                  onReady={setAddressReady}
                />
              </Panel>
            )}

            {additionalAccount && (
              <Panel
                title="Account details"
                description="For a current account, tell us where the money will come from."
              >
                <div className="eform-fields">
                  <label>
                    Account type
                    <select
                      value={values.accountType}
                      onChange={(e) => update("accountType", e.target.value)}
                    >
                      <option value="SAVINGS">Savings</option>
                      <option value="CURRENT">Current</option>
                    </select>
                  </label>
                  <label>
                    Currency
                    <select
                      value={values.currency}
                      onChange={(e) => update("currency", e.target.value)}
                    >
                      <option value="SGD">SGD</option>
                      <option value="USD">USD</option>
                    </select>
                  </label>
                  {values.accountType === "CURRENT" && (
                    <label className="full-width">
                      Source of funds
                      <input
                        required
                        maxLength={500}
                        value={values.sourceOfFunds || ""}
                        onChange={(e) =>
                          update("sourceOfFunds", e.target.value)
                        }
                      />
                    </label>
                  )}
                </div>
              </Panel>
            )}
            {contact && (
              <Panel
                title="Contact-detail update"
                description="Change your email, phone number, or both."
              >
                <div className="eform-fields">
                  <label>
                    New email
                    <input
                      type="email"
                      maxLength={254}
                      value={values.email}
                      onChange={(e) => update("email", e.target.value)}
                    />
                  </label>
                  <label>
                    New phone number
                    <input
                      type="tel"
                      maxLength={40}
                      value={values.mobile}
                      onChange={(e) => update("mobile", e.target.value)}
                    />
                  </label>
                </div>
                <div className="form-body" style={{ paddingTop: 0 }}>
                  <Notice>
                    After submission, verify an email OTP. A changed email is
                    verified at the new address; a phone-only change uses your
                    registered email to authorise the request. New phone
                    ownership still requires independent staff verification.
                  </Notice>
                </div>
              </Panel>
            )}

            {tax && (
              <Panel
                title="Tax residency"
              >
                <div className="eform-fields">
                  <label className={foreign ? "" : "full-width"}>
                    Tax residency
                    <select
                      aria-label="Tax residency"
                      value={values.taxResidency}
                      onChange={(e) => update("taxResidency", e.target.value)}
                    >
                      <option value="Singapore">Singapore only</option>
                      <option value="Foreign">
                        Outside Singapore / multiple jurisdictions
                      </option>
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
                          onChange={(e) =>
                            update("foreignTaxCountry", e.target.value)
                          }
                        />
                      </label>
                      <label className="full-width">
                        TIN / tax identifiers
                        <input
                          required
                          maxLength={500}
                          value={values.taxIdentifier}
                          onChange={(e) =>
                            update("taxIdentifier", e.target.value)
                          }
                        />
                      </label>
                    </>
                  )}
                  <label className="checkbox-label full-width">
                    <input
                      type="checkbox"
                      required
                      checked={values.taxDeclaration}
                      onChange={(e) =>
                        update("taxDeclaration", e.target.checked)
                      }
                    />
                    <span>
                      I declare that my synthetic tax jurisdictions and TIN
                      details are complete and accurate.
                    </span>
                  </label>
                </div>
              </Panel>
            )}

            <Panel title="Confirm your request">
              <div className="eform-fields">
                <p className="full-width">
                  The declaration time is recorded automatically when you
                  submit.
                </p>
                <label className="checkbox-label full-width">
                  <input
                    type="checkbox"
                    required
                    checked={values.authorisation}
                    onChange={(e) => update("authorisation", e.target.checked)}
                  />
                  <span>
                    I authorise this{" "}
                    {serviceLabel(values.requestType).toLowerCase()} using
                    synthetic demonstration information and the evidence
                    provided.
                  </span>
                </label>
              </div>
            </Panel>
          </fieldset>

          {stage === 2 && (
            <Panel
              title="Supporting documents"
            >
              <div className="form-body">
                <DocumentRequirements
                  requestType={values.requestType}
                  foreign={foreign}
                  reference={profile!.customerReference}
                />
                {existingSupport && (
                  <Notice>
                    A supporting document is already saved with this request. You can
                    add further evidence here or replace the saved document from My
                    requests.
                  </Notice>
                )}
                <ImagePageOption checked={combineImages} onChange={setCombineImages} disabled={busy || retry || locked} />
                <FilePicker
                  files={files}
                  setFiles={setFiles}
                  disabled={busy || retry || locked}
                />
              </div>
            </Panel>
          )}
          {review && (
            <Panel
              title="Review your request"
            >
              <dl className="review-summary">
                {address && (
                  <div>
                    <dt>Current address on your profile</dt>
                    <dd>
                      {values.requestType === "RESIDENTIAL_ADDRESS_CHANGE"
                        ? p.residentialAddress
                        : p.mailingAddress}
                    </dd>
                  </div>
                )}
                {address && (
                  <div>
                    <dt>
                      {values.requestType === "RESIDENTIAL_ADDRESS_CHANGE"
                        ? "New residential address"
                        : "New mailing address"}
                    </dt>
                    <dd>{values.mailingAddress}</dd>
                  </div>
                )}
                {contact && (
                  <>
                    <div>
                      <dt>Email</dt>
                      <dd>{values.email || "Unchanged"}</dd>
                    </div>
                    <div>
                      <dt>Phone</dt>
                      <dd>{values.mobile || "Unchanged"}</dd>
                    </div>
                  </>
                )}
                {tax && (
                  <>
                    <div>
                      <dt>Tax residency</dt>
                      <dd>{values.taxResidency}</dd>
                    </div>
                    {foreign && (
                      <>
                        <div>
                          <dt>Jurisdictions</dt>
                          <dd>{values.foreignTaxCountry}</dd>
                        </div>
                        <div>
                          <dt>Tax identifiers</dt>
                          <dd>{values.taxIdentifier}</dd>
                        </div>
                      </>
                    )}
                  </>
                )}
                {additionalAccount && (
                  <>
                    <div>
                      <dt>Account type</dt>
                      <dd>{values.accountType}</dd>
                    </div>
                    <div>
                      <dt>Currency</dt>
                      <dd>{values.currency}</dd>
                    </div>
                    {values.accountType === "CURRENT" && (
                      <div>
                        <dt>Source of funds</dt>
                        <dd>{values.sourceOfFunds}</dd>
                      </div>
                    )}
                  </>
                )}
              </dl>
              <div className="form-body">
                <h3>Supporting documents</h3>
                {files.length ? (
                  <FilePicker files={files} setFiles={setFiles} disabled />
                ) : (
                  <p>
                    {existingSupport
                      ? "Using the supporting documents already saved with this request."
                      : "No supporting document selected for this service."}
                  </p>
                )}
              </div>
            </Panel>
          )}

          {locked && (
            <Notice>
              This request is closed to changes. Return to My requests to view
              its recorded status.
            </Notice>
          )}
          {busy && (
            <div className="processing-notice" role="status">
              <progress aria-label="Document upload progress" value={progress} max={100} />{progress < 100 ? ` Uploading: ${progress}%` : " Upload complete. Checking documents..."}
              <p>Keep this tab open until you see confirmation.</p>
            </div>
          )}
          {error && <ErrorBox message={error} />}
          {retry && (
            <Notice>
              The outcome is unconfirmed. Retry the same request in this tab or
              check My requests before creating another request.
            </Notice>
          )}

          <div className="panel" style={{ overflow: "visible" }}>
            <div
              className="form-actions"
              style={{ borderTop: 0, borderRadius: "var(--radius-lg)" }}
            >
              <div className="step-back-actions">
                {stage > 0 && (
                  <button
                    type="button"
                    className="button secondary"
                    disabled={busy || retry}
                    onClick={() => stage === 1 && selectedService && !id ? navigate("/submit") : setStage(stage - 1)}
                  >
                    <ArrowLeft size={16} />
                    Back
                  </button>
                )}
              </div>
              <button
                className="button primary"
                disabled={
                  busy ||
                  locked ||
                  (!retry &&
                    stage !== 0 &&
                    (!values.authorisation || (address && !addressReady)))
                }
              >
                {busy
                  ? "Checking request..."
                  : retry
                    ? "Retry original request"
                    : stage === 0
                      ? "Continue to your changes"
                      : stage === 1
                        ? "Continue to documents"
                        : !review
                          ? "Continue to review"
                          : id
                            ? "Submit correction"
                            : "Send request"}
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>

        {stage < 2 && (
          <aside className="submission-aside">
            <div className="aside-card">
              <h3 style={{ fontSize: 15 }}>Existing customer profile</h3>
              <dl className="data-list">
                <div>
                  <dt>Customer</dt>
                  <dd>{profile!.name}</dd>
                </div>
                <div>
                  <dt>Customer reference</dt>
                  <dd className="mono">{profile!.customerReference}</dd>
                </div>
                <div>
                  <dt>Synthetic identity</dt>
                  <dd className="mono">{p.identityNumber}</dd>
                </div>
                <div>
                  <dt>Current residential address</dt>
                  <dd>{p.residentialAddress}</dd>
                </div>
                <div>
                  <dt>Current mailing address</dt>
                  <dd>
                    {p.mailingAddress}
                    {p.postalCode ? ` (${p.postalCode})` : ""}
                  </dd>
                </div>
                <div>
                  <dt>Registered contact</dt>
                  <dd>
                    {p.email}
                    <br />
                    {p.mobile}
                  </dd>
                </div>
                <div>
                  <dt>Current tax residency</dt>
                  <dd>{p.taxResidency}</dd>
                </div>
              </dl>
            </div>
            <div className="aside-card">
              <DocumentRequirements
                requestType={values.requestType}
                foreign={foreign}
                reference={profile!.customerReference}
              />
              <p>
                Your request is sent for processing only after required checks
                and approval.
              </p>
            </div>
          </aside>
        )}
      </form>
    </div>
  );
}
