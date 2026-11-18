export const serviceRequests = [
  { value: "ADDRESS_CHANGE", label: "Change mailing address", description: "Change where we send your mail." },
  { value: "RESIDENTIAL_ADDRESS_CHANGE", label: "Change home address", description: "Update where you live." },
  { value: "ADDITIONAL_ACCOUNT", label: "Open another account", description: "Request a savings or current account." },
  { value: "CONTACT_UPDATE", label: "Update contact details", description: "Change your email or mobile number." },
  { value: "TAX_RESIDENCY_UPDATE", label: "Update tax residency", description: "Update where you are registered for tax." },
];
export const serviceLabel = (value?: string) =>
  serviceRequests.find((r) => r.value === value)?.label ||
  (value === "ACCOUNT_OPENING"
    ? "Account opening"
    : "Banking service request");
