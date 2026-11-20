import { useEffect, useState } from "react";
import { Link } from 'react-router-dom';
import { useAuth } from '../auth';
import { PageHeader, Panel, Reference } from '../components/ui';
export function Profile() {
  const { profile, refreshProfile } = useAuth();
  const p = profile!.bankingProfile;
  const [refreshError, setRefreshError] = useState(false);
  useEffect(() => {
    let active = true;
    void refreshProfile().then(
      () => { if (active) setRefreshError(false); },
      () => { if (active) setRefreshError(true); },
    );
    return () => { active = false; };
  }, [refreshProfile]);
  return <div className="page-stack"><PageHeader title="Profile" description="Your customer details. Start a request to make a change."/>
    {refreshError && <p role="status">The latest details could not be loaded. The last saved view is shown below.</p>}
    <Panel title={profile!.name}><dl className="data-list form-body"><div><dt>Email</dt><dd>{p?.email || 'Not recorded'}</dd></div><div><dt>Mobile number</dt><dd>{p?.mobile || 'Not recorded'}</dd></div><div><dt>Mailing address on your profile</dt><dd>{p?.mailingAddress || 'Not recorded'}</dd></div><div><dt>Residential address on your profile</dt><dd>{p?.residentialAddress || 'Not recorded'}</dd></div></dl><div className="form-actions"><Link className="button primary" to="/submit/digital?requestType=ADDRESS_CHANGE">Change address</Link><Link className="button secondary" to="/submit/digital?requestType=CONTACT_UPDATE">Change email address</Link></div></Panel>
    <details className="customer-details"><summary>Customer reference and previous address approvals</summary><div className="form-body"><Reference value={profile!.customerReference}/><p><Link to="/addresses">View previous address approvals</Link></p><p>Previous approvals are listed in the address register.</p></div></details>
  </div>;
}
