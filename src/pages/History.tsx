import { ArrowUpDown, FilePlus2, RefreshCw, Search } from "lucide-react";
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
  date,
} from "../components/ui";
import { serviceLabel } from "../lib/service-requests";
import { CancelRequest } from "../components/CancelRequest";

export function History() {
  const { submissions } = useData();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState("all");
  const [sort, setSort] = useState("newest");
  const items = (submissions.data || [])
    .filter(
      (item) =>
        (status === "all" ||
          item.status === status ||
          (status === "RESOLUTION_MANAGEMENT" &&
            ["HUMAN_REVIEW", "ON_HOLD"].includes(item.status))) &&
        item.caseReference.toLowerCase().includes(query.toLowerCase()),
    )
    .sort(
      (a, b) =>
        (sort === "newest" ? -1 : 1) *
        (Date.parse(a.createdAt) - Date.parse(b.createdAt)),
    );
  return (
    <div className="page-stack history-workspace">
      <PageHeader
        eyebrow="YOUR REQUESTS"
        title="My requests"
        description="Track progress, provide corrections or cancel before processing starts."
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
              .filter(([key]) => !["HUMAN_REVIEW", "ON_HOLD"].includes(key))
              .map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
          </select>
          <label className="sort-control">
            <ArrowUpDown size={15} />
            <select
              aria-label="Sort submissions"
              value={sort}
              onChange={(event) => setSort(event.target.value)}
            >
              <option value="newest">Newest first</option>
              <option value="oldest">Oldest first</option>
            </select>
          </label>
          <button
            className="icon-button"
            aria-label="Refresh submissions"
            disabled={submissions.refreshing}
            onClick={() => void submissions.refresh()}
          >
            <RefreshCw size={17} />
          </button>
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
                      <p>
                        {item.status === "CANCELLED"
                          ? "Cancelled by you. No further action is required."
                          : item.status === "CORRECTION_REQUIRED"
                            ? "Review the correction requests to continue."
                            : item.status === "OPERATIONS"
                              ? "Your request is being processed. No action is needed from you."
                              : "View the latest recorded progress."}
                      </p>
                      <small className="history-reference">
                        {item.caseReference}
                      </small>
                    </div>
                    <div className="portfolio-status">
                      <Badge status={item.status} />
                      <small>{date(item.createdAt)}</small>
                    </div>
                  </Link>
                  <footer>
                    <CancelRequest submission={item} />
                    <Link
                      className="text-button"
                      to={"/submissions/" + item.id}
                    >
                      View request
                    </Link>
                  </footer>
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
        <div className="table-bottom">
          {submissions.data ? `${items.length} requests` : "Request history"}
        </div>
      </Panel>
    </div>
  );
}
