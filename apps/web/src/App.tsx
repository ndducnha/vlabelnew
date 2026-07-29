import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from './lib/auth';
import { Spinner } from './components/ui';
import Layout from './components/Layout';
import Login from './pages/Login';
import PublicTrace from './pages/PublicTrace';
import Intro from './pages/Intro';
import Workspace from './pages/Workspace';
import Organizations from './pages/Organizations';
import Products from './pages/Products';
import ProductWizard from './pages/ProductWizard';
import Flows from './pages/Flows';
import Entry from './pages/Entry';
import TraceTasks from './pages/TraceTasks';
import Elabels from './pages/Elabels';
import Users from './pages/Users';

function RequireAuth({ children }: { children: JSX.Element }) {
  const { user, loading } = useAuth();
  const loc = useLocation();
  if (loading) return <Spinner />;
  if (!user) return <Navigate to="/login" state={{ from: loc }} replace />;
  return children;
}

export default function App() {
  return (
    <Routes>
      {/* Public — không cần đăng nhập */}
      <Route path="/t/:gtin" element={<PublicTrace />} />
      <Route path="/login" element={<Login />} />

      {/* Admin — có Layout */}
      <Route element={<RequireAuth><Layout /></RequireAuth>}>
        <Route index element={<Workspace />} />
        <Route path="/intro" element={<Intro />} />
        <Route path="/org" element={<Organizations />} />
        <Route path="/products" element={<Products />} />
        <Route path="/products/new" element={<ProductWizard />} />
        <Route path="/flows" element={<Flows />} />
        <Route path="/entry" element={<Entry />} />
        <Route path="/tasks" element={<TraceTasks />} />
        <Route path="/elabels" element={<Elabels />} />
        <Route path="/users" element={<Users />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
