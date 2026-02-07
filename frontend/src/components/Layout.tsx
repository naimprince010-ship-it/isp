import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Layout.css';

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const navByRole: Record<string, { label: string; path: string }[]> = {
    ADMIN: [
      { label: 'Dashboard', path: '/' },
      { label: 'Resellers', path: '/resellers' },
      { label: 'Packages', path: '/packages' },
      { label: 'Clients', path: '/clients' },
      { label: 'New Client Requests', path: '/new-client-requests' },
      { label: 'Schedule Rules', path: '/schedule-rules' },
      { label: 'Billing', path: '/billing' },
      { label: 'Pending Approvals', path: '/pending-approvals' },
      { label: 'MikroTik', path: '/mikrotik' },
      { label: 'BTRC Report', path: '/btrc' },
      { label: 'Upstream (Summit)', path: '/upstream' },
      { label: 'SMS', path: '/sms' },
      { label: 'Reports', path: '/reports' },
      { label: 'Inventory', path: '/inventory' },
      { label: 'Sales & Service', path: '/sales' },
      { label: 'Purchase Management', path: '/purchase' },
      { label: 'Departments', path: '/hr/departments' },
      { label: 'Designations', path: '/hr/designations' },
      { label: 'Employees', path: '/hr/employees' },
      { label: 'Salary', path: '/hr/salary' },
      { label: 'Attendance', path: '/hr/attendance' },
      { label: 'Performance', path: '/hr/performance' },
      { label: 'Tasks', path: '/tasks' },
    ],
    RESELLER: [
      { label: 'Dashboard', path: '/' },
      { label: 'Customers', path: '/customers' },
      { label: 'Bills', path: '/bills' },
      { label: 'Sales & Service', path: '/sales' },
      { label: 'Recharges', path: '/recharges' },
      { label: 'Branding', path: '/branding' },
    ],
    CUSTOMER: [
      { label: 'Dashboard', path: '/' },
      { label: 'My Bills', path: '/bills' },
      { label: 'Pay Bill', path: '/pay' },
      { label: 'Usage', path: '/usage' },
      { label: 'Support', path: '/support' },
      { label: 'Tasks', path: '/tasks' },
    ],
    EMPLOYEE: [
      { label: 'Dashboard', path: '/' },
      { label: 'Tasks', path: '/tasks' },
    ],
  };

  const nav = navByRole[user?.role || ''] || [];

  return (
    <div className="layout">
      <aside className="layout-sidebar">
        <div className="layout-brand">ISP Management</div>
        <nav className="layout-nav">
          {nav.map((n) => (
            <NavLink key={n.path} to={n.path} className={({ isActive }) => 'nav-link' + (isActive ? ' active' : '')}>
              {n.label}
            </NavLink>
          ))}
        </nav>
      </aside>
      <div className="layout-content">
        <header className="layout-header">
          <span className="layout-user">{user?.name} — {user?.role}</span>
          <button type="button" onClick={handleLogout} className="btn-logout">
            Logout
          </button>
        </header>
        <main className="layout-main">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
