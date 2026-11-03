import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import type { ReactNode } from 'react';
import { api } from './lib/api';
import type { Notification, Submission } from './types';

export function useResource<T>(path: string) {
  const [data, setData] = useState<T>();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const request = useRef<AbortController | null>(null);
  const refresh = useCallback(async () => {
    request.current?.abort();
    const controller = new AbortController(); request.current = controller;
    setRefreshing(true);
    try {
      const value = await api<T>(path, { signal: controller.signal });
      if (!controller.signal.aborted) { setData(value); setError(''); }
    } catch (e) {
      if (!controller.signal.aborted) setError(e instanceof Error ? e.message : 'Unable to load this information.');
    } finally { if (!controller.signal.aborted) { setLoading(false); setRefreshing(false); } }
  }, [path]);
  useEffect(() => {
    setData(undefined); setLoading(true); void refresh();
    const update = () => { if (!document.hidden) void refresh(); };
    const timer = window.setInterval(update, 15000);
    window.addEventListener('focus', update);
    return () => { clearInterval(timer); window.removeEventListener('focus', update); request.current?.abort(); };
  }, [refresh]);
  return { data, loading, refreshing, error, refresh };
}
type Resource<T> = ReturnType<typeof useResource<T>>;
const Context = createContext<{ submissions: Resource<Submission[]>; notifications: Resource<Notification[]> } | null>(null);
export function DataProvider({ children }: { children: ReactNode }) {
  const submissions = useResource<Submission[]>('/submissions');
  const notifications = useResource<Notification[]>('/notifications');
  return <Context.Provider value={{ submissions, notifications }}>{children}</Context.Provider>;
}
export function useData() { const data = useContext(Context); if (!data) throw Error('Portal context missing'); return data; }
