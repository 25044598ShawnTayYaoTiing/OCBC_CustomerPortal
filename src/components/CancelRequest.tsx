import { useEffect, useRef, useState } from "react";
import type { Submission } from "../types";
import { jsonPost } from "../lib/api";
import { useData } from "../data";
import { ErrorBox } from "./ui";

export function CancelRequest({
  submission,
  onCancelled,
}: {
  submission: Submission;
  onCancelled?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [confirmedRevision, setConfirmedRevision] = useState<number | null>(
    null,
  );
  const dialog = useRef<HTMLDialogElement>(null);
  const trigger = useRef<HTMLButtonElement>(null);
  const submitting = useRef(false);
  const { submissions, notifications } = useData();
  useEffect(() => {
    if (!open) return;
    const node = dialog.current;
    node?.showModal();
    node?.querySelector<HTMLButtonElement>("[data-keep]")?.focus();
    return () => {
      node?.close();
      trigger.current?.focus();
    };
  }, [open]);
  if (submission.status === "CANCELLED")
    return (
      <small className="cancellation-note">
        Cancelled. Documents and request history are retained.
      </small>
    );
  async function cancel() {
    if (
      submitting.current ||
      !submission.canCancel ||
      confirmedRevision !== submission.revision
    )
      return;
    submitting.current = true;
    setBusy(true);
    setError("");
    try {
      await jsonPost(
        `/submissions/${encodeURIComponent(submission.id)}/cancel`,
        { expectedRevision: confirmedRevision },
      );
      setOpen(false);
      void submissions.refresh();
      void notifications.refresh();
      onCancelled?.();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Cancellation could not be confirmed. Refresh the request before trying again.",
      );
    } finally {
      submitting.current = false;
      setBusy(false);
    }
  }
  return (
    <div className="cancel-request">
      <button
        ref={trigger}
        type="button"
        className="text-button cancel-request-button"
        disabled={submission.canCancel !== true}
        title={
          submission.cancellationReason ||
          "Refresh to check cancellation availability."
        }
        onClick={() => {
          setError("");
          setConfirmedRevision(submission.revision);
          setOpen(true);
        }}
      >
        Cancel request
      </button>
      {submission.canCancel !== true && (
        <small>
          {submission.cancellationReason ||
            "Cancellation availability could not be confirmed. Refresh the request."}
        </small>
      )}
      {open && (
        <dialog
          ref={dialog}
          className="upload-dialog cancellation-dialog"
          aria-labelledby={`cancel-title-${submission.id}`}
          onCancel={(event) => {
            event.preventDefault();
            if (!busy) setOpen(false);
          }}
        >
          <div className="dialog-content">
            <p className="eyebrow">CONFIRM CANCELLATION</p>
            <h2 id={`cancel-title-${submission.id}`}>
              Cancel this service request?
            </h2>
            <p>
              This stops further processing of this request. Documents and the
              audit history will be retained. To continue later, create a new
              request.
            </p>
            <p>
              Cancellation is only available before the request is sent to
              Operations for processing. The server will check the current stage
              again when you confirm.
            </p>
            <p className="field-hint">
              Request reference: {submission.caseReference}
            </p>
            {error && <ErrorBox message={error} />}
            {(submission.canCancel !== true ||
              confirmedRevision !== submission.revision) && (
              <ErrorBox message="This request changed while you were reviewing it. Close this dialog and refresh its status before deciding." />
            )}
          </div>
          <div className="dialog-actions">
            <button
              data-keep
              type="button"
              className="button secondary"
              disabled={busy}
              onClick={() => setOpen(false)}
            >
              Keep request
            </button>
            <button
              type="button"
              className="button danger"
              disabled={
                busy ||
                submission.canCancel !== true ||
                confirmedRevision !== submission.revision
              }
              onClick={() => void cancel()}
            >
              {busy ? "Cancelling..." : "Confirm cancellation"}
            </button>
          </div>
        </dialog>
      )}
    </div>
  );
}
