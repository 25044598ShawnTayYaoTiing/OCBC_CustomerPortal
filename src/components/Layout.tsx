import { Bell, ChevronRight, ClipboardPenLine, FilePlus2, Files, LayoutDashboard, LifeBuoy, LogOut, Menu, ShieldCheck, UserRound, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../auth';
import { useData } from '../data';
import { useIntent } from '../lib/upload-intent';
import { Brand, Notice } from './ui';

const nav = [
  { to: '/', label: 'Overview', icon: LayoutDashboard },
  { to: '/submit', label: 'Services', icon: FilePlus2 },
  { to: '/submissions', label: 'My requests', icon: Files },
  { to: '/corrections', label: 'Action inbox', icon: ClipboardPenLine },
  { to: '/notifications', label: 'Notifications', icon: Bell },
  { to: '/profile', label: 'My profile', icon: UserRound },
];
export function Layout() {
  const { profile, logout } = useAuth();
  const { submissions } = useData();
  const [open, setOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const menu = useRef<HTMLDivElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const location = useLocation();
  const pending = useIntent(profile!.id);
  const count = (submissions.data || []).filter(s => ['CORRECTION_REQUIRED', 'HUMAN_REVIEW'].includes(s.status)).length;
  useEffect(() => {
    setOpen(false);
    document.getElementById('main-content')?.focus({ preventScroll: true });
    window.scrollTo({ top: 0, left: 0, behavior: 'instant' });
  }, [location.pathname]);
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const links = menu.current?.querySelectorAll<HTMLElement>('a,button');
    links?.[0]?.focus();
    const key = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setOpen(false); toggle.current?.focus(); }
      if (e.key === 'Tab' && links?.length) {
        const first = links[0], last = links[links.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); }
      }
    };
    window.addEventListener('keydown', key);
    return () => { document.body.style.overflow = previous; window.removeEventListener('keydown', key); };
  }, [open]);
  const section = nav.find(item => item.to !== '/' && location.pathname.startsWith(item.to))?.label || 'Overview';
  const initials = profile!.name.split(' ').slice(0, 2).map(n => n[0]).join('');
  return <div className="app-shell banking-shell">
    <a href="#main-content" className="skip-link">Skip to content</a>
    <header className="topbar banking-header">
      <div className="bank-header-brand">
        <button ref={toggle} className="icon-button menu-toggle" aria-label="Open navigation" aria-expanded={open} onClick={() => setOpen(true)}><Menu size={22} /></button>
        <Link to="/" aria-label="AFI Banking Demo overview"><Brand /></Link>
        <span className="business-division">Resolve <span>Customer services</span></span>
      </div>
      <div className="topbar-right">
        <div className="customer-menu"><span className="avatar">{initials}</span><span><strong>{profile!.name}</strong><small>{profile!.customerReference}</small></span></div>
        <button className="signout-control" aria-label="Sign out" disabled={leaving} onClick={async () => { setLeaving(true); try { await logout(); } finally { setLeaving(false); } }}><LogOut size={17} /><span>Logout</span></button>
      </div>
    </header>
    <nav className="portal-topnav" aria-label="Customer services">{nav.map(item=><NavLink key={item.to} end={item.to==='/'} to={item.to}><item.icon size={17}/>{item.label}{item.to==='/corrections'&&count>0&&<span className="nav-count">{count}</span>}</NavLink>)}</nav>
    {open && <button className="nav-overlay" aria-label="Close navigation" onClick={() => setOpen(false)} />}
    <aside className={`sidebar ${open ? 'is-open' : ''}`} aria-label="Customer navigation"><div ref={menu} className="sidebar-inner">
      <div className="sidebar-brand"><div><p className="nav-label">CUSTOMER WORKSPACE</p><strong>Document services</strong></div><button className="icon-button mobile-close" aria-label="Close menu" onClick={() => { setOpen(false); toggle.current?.focus(); }}><X size={20} /></button></div>
      <nav aria-label="Document navigation">{nav.map(item => <NavLink key={item.to} to={item.to} end={item.to === '/'}><item.icon size={18} /><span>{item.label}</span>{item.to === '/corrections' && count > 0 && <span className="nav-count" aria-label={`${count} applications needing attention`}>{count}</span>}</NavLink>)}</nav>
      <div className="sidebar-bottom"><div className="support-card"><LifeBuoy size={20} /><strong>Need help with a document?</strong><p>Contact your demo administrator for account access or application questions.</p></div></div>
    </div></aside>
    <div className="workspace"><main id="main-content" tabIndex={-1} className="main-content">
      <div className="workspace-context"><div className="breadcrumbs"><Link to="/">Customer portal</Link><ChevronRight size={13} /><strong>{section}</strong></div><span>Singapore &middot; SGT</span></div>
      <div className="demo-disclaimer"><ShieldCheck size={15} /><p><strong>Fictional demonstration.</strong> Use synthetic documents only. AFI Banking Demo is not affiliated with OCBC.</p></div>
      {pending && location.pathname !== pending.returnTo && <Notice><strong>An upload is awaiting confirmation.</strong> <Link to={pending.returnTo}>Return to the upload</Link> to check its result or retry safely.</Notice>}
      <Outlet />
    </main><footer className="app-footer"><span>AFI Banking Demo <span className="footer-separator">|</span> Independent hackathon demonstration</span><span><ShieldCheck size={14} />Synthetic data only &middot; All times in SGT</span></footer></div>
  </div>;
}
