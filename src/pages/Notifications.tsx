import { Bell, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { useData } from '../data';
import { Empty, ErrorBox, Loading, PageHeader, Panel } from '../components/ui';
import { NotificationList } from '../components/Records';

export function Notifications() {
  const { notifications } = useData(); const [type, setType] = useState('all');
  const items = (notifications.data || []).filter(n => type === 'all' || n.type === type);
  return <div className="page-stack"><PageHeader eyebrow="STAY IN THE KNOW" title="Notifications" description="Your document updates, kept together in one place."><button className="button secondary" disabled={notifications.refreshing} onClick={() => void notifications.refresh()}><RefreshCw size={16} className={notifications.refreshing ? 'spin' : ''} />Refresh</button></PageHeader><Panel><div className="table-toolbar"><div className="toolbar-label"><Bell size={18} /><strong>Application inbox</strong></div><select aria-label="Filter notifications" value={type} onChange={e => setType(e.target.value)}><option value="all">All updates</option><option value="CORRECTION_REQUIRED">Correction requests</option><option value="OPERATIONS_READY">With Operations</option><option value="SUBMISSION_RECEIVED">Submissions received</option><option value="CORRECTION_RECEIVED">Corrections received</option><option value="VALIDATION_COMPLETED">Checks completed</option></select></div>{notifications.error && <ErrorBox message={notifications.error} retry={() => void notifications.refresh()} />}{notifications.loading ? <Loading /> : items.length ? <NotificationList items={items} /> : <Empty title="No updates to show" description="Your recorded document and application updates will appear here." />}<div className="table-bottom"><span>Latest {notifications.data?.length || 0} recorded notifications</span><span>Portal inbox - No email sent</span></div></Panel><p className="page-note">Read and unread tracking is not available. This inbox shows the notifications recorded by the service.</p></div>;
}
