import { createContext, useContext, useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { api, ApiError, expireSession, jsonPost, onExpired, setSession } from './lib/api';
import { clearUploadMemory } from './lib/upload-intent';
import type { Profile, Session } from './types';

interface Auth {
  profile: Profile | null; expiresAt: string; reason: string;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}
const Context = createContext<Auth | null>(null);
export function AuthProvider({ children }: { children: ReactNode }) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [expiresAt, setExpiresAt] = useState('');
  const [reason, setReason] = useState('');
  useEffect(() => onExpired(() => {
    setProfile(null); setExpiresAt(''); setReason('Your session ended. Sign in again to continue.'); clearUploadMemory();
  }), []);
  useEffect(() => {
    if (!expiresAt) return;
    const check = () => { if (Date.now() >= Date.parse(expiresAt)) expireSession(); };
    const timer = window.setTimeout(check, Math.max(0, Date.parse(expiresAt) - Date.now()));
    window.addEventListener('focus', check);
    return () => { clearTimeout(timer); window.removeEventListener('focus', check); };
  }, [expiresAt]);
  const login = async (username: string, password: string) => {
    const session = await jsonPost<Session>('/auth/token', { username, password }, true);
    if (typeof session.accessToken !== 'string' || session.tokenType !== 'Bearer' || !Number.isFinite(Date.parse(session.expiresAt)) || Date.parse(session.expiresAt) <= Date.now())
      throw new ApiError(502, 'The server returned an invalid session. Please contact your demo administrator.');
    setSession(session);
    try {
      const customer = await api<Profile>('/me');
      if (!customer.id || !customer.name) throw new ApiError(502, 'Your profile could not be loaded. Please try signing in again.');
      setProfile(customer); setExpiresAt(session.expiresAt); setReason('');
    } catch (error) { setSession(null); throw error; }
  };
  const logout = async () => {
    let revoked = true;
    try { await api<void>('/auth/logout', { method: 'POST', timeout: 10000 }); }
    catch { revoked = false; }
    finally { setSession(null); setProfile(null); setExpiresAt(''); setReason(revoked ? 'You have signed out.' : 'Signed out of this browser. The service could not confirm revocation; the server session will expire automatically.'); clearUploadMemory(); }
  };
  return <Context.Provider value={{ profile, expiresAt, reason, login, logout }}>{children}</Context.Provider>;
}
export function useAuth() { const value = useContext(Context); if (!value) throw Error('Authentication context missing'); return value; }
export function Protected({ children }: { children: ReactNode }) {
  const { profile } = useAuth(); const location = useLocation();
  return profile ? children : <Navigate to="/login" replace state={{ from: location.pathname }} />;
}
