export function DocumentRequirements({ requestType, foreign = false, reference }: {
  requestType: string;
  foreign?: boolean;
  reference: string;
}) {
  const address = ["ADDRESS_CHANGE", "RESIDENTIAL_ADDRESS_CHANGE"].includes(requestType);
  return <section className="document-requirements" aria-label="Document requirements">
    <h3>{address || foreign ? "What to upload" : "Supporting documents"}</h3>
    {address ? <p>Upload a utility bill, bank statement or other proof showing your new address and customer reference <strong>{reference}</strong>.</p>
      : foreign ? <p>Upload a tax residency certificate or tax authority letter. It must show the country, tax identification number and customer reference <strong>{reference}</strong>.</p>
      : requestType === "TAX_RESIDENCY_UPDATE" ? <p>For Singapore only, you can continue without a document. For other countries, add a tax residency certificate showing the country, tax identification number and customer reference <strong>{reference}</strong>.</p>
      : <p>You can continue without a document. {requestType === "CONTACT_UPDATE" && "After you send the request, you’ll verify your email. Staff will check any new phone number."}</p>}
    <small>PDF, JPG or PNG · Up to 10 MB per file · Up to 10 files</small>
  </section>;
}
