import {
  ArrowRight,
  CheckCircle2,
  FileText,
  Globe2,
  Mail,
  MapPin,
  ShieldCheck,
} from "lucide-react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth";
import { useData } from "../data";
import { ErrorBox, Loading, Panel, ViewLink } from "../components/ui";
import { NotificationList, SubmissionTable } from "../components/Records";

export function Overview() {
  const { profile } = useAuth();
  const { submissions, notifications } = useData();
  const items = submissions.data || [];
  const attention = items.filter((s) => s.status === "CORRECTION_REQUIRED");
  const pending = items.filter((s) =>
    [
      "DRAFT",
      "PENDING_VALIDATION",
      "RESOLUTION_MANAGEMENT",
      "HUMAN_REVIEW",
    ].includes(s.status),
  );
  const completed = items.filter((s) =>
    ["READY", "OPERATIONS"].includes(s.status),
  );
  const metricVal = (n: number) =>
    submissions.loading || submissions.error ? "—" : n;

  return (
    <div className="page-stack">
      <section className="hero-band">
        <div className="hero-copy">
          <div>
            <p className="eyebrow">Personal Service Desk</p>
            <h1>Welcome back, {profile!.name.split(" ")[0]}.</h1>
            <p style={{ marginTop: 10 }}>
              Submit profile updates, upload supporting evidence, and track
              every verification step in one place.
            </p>
          </div>
          <div className="hero-actions">
            <Link className="button primary" to="/submit">
              Start a service request
              <ArrowRight size={16} />
            </Link>
            <Link className="button secondary" to="/submissions">
              View all requests
            </Link>
          </div>
        </div>

        <aside className="account-ledger" aria-label="Account summary">
          <div className="ledger-top">
            <span>Customer Reference</span>
            <strong className="ledger-ref">{profile!.customerReference}</strong>
          </div>
          <div className="ledger-stats">
            <div>
              <strong>{metricVal(pending.length)}</strong>
              <span>In progress</span>
            </div>
            <div>
              <strong
                style={{ color: attention.length > 0 ? "#FCA5A5" : undefined }}
              >
                {metricVal(attention.length)}
              </strong>
              <span>Need action</span>
            </div>
            <div>
              <strong style={{ color: "#6EE7B7" }}>
                {metricVal(completed.length)}
              </strong>
              <span>Completed</span>
            </div>
          </div>
          <div className="ledger-foot">
            <ShieldCheck size={14} />
            <span>
              Synthetic demonstration profile · Instant prefill enabled
            </span>
          </div>
        </aside>
      </section>

      {submissions.error && (
        <ErrorBox
          message={submissions.error}
          retry={() => void submissions.refresh()}
        />
      )}

      <section aria-label="Banking services">
        <div className="section-header-row" style={{ marginBottom: 14 }}>
          <div>
            <h2>What would you like to update?</h2>
            <p>Choose a service to launch a prefilled digital request.</p>
          </div>
          <ViewLink to="/submit">All submission options</ViewLink>
        </div>
        <div className="service-grid">
          {[
            {
              type: "ADDITIONAL_ACCOUNT",
              title: "Additional account",
              text: "Choose another savings or current account for your existing profile.",
              icon: FileText,
            },
            {
              type: "RESIDENTIAL_ADDRESS_CHANGE",
              title: "Residential address",
              text: "Update your home address with supporting evidence.",
              icon: MapPin,
            },
            {
              type: "ADDRESS_CHANGE",
              title: "Mailing address",
              text: "Update where your statements and cards are delivered. Supporting proof may be requested.",
              icon: MapPin,
            },
            {
              type: "CONTACT_UPDATE",
              title: "Contact details",
              text: "Change your email address or mobile number with built-in OTP verification.",
              icon: Mail,
            },
            {
              type: "TAX_RESIDENCY_UPDATE",
              title: "Tax residency",
              text: "Declare Singapore-only or foreign tax jurisdictions and tax identifiers.",
              icon: Globe2,
            },
          ].map((s) => (
            <Link
              key={s.type}
              className="service-card"
              to={`/submit/digital?requestType=${s.type}`}
            >
              <span className="service-card-icon">
                <s.icon size={20} />
              </span>
              <h3>{s.title}</h3>
              <p>{s.text}</p>
              <span className="service-card-foot">
                Start digital form
                <ArrowRight size={15} />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <div className="overview-split">
        <Panel title="Recent requests" action={<ViewLink to="/submissions" />}>
          {submissions.loading ? (
            <Loading />
          ) : submissions.data ? (
            <SubmissionTable items={items.slice(0, 5)} />
          ) : null}
        </Panel>

        <div className="page-stack" style={{ gap: 20 }}>
          <Panel title="Action inbox" action={<ViewLink to="/corrections" />}>
            {submissions.loading ? (
              <Loading />
            ) : submissions.error ? (
              <div className="form-body">
                <p>Actions are unavailable until requests load.</p>
              </div>
            ) : attention.length ? (
              <div className="action-inbox">
                {attention.map((s) => (
                  <Link key={s.id} to={`/submissions/${s.id}`}>
                    <FileText
                      size={19}
                      style={{ color: "var(--danger-text)", flexShrink: 0 }}
                    />
                    <div style={{ flex: 1 }}>
                      <strong>Correction needed</strong>
                      <small>{s.caseReference}</small>
                    </div>
                    <ArrowRight size={15} />
                  </Link>
                ))}
              </div>
            ) : (
              <div className="inbox-clear">
                <CheckCircle2 size={26} />
                <h3>All caught up</h3>
                <p>Any correction requests will appear here.</p>
              </div>
            )}
          </Panel>

          <Panel
            title="Latest updates"
            action={<ViewLink to="/notifications" />}
          >
            {notifications.error ? (
              <div className="form-body">
                <ErrorBox message={notifications.error} />
              </div>
            ) : notifications.loading ? (
              <Loading />
            ) : (
              <NotificationList
                items={(notifications.data || []).slice(0, 3)}
                compact
              />
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}
