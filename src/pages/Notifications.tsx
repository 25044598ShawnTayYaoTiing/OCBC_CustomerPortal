import { RefreshCw } from 'lucide-react';
import { useData } from '../data';
import { NotificationList } from '../components/Records';
import { ErrorBox, Loading, PageHeader, Panel } from '../components/ui';
export function Notifications(){const {notifications}=useData();return <div className="page-stack"><PageHeader title="Updates" description="Messages about your requests."><button className="button secondary" disabled={notifications.refreshing} onClick={()=>void notifications.refresh()}><RefreshCw size={16}/>Refresh</button></PageHeader><Panel>{notifications.error?<ErrorBox message={notifications.error} retry={()=>void notifications.refresh()}/>:notifications.loading?<Loading/>:<NotificationList items={notifications.data||[]}/>}</Panel></div>;}
