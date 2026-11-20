import { FilePlus2, Search } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router-dom";
import { useData } from "../data";
import {
  Empty,
  ErrorBox,
  Loading,
  PageHeader,
  Panel,
  statusLabels,
  Badge,
} from "../components/ui";
import { serviceLabel } from "../lib/service-requests";
import { CancelRequest } from "../components/CancelRequest";

export function History() {
  const { submissions } = useData();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const items = (submissions.data || [])
    .filter(
      (item) =>
        (status === "all" ||
          item.status === status ||
          (status === "RESOLUTION_MANAGEMENT" &&
            item.status === "HUMAN_REVIEW")) &&
        item.caseReference.toLowerCase().includes(query.toLowerCase()),
    )
    .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
  return (
    <div className="page-stack history-workspace">
      <PageHeader
        title="My requests"
        description="Open a request to see its status and next steps."
      >
        <Link className="button primary" to="/submit">
          <FilePlus2 size={17} />
          New request
        </Link>
      </PageHeader>
      <Panel>
        <div className="table-toolbar">
          <label className="search-input">
            <Search size={17} />
            <input
              aria-label="Search submission reference"
              type="search"
              placeholder="Search by reference"
              value={query}
              onChange={(event) => setQuery(event.target.value)}
            />
          </label>
          <select
            aria-label="Filter submissions by status"
            value={status}
            onChange={(event) => setStatus(event.target.value)}
          >
            <option value="all">All statuses</option>
            {Object.entries(statusLabels)
              .filter(([key]) => key !== "HUMAN_REVIEW")
              .map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
          </select>
        </div>
        {submissions.error && (
          <ErrorBox
            message={submissions.error}
            retry={() => void submissions.refresh()}
          />
        )}
        {submissions.loading ? (
          <Loading />
        ) : (
          submissions.data &&
          (items.length ? (
            <div className="request-portfolio">
              {items.map((item) => (
                <article key={item.id} className="request-history-card">
                  <Link
                    className="request-portfolio-row"
                    to={"/submissions/" + item.id}
                  >
                    <div className="portfolio-date">
                      <strong>
                        {new Date(item.createdAt).toLocaleDateString("en-SG", {
                          day: "2-digit",
                          timeZone: "Asia/Singapore",
                        })}
                      </strong>
                      <span>
                        {new Date(item.createdAt).toLocaleDateString("en-SG", {
                          month: "short",
                          timeZone: "Asia/Singapore",
                        })}
                      </span>
                    </div>
                    <div>
                      <h2>{serviceLabel(item.requestType)}</h2>
                      <small className="history-reference">
                        {item.caseReference}
                      </small>
                    </div>
                    <div className="portfolio-status">
                      <Badge status={item.status} />
                    </div>
                  </Link>
                  {item.canCancel && <footer><CancelRequest submission={item} /></footer>}
                </article>
              ))}
            </div>
          ) : (
            <Empty
              title={
                query || status !== "all"
                  ? "No matching requests"
                  : "Your first request starts here"
              }
              description="Create a request or adjust your filters to continue."
            />
          ))
        )}
      </Panel>
    </div>
  );
}
