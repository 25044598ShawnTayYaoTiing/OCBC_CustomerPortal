export const serviceRequests = [
  { value: "ADDRESS_CHANGE", label: "Change mailing address", description: "Change where we send your mail." },
  { value: "ADDITIONAL_ACCOUNT", label: "Open another account", description: "Request a savings or current account." },
  { value: "CONTACT_UPDATE", label: "Change email address", description: "Change your registered email address." },
  { value: "TAX_RESIDENCY_UPDATE", label: "Update tax residency", description: "Update where you are registered for tax." },
];
export const serviceLabel = (value?: string) =>
  serviceRequests.find((r) => r.value === value)?.label ||
  (value === "RESIDENTIAL_ADDRESS_CHANGE" ? "Change home address" :
    value === "ACCOUNT_OPENING"
    ? "Account opening"
    : "Banking service request");
