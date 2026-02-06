import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import AdminDashboard from './pages/AdminDashboard';
import ResellerDashboard from './pages/ResellerDashboard';
import CustomerDashboard from './pages/CustomerDashboard';
import Resellers from './pages/Resellers';
import Packages from './pages/Packages';
import MikroTik from './pages/MikroTik';
import BtrcReport from './pages/BtrcReport';
import SMS from './pages/SMS';
import Reports from './pages/Reports';
import Upstream from './pages/Upstream';
import Inventory from './pages/Inventory';
import Customers from './pages/Customers';
import Bills from './pages/Bills';
import Recharges from './pages/Recharges';
import Branding from './pages/Branding';
import MyBills from './pages/MyBills';
import PayBill from './pages/PayBill';
import PublicPay from './pages/PublicPay';
import Usage from './pages/Usage';
import Support from './pages/Support';

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ padding: '2rem', textAlign: 'center' }}>Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RequireAdmin({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (user?.role !== 'ADMIN') return <Navigate to="/" replace />;
  return <>{children}</>;
}

function RequireReseller({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (user?.role !== 'RESELLER') return <Navigate to="/" replace />;
  return <>{children}</>;
}

function RequireCustomer({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (user?.role !== 'CUSTOMER') return <Navigate to="/" replace />;
  return <>{children}</>;
}

function DashboardByRole() {
  const { user } = useAuth();
  if (user?.role === 'ADMIN') return <AdminDashboard />;
  if (user?.role === 'RESELLER') return <ResellerDashboard />;
  if (user?.role === 'CUSTOMER') return <CustomerDashboard />;
  return <div>Unknown role</div>;
}

function BillsByRole() {
  const { user } = useAuth();
  if (user?.role === 'RESELLER') return <Bills />;
  if (user?.role === 'CUSTOMER') return <MyBills />;
  return <Navigate to="/" replace />;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/pay/:token" element={<PublicPay />} />
          <Route path="/" element={<PrivateRoute><Layout /></PrivateRoute>}>
            <Route index element={<DashboardByRole />} />
            <Route path="resellers" element={<RequireAdmin><Resellers /></RequireAdmin>} />
            <Route path="packages" element={<RequireAdmin><Packages /></RequireAdmin>} />
            <Route path="mikrotik" element={<RequireAdmin><MikroTik /></RequireAdmin>} />
            <Route path="btrc" element={<RequireAdmin><BtrcReport /></RequireAdmin>} />
            <Route path="sms" element={<RequireAdmin><SMS /></RequireAdmin>} />
            <Route path="reports" element={<RequireAdmin><Reports /></RequireAdmin>} />
            <Route path="upstream" element={<RequireAdmin><Upstream /></RequireAdmin>} />
            <Route path="inventory" element={<RequireAdmin><Inventory /></RequireAdmin>} />
            <Route path="customers" element={<RequireReseller><Customers /></RequireReseller>} />
            <Route path="bills" element={<BillsByRole />} />
            <Route path="recharges" element={<RequireReseller><Recharges /></RequireReseller>} />
            <Route path="branding" element={<RequireReseller><Branding /></RequireReseller>} />
            <Route path="pay" element={<RequireCustomer><PayBill /></RequireCustomer>} />
            <Route path="usage" element={<RequireCustomer><Usage /></RequireCustomer>} />
            <Route path="support" element={<RequireCustomer><Support /></RequireCustomer>} />
          </Route>
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
