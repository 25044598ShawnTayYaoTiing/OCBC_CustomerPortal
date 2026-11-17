import { serviceLabel } from "../lib/service-requests";
export function DocumentRequirements({
  requestType,
  foreign = false,
  reference,
}: {
  requestType: string;
  foreign?: boolean;
  reference: string;
}) {
  const address = ["ADDRESS_CHANGE", "RESIDENTIAL_ADDRESS_CHANGE"].includes(
    requestType,
  );
  return (
    <section
      className="document-requirements"
      aria-label="Supporting document requirements"
    >
      <h3>{serviceLabel(requestType)}: what to prepare</h3>
      {address ? (
        <>
          <p>
            <strong>Supporting document required.</strong> Provide a readable
            utility bill, bank statement or other address evidence showing the
            requested new{" "}
            {requestType === "RESIDENTIAL_ADDRESS_CHANGE"
              ? "residential"
              : "mailing"}{" "}
            address and your customer reference <strong>{reference}</strong>.
          </p>
          <p>
            These are prototype examples. The contents must match the request;
            choosing a document type alone does not guarantee acceptance. Use
            synthetic documents only.
          </p>
        </>
      ) : requestType === "TAX_RESIDENCY_UPDATE" ? (
        <>
          <p>
            {foreign ? (
              <strong>
                Supporting document required for foreign tax residency.
              </strong>
            ) : (
              "For Singapore-only tax residency, confirm the declaration. No supporting document is required by the current prototype policy."
            )}
          </p>
          <p>
            For foreign or multiple jurisdictions, use a synthetic tax-residency
            certificate or tax-authority document showing the declared country
            or countries, tax identification number (TIN), and customer
            reference <strong>{reference}</strong>. The information must agree
            with your declaration.
          </p>
        </>
      ) : requestType === "CONTACT_UPDATE" ? (
        <p>
          No supporting document is required by the current prototype policy. After
          submission, complete the email OTP check. A new phone number also
          requires independent staff verification; uploading a document does not
          replace either check.
        </p>
      ) : (
        <p>
          No supporting document is required by the current prototype policy. Select
          the account type and currency. For a current account, provide a
          source-of-funds description. Staff must still review and approve the
          request.
        </p>
      )}
      <small>
        PDF, JPG, JPEG, PNG · Up to 10 MB per file · Maximum 10 files. Files must be
        readable, complete and labelled as synthetic demonstration data.
      </small>
    </section>
  );
}
