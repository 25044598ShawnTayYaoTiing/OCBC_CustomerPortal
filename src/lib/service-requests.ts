export const serviceRequests = [
  { value: "ADDRESS_CHANGE", label: "Mailing-address change" },
  { value: "RESIDENTIAL_ADDRESS_CHANGE", label: "Residential-address change" },
  { value: "ADDITIONAL_ACCOUNT", label: "Additional savings/current account" },
  { value: "CONTACT_UPDATE", label: "Contact-detail update" },
  { value: "TAX_RESIDENCY_UPDATE", label: "Tax-residency update" },
];
export const serviceLabel = (value?: string) =>
  serviceRequests.find((r) => r.value === value)?.label ||
  (value === "ACCOUNT_OPENING"
    ? "Historical account-opening case"
    : "Banking service request");
