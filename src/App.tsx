import { BrowserRouter, Link, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider, Protected, useAuth } from './auth';
import { DataProvider } from './data';
import { Layout } from './components/Layout';
import { Empty, Panel } from './components/ui';
import { Login } from './pages/Login';
import { Overview } from './pages/Overview';
import { DigitalForm } from './pages/DigitalForm';
import { Submit } from './pages/Submit';
import { History } from './pages/History';
import { Corrections } from './pages/Corrections';
import { Notifications } from './pages/Notifications';
import { Profile } from './pages/Profile';
import { SubmissionDetail } from './pages/SubmissionDetail';

function Workspace() {
  const { profile } = useAuth();
  return <Protected><DataProvider key={profile?.id}><Layout /></DataProvider></Protected>;
}
export default function App() {
  return <BrowserRouter><AuthProvider><Routes><Route path="/login" element={<Login />} /><Route element={<Workspace />}>
    <Route index element={<Overview />} /><Route path="submit" element={<Submit />} />
    <Route path="submit/digital" element={<DigitalForm />} /><Route path="submissions/:id/form" element={<DigitalForm />} /><Route path="submissions" element={<History />} /><Route path="submissions/:id" element={<SubmissionDetail />} />
    <Route path="corrections" element={<Corrections />} /><Route path="notifications" element={<Notifications />} />
    <Route path="profile" element={<Profile />} /><Route path="account" element={<Navigate to="/profile" replace />} />
    <Route path="*" element={<Panel><Empty title="This page isn't here" description="Go back to your portal overview to continue." action={<Link className="button primary" to="/">Go to overview</Link>} /></Panel>} />
  </Route></Routes></AuthProvider></BrowserRouter>;
}
