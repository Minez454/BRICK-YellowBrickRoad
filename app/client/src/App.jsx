import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LanguageProvider } from './context/LanguageContext';
import { AgencyProvider } from './context/AgencyContext';
import Navbar from './components/Navbar';
import Home from './pages/Home';
import Login from './pages/Login';
import Register from './pages/Register';
import Assessment from './pages/Assessment';
import ResourceMap from './pages/ResourceMap';
import Agencies from './pages/Agencies';
import AgencyDetail from './pages/AgencyDetail';
import Dashboard from './pages/Dashboard';
import Benefits from './pages/Benefits';
import AgencyPortal from './pages/AgencyPortal';
import PortalDashboard from './pages/PortalDashboard';

function PrivateRoute({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="page-loading">Loading...</div>;
  return user ? children : <Navigate to="/login" />;
}

function AppRoutes() {
  const isPortal = window.location.pathname.startsWith('/portal');
  return (
    <>
      {!isPortal && <Navbar />}
      <main className={isPortal ? '' : 'main-content'}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/map" element={<ResourceMap />} />
          <Route path="/agencies" element={<Agencies />} />
          <Route path="/agencies/:id" element={<AgencyDetail />} />
          <Route path="/benefits" element={<Benefits />} />
          <Route path="/assessment" element={<PrivateRoute><Assessment /></PrivateRoute>} />
          <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
          <Route path="/portal" element={<AgencyPortal />} />
          <Route path="/portal/dashboard" element={<PortalDashboard />} />
        </Routes>
      </main>
    </>
  );
}

export default function App() {
  return (
    <LanguageProvider>
      <AgencyProvider>
        <AuthProvider>
          <BrowserRouter>
            <AppRoutes />
          </BrowserRouter>
        </AuthProvider>
      </AgencyProvider>
    </LanguageProvider>
  );
}
