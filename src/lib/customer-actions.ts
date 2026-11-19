import type { Correction, Detail } from "../types";
export function customerActions(detail: Detail): Correction[] {
  if (detail.submission.status === "CANCELLED") return [];
  const supportMissing = !detail.documents.some(
    (d) => d.type === "SUPPORTING_DOCUMENT",
  );
  const hasAttachment = detail.corrections.some(
    (r) => r.ruleKey === "ATTACH_SUPPORTING_DOCUMENT",
  );
  const address = ["ADDRESS_CHANGE", "RESIDENTIAL_ADDRESS_CHANGE"].includes(
    detail.submission.requestType || "",
  );
  const kind =
    detail.submission.requestType === "RESIDENTIAL_ADDRESS_CHANGE"
      ? "residential"
      : "mailing";
  const hasSpecificInstruction = (text?: string) =>
    !!text &&
    !/[A-Z]{3,}_[A-Z_]+/.test(text) &&
    text !== "Original instruction" &&
    !text.startsWith("Upload a supporting PDF");
  const attachRule = detail.corrections.find(
    (r) => r.ruleKey === "ATTACH_SUPPORTING_DOCUMENT",
  );
  const serviceSupportRule = detail.corrections.find(
    (r) => r.ruleKey === "SERVICE_SUPPORT",
  );
  const dropServiceSupport =
    supportMissing &&
    hasAttachment &&
    (!hasSpecificInstruction(serviceSupportRule?.instruction) ||
      serviceSupportRule?.instruction === attachRule?.instruction ||
      hasSpecificInstruction(attachRule?.instruction));
  const dropAttachDoc =
    supportMissing &&
    hasAttachment &&
    !dropServiceSupport &&
    hasSpecificInstruction(serviceSupportRule?.instruction) &&
    !hasSpecificInstruction(attachRule?.instruction);
  return detail.corrections
    .filter(
      (r) =>
        !(dropServiceSupport && r.ruleKey === "SERVICE_SUPPORT") &&
        !(dropAttachDoc && r.ruleKey === "ATTACH_SUPPORTING_DOCUMENT"),
    )
    .map((r) => ({
      ...r,
      instruction: hasSpecificInstruction(r.instruction)
        ? r.instruction
        : address &&
            supportMissing &&
            ["ATTACH_SUPPORTING_DOCUMENT", "SERVICE_SUPPORT"].includes(
              r.ruleKey || "",
            )
          ? `Upload a document showing your name and new ${kind} address.`
          : address && r.ruleKey === "SERVICE_SUPPORT"
            ? `Upload a replacement document showing your name and requested ${kind} address.`
            : address && r.ruleKey === "SERVICE_DETAILS"
              ? `Enter a different ${kind} address.`
              : /[A-Z]{3,}_[A-Z_]+/.test(r.instruction)
                ? "Update the requested information or document so we can continue."
                : r.instruction,
    }));
}
export function requestNextStep(status: string, actions: number): string {
  if (status === "CANCELLED")
    return "You cancelled this request. No further processing will take place.";
  if (status === "OPERATIONS")
    return "Your request was sent for processing. No action is needed from you.";
  if (status === "REJECTED")
    return "Your request was not approved. Check the updates below for the decision.";
  if (actions)
    return "We’ll check your update when you send it.";
  if (status === "PENDING_VALIDATION")
    return "We are checking your documents. You can return here for updates.";
  return "Your request is under review. We will let you know if we need anything else.";
}
