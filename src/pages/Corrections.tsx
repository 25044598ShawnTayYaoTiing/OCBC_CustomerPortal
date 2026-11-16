import { Link } from 'react-router-dom';
import { useData } from '../data';
import { serviceLabel } from '../lib/service-requests';
import { Empty, ErrorBox, Loading, PageHeader, Panel } from '../components/ui';
export function Corrections(){const {submissions}=useData();const items=(submissions.data||[]).filter(s=>s.status==='CORRECTION_REQUIRED');return <div className="page-stack"><PageHeader title="Action required" description="Open a request to see what to update."/>{submissions.error&&<ErrorBox message={submissions.error}/>}<Panel>{submissions.loading?<Loading/>:items.length?<div className="action-links">{items.map(s=><Link key={s.id} to={`/submissions/${s.id}`}><strong>{serviceLabel(s.requestType)}</strong><span>View action</span></Link>)}</div>:<Empty title="No action needed" description="We will let you know if we need more information."/>}</Panel></div>;}
