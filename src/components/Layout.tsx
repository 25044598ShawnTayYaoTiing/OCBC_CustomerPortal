import { Bell, ChevronRight, ClipboardPenLine, FilePlus2, Files, LayoutDashboard, LogOut, Menu, ShieldCheck, UserRound, X } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../auth';
import { useData } from '../data';
import { useIntent } from '../lib/upload-intent';
import { Brand, Notice } from './ui';

const nav = [
  { to: '/', label: 'Overview', icon: LayoutDashboard },
  { to: '/submit', label: 'New request', icon: FilePlus2 },
  { to: '/submissions', label: 'My requests', icon: Files },
  { to: '/corrections', label: 'Action inbox', icon: ClipboardPenLine },
  { to: '/notifications', label: 'Notifications', icon: Bell },
  { to: '/profile', label: 'Profile', icon: UserRound },
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

  return (
    <div className="portal-shell">
      <a href="#main-content" className="skip-link">Skip to content</a>
      <header className="portal-header">
        <div className="portal-header-inner">
          <div className="header-left">
            <button ref={toggle} className="icon-button menu-toggle" aria-label="Open navigation" aria-expanded={open} onClick={() => setOpen(true)}>
              <Menu size={20} />
            </button>
            <Link to="/" aria-label="AFI Resolve overview"><Brand /></Link>
            <nav className="portal-nav" aria-label="Customer services">
              {nav.map(item => (
                <NavLink key={item.to} end={item.to === '/'} to={item.to}>
                  <item.icon size={15} />
                  <span>{item.label}</span>
                  {item.to === '/corrections' && count > 0 && <span className="nav-count">{count}</span>}
                </NavLink>
              ))}
            </nav>
          </div>
          <div className="header-right">
            <div className="user-chip">
              <span className="user-avatar">{initials}</span>
              <span className="user-chip-meta">
                <strong>{profile!.name}</strong>
                <small>{profile!.customerReference}</small>
              </span>
            </div>
            <button
              className="signout-btn"
              aria-label="Sign out"
              disabled={leaving}
              onClick={async () => { setLeaving(true); try { await logout(); } finally { setLeaving(false); } }}
            >
              <LogOut size={15} />
              <span>Sign out</span>
            </button>
          </div>
        </div>
      </header>

      {open && <button className="nav-overlay" aria-label="Close navigation" onClick={() => setOpen(false)} />}
      <aside className={`mobile-drawer ${open ? 'is-open' : ''}`} aria-label="Customer navigation" ref={menu}>
        <div className="drawer-header">
          <Brand />
          <button className="icon-button" aria-label="Close menu" onClick={() => { setOpen(false); toggle.current?.focus(); }}>
            <X size={20} />
          </button>
        </div>
        <nav className="drawer-nav" aria-label="Document navigation">
          {nav.map(item => (
            <NavLink key={item.to} to={item.to} end={item.to === '/'}>
              <item.icon size={17} />
              <span>{item.label}</span>
              {item.to === '/corrections' && count > 0 && <span className="nav-count">{count}</span>}
            </NavLink>
          ))}
        </nav>
        <div className="drawer-footer">
          <strong>Synthetic demo</strong>
          <p>Use synthetic records only. Contact your demo administrator for help.</p>
        </div>
      </aside>

      <main id="main-content" tabIndex={-1} className="portal-main">
        <div className="context-bar">
          <div className="breadcrumbs">
            <Link to="/">Customer portal</Link>
            <ChevronRight size={13} />
            <strong>{section}</strong>
          </div>
          <span className="demo-pill">
            <ShieldCheck size={13} />
            Synthetic demonstration · SGT
          </span>
        </div>
        {pending && location.pathname !== pending.returnTo && (
          <div style={{ marginBottom: 20 }}>
            <Notice>
              <strong>An upload is awaiting confirmation.</strong>{' '}
              <Link className="text-link" to={pending.returnTo}>Return to the upload</Link> to check its result or retry safely.
            </Notice>
          </div>
        )}
        <Outlet />
      </main>

      <footer className="portal-footer">
        <div className="portal-footer-inner">
          <span>AFI Resolve · Independent fintech demonstration</span>
          <span>Synthetic customer records only · All times in SGT</span>
        </div>
      </footer>
    </div>
  );
}
