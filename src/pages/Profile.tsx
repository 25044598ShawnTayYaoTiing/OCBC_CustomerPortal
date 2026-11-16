import { Link } from 'react-router-dom';
import { useAuth } from '../auth';
import { PageHeader, Panel, Reference } from '../components/ui';
export function Profile() {
  const { profile } = useAuth(); const p = profile!.bankingProfile;
  return <div className="page-stack"><PageHeader title="Profile" description="Your customer details. Start a request to make a change."/>
    <Panel title={profile!.name}><dl className="data-list form-body"><div><dt>Email</dt><dd>{p?.email || 'Not recorded'}</dd></div><div><dt>Mobile number</dt><dd>{p?.mobile || 'Not recorded'}</dd></div><div><dt>Mailing address on your profile</dt><dd>{p?.mailingAddress || 'Not recorded'}</dd></div><div><dt>Residential address on your profile</dt><dd>{p?.residentialAddress || 'Not recorded'}</dd></div></dl><div className="form-actions"><Link className="button primary" to="/submit/digital?requestType=ADDRESS_CHANGE">Change address</Link><Link className="button secondary" to="/submit/digital?requestType=CONTACT_UPDATE">Update contact details</Link></div></Panel>
    <details className="customer-details"><summary>Customer reference and previous address approvals</summary><div className="form-body"><Reference value={profile!.customerReference}/><p><Link to="/addresses">View previous address approvals</Link></p><p>Those separate address approvals are recorded in the address register. Requests sent for processing do not imply that your profile has already changed.</p></div></details>
  </div>;
}
