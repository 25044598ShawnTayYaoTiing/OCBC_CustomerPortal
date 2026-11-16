import { AddressFields } from '../components/AddressFields';
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
import { api } from "../lib/api";
import { serviceLabel, serviceRequests } from "../lib/service-requests";
import type { Detail, DigitalValues } from "../types";
import { ErrorBox, Loading, Notice, PageHeader, Panel } from "../components/ui";
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
  const [query] = useSearchParams();
  const [stage, setStage] = useState(id ? 1 : 0);
  const { profile } = useAuth();
  const navigate = useNavigate();
  const { submissions, notifications } = useData();
  const p = profile?.bankingProfile;
  const pending = useIntent(profile!.id);

  const [values, setValues] = useState<DigitalValues>(() => ({
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
  }));

  const [addressReady, setAddressReady] = useState(!!id);
  const [review, setReview] = useState(false);
  const [loading, setLoading] = useState(!!id);
  const [loaded, setLoaded] = useState(!id);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [locked, setLocked] = useState(false);
  const [retry, setRetry] = useState(false);
  const intent = useRef<{ key: string; body: string } | null>(null);

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
            ...form.values,
            authorisation: false,
            expectedRevision: detail.submission.revision,
          });
          setLocked(detail.submission.status === "OPERATIONS");
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

  async function submit() {
    setBusy(true);
    setError("");
    if (!intent.current) {
      intent.current = {
        key: crypto.randomUUID(),
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
    try {
      const result = await api<Detail>(
        id ? `/submissions/${encodeURIComponent(id)}/eform` : "/eforms",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": intent.current.key,
          },
          body: intent.current.body,
          timeout: 600000,
        },
      );
      intent.current = null;
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
      if (!uncertain) intent.current = null;
      setRetry(uncertain);
      setError(
        e instanceof Error ? e.message : "Unable to confirm this request.",
      );
    } finally {
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
        Confirm your pending PDF upload first.{" "}
        <Link className="text-link" to={pending.returnTo}>
          Resume upload
        </Link>
      </Notice>
    );
  }

  return (
    <div className="page-stack">
      <div>
        <Link className="text-link" to={id ? `/submissions/${id}` : "/submit"}>
          <ArrowLeft size={15} /> Back
        </Link>
      </div>
      <PageHeader
        eyebrow="Guided Digital Request"
        title={
          id
            ? "Correct your service request"
            : "Submit a banking service request"
        }
        description="Prefilled from your synthetic customer profile. Only fields relevant to your selected service are requested."
      />

      <ol className="form-progress" aria-label="Request progress">
        <li aria-current={stage === 0 ? "step" : undefined}>
          <span>{stage > 0 || review ? <Check size={14} /> : "01"}</span>
          <strong>Choose service</strong>
        </li>
        <li aria-current={!review && stage === 1 ? "step" : undefined}>
          <span>{review ? <Check size={14} /> : "02"}</span>
          <strong>Your changes</strong>
        </li>
        <li aria-current={review ? "step" : undefined}>
          <span>03</span>
          <strong>Review &amp; send</strong>
        </li>
      </ol>

      <form
        className="eform-layout"
        onSubmit={(e) => {
          e.preventDefault();
          if (stage === 0 && !retry) {
            setStage(1);
            return;
          }
          if (!review && !retry) {
            if (address && !addressReady) { setError("Find your new address or enter it for manual review."); return; }
            setReview(true);
            return;
          }
          void submit();
        }}
      >
        <div className="page-stack" style={{ gap: 20 }}>
          <div hidden={stage !== 0 || review}>
            <Panel
              title="Select banking service"
              description="Your existing profile details are already on hand."
            >
              <div className="eform-fields">
                <label className="full-width">
                  Request type
                  <select
                    aria-label="Request type"
                    value={values.requestType}
                    disabled={!!id}
                    onChange={(e) => { update("requestType", e.target.value); setAddressReady(false); }}
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
            hidden={review || stage === 0}
            disabled={busy || locked || retry || review || stage === 0}
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
                <AddressFields key={values.requestType} existing={!!id} value={values.mailingAddress} onChange={value => update('mailingAddress',value)} onReady={setAddressReady}/>
              </Panel>
            )}

            {additionalAccount && (
              <Panel
                title="Additional account preferences"
                description="Project demo policy requires a source-of-funds description for current-account requests."
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
                description="Change your email, phone number, or both. No tax or address declaration is required."
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
                    ownership still requires independent staff
                    verification.
                  </Notice>
                </div>
              </Panel>
            )}

            {tax && (
              <Panel
                title="Tax-residency declaration"
                description="Declare your synthetic tax jurisdictions."
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

            <Panel title="Customer declaration and authorisation">
              <div className="eform-fields">
                <p className="full-width">The declaration time is recorded automatically when you submit.</p>
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

          {review && (
            <Panel
              title="Review your service request"
              description="Check the details below before sending."
            >
              <dl className="review-summary">
                <div>
                  <dt>Service</dt>
                  <dd>{serviceLabel(values.requestType)}</dd>
                </div>
                <div>
                  <dt>Customer reference</dt>
                  <dd className="mono">{profile!.customerReference}</dd>
                </div>
                {address && <div><dt>Current address on your profile</dt><dd>{values.requestType === "RESIDENTIAL_ADDRESS_CHANGE" ? p.residentialAddress : p.mailingAddress}</dd></div>}
                {address && (
                  <div>
                    <dt>{values.requestType === "RESIDENTIAL_ADDRESS_CHANGE" ? "New residential address" : "New mailing address"}</dt>
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
                <div>
                  <dt>Declaration timestamp</dt>
                  <dd>Recorded automatically on submission</dd>
                </div>
                <div>
                  <dt>Authorisation</dt>
                  <dd>
                    {values.authorisation ? "Confirmed" : "Not confirmed"}
                  </dd>
                </div>
              </dl>
              <div className="form-actions">
                <button
                  type="button"
                  className="button secondary"
                  disabled={busy || retry}
                  onClick={() => setReview(false)}
                >
                  Edit details
                </button>
              </div>
            </Panel>
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
                {stage === 1 && !review && (
                  <button
                    type="button"
                    className="button secondary"
                    disabled={busy || retry || !!id}
                    onClick={() => setStage(0)}
                  >
                    Change service
                  </button>
                )}
                <Link className="text-link" to="/submissions">
                  My requests
                </Link>
              </div>
              <button
                className="button primary"
                disabled={
                  busy ||
                  locked ||
                  (!retry && stage !== 0 && (!values.authorisation || (address && !addressReady)))
                }
              >
                {busy
                  ? "Checking request..."
                  : retry
                    ? "Retry original request"
                    : stage === 0
                      ? "Continue to your changes"
                      : !review
                        ? "Review request"
                        : id
                          ? "Submit correction"
                          : "Submit service request"}
                <ArrowRight size={16} />
              </button>
            </div>
          </div>
        </div>

        <aside className="submission-aside"><div className="aside-card"><h2>What happens next</h2><p>We check your request and any documents. If something needs updating, you?ll see one clear action in My requests.</p>{address && <p>You?ll need one supporting PDF showing the new address and your customer reference.</p>}<p>Your request is sent for processing only after the required checks and approval.</p></div></aside>
      </form>
    </div>
  );
}
