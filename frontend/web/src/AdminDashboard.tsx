import { useEffect, useMemo, useState } from "react";
import { API_URL } from "./apiConfig";

type Props = {
  email: string;
  token: string;
  onExit: () => void;
};

type ManagedUser = {
  user_id: number | string;
  full_name: string;
  email: string;
  student_id: string;
  role: string;
  authentication_provider: string;
  is_active: boolean;
  created_at: string;
};

type UsersResponse = {
  users?: ManagedUser[];
  error?: string;
};

type AccountStatistics = {
  total_accounts: number | string;
  active_accounts: number | string;
  inactive_accounts: number | string;
  student_accounts: number | string;
  reviewer_accounts: number | string;
  admin_accounts: number | string;
};

type StatisticsResponse = {
  statistics?: AccountStatistics;
  error?: string;
};

const reports = [
  {
    item: "Black wallet",
    type: "Lost item",
    location: "Administration Building",
    date: "Today, 9:42 AM",
  },
  {
    item: "Student ID card",
    type: "Found item",
    location: "University Library",
    date: "Today, 8:16 AM",
  },
  {
    item: "Wireless earbuds",
    type: "Lost item",
    location: "Student Center",
    date: "Yesterday, 4:30 PM",
  },
];

export default function AdminDashboard({ email, token, onExit }: Props) {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [statistics, setStatistics] = useState<AccountStatistics | null>(null);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyUserId, setBusyUserId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function loadUsers() {
    setLoading(true);
    setError("");
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [usersResponse, statisticsResponse] = await Promise.all([
        fetch(`${API_URL}/api/admin/users`, { headers }),
        fetch(`${API_URL}/api/admin/stats`, { headers }),
      ]);
      const [usersResult, statisticsResult] = await Promise.all([
        usersResponse.json() as Promise<UsersResponse>,
        statisticsResponse.json() as Promise<StatisticsResponse>,
      ]);
      if (!usersResponse.ok) {
        throw new Error(usersResult.error || `Unable to load accounts (${usersResponse.status}).`);
      }
      if (!statisticsResponse.ok || !statisticsResult.statistics) {
        throw new Error(statisticsResult.error || `Unable to load account statistics (${statisticsResponse.status}).`);
      }
      setUsers(usersResult.users || []);
      setStatistics(statisticsResult.statistics);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load accounts.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadUsers();
  }, [token]);

  const filteredUsers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) return users;
    return users.filter((user) =>
      [user.full_name, user.email, user.student_id, user.role]
        .some((value) => value.toLowerCase().includes(query)),
    );
  }, [search, users]);

  async function toggleUserStatus(user: ManagedUser) {
    const userId = String(user.user_id);
    setBusyUserId(userId);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`${API_URL}/api/admin/users/${encodeURIComponent(userId)}/status`, {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ is_active: !user.is_active }),
      });
      const result = (await response.json()) as UsersResponse;
      if (!response.ok) {
        throw new Error(result.error || `Unable to update account (${response.status}).`);
      }
      setNotice(`${user.full_name}'s account ${user.is_active ? "deactivated" : "activated"}.`);
      await loadUsers();
    } catch (updateError) {
      setError(updateError instanceof Error ? updateError.message : "Unable to update account.");
    } finally {
      setBusyUserId(null);
    }
  }

  return (
    <main className="admin-preview">
      <aside className="admin-sidebar">
        <a className="brand app-brand" href="#admin-overview">
          <span className="brand-icon" aria-hidden="true">
            CF
          </span>
          <span className="brand-name">
            Campus<span>Find</span>
          </span>
        </a>
        <div className="admin-sidebar-label">ADMIN CONSOLE</div>
        <nav className="admin-nav" aria-label="Admin console navigation">
          <a className="active" href="#admin-overview">
            <span aria-hidden="true">⌂</span> Overview
          </a>
          <a href="#admin-reports">
            <span aria-hidden="true">▤</span> Report queue
          </a>
          <a href="#admin-activity">
            <span aria-hidden="true">◷</span> Recent activity
          </a>
          <a href="#admin-account">
            <span aria-hidden="true">◉</span> My account
          </a>
          <a href="#admin-users">
            <span aria-hidden="true">♙</span> User accounts
          </a>
        </nav>
        <div className="admin-sidebar-footer">
          <span className="admin-preview-avatar">A</span>
          <span>
            <strong>{email}</strong>
            <small>Admin account</small>
          </span>
        </div>
      </aside>

      <section className="admin-main">
        <header className="admin-topbar">
          <div>
            <span>JRMSU MAIN CAMPUS</span>
            <strong>Admin Console</strong>
          </div>
          <button type="button" className="admin-exit-button" onClick={onExit}>
            Back to sign in
          </button>
        </header>

        <div className="admin-content">
          <div className="admin-preview-banner" role="note">
            <span aria-hidden="true">ⓘ</span>
            <p>
              <strong>Admin access verified.</strong> Account management is connected
              to the database. The report queue below still uses sample data.
            </p>
          </div>

          <section id="admin-overview" className="admin-section">
            <div className="admin-page-heading">
              <div>
                <p className="section-label">CAMPUSFIND MANAGEMENT</p>
                <h1>Admin dashboard</h1>
                <p>Overview of campus reports and review activity.</p>
              </div>
              <span className="admin-demo-chip">ACCOUNT DATA LIVE</span>
            </div>

            <div className="admin-stats">
              <article className="admin-stat-card">
                <span className="admin-stat-icon blue" aria-hidden="true">▤</span>
                <span>Reports today</span>
                <strong>12</strong>
                <small>Sample dashboard data</small>
              </article>
              <article className="admin-stat-card">
                <span className="admin-stat-icon gold" aria-hidden="true">◷</span>
                <span>Pending review</span>
                <strong>8</strong>
                <small>Sample dashboard data</small>
              </article>
              <article className="admin-stat-card">
                <span className="admin-stat-icon green" aria-hidden="true">✓</span>
                <span>Resolved this week</span>
                <strong>24</strong>
                <small>Sample dashboard data</small>
              </article>
              <article className="admin-stat-card">
                <span className="admin-stat-icon purple" aria-hidden="true">◉</span>
                <span>Campus accounts</span>
                <strong>{statistics?.total_accounts ?? users.length}</strong>
                <small>Accounts in the database</small>
              </article>
            </div>
          </section>

          <section id="admin-users" className="admin-section admin-users">
            <div className="admin-section-heading">
              <div>
                <p className="section-label">ACCOUNT MANAGEMENT</p>
                <h2>Campus accounts</h2>
              </div>
              <button type="button" className="admin-refresh-button" onClick={() => void loadUsers()} disabled={loading}>
                {loading ? "Loading..." : "Refresh"}
              </button>
            </div>

            <label className="admin-user-search">
              <span className="sr-only">Search accounts</span>
              <input
                type="search"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search name, email, student ID, or role"
              />
            </label>

            {statistics && (
              <div className="admin-stats account-statistics">
                <article className="admin-stat-card">
                  <span>Total accounts</span>
                  <strong>{statistics.total_accounts}</strong>
                </article>
                <article className="admin-stat-card">
                  <span>Active</span>
                  <strong>{statistics.active_accounts}</strong>
                </article>
                <article className="admin-stat-card">
                  <span>Inactive</span>
                  <strong>{statistics.inactive_accounts}</strong>
                </article>
                <article className="admin-stat-card">
                  <span>Students</span>
                  <strong>{statistics.student_accounts}</strong>
                </article>
                <article className="admin-stat-card">
                  <span>Reviewers</span>
                  <strong>{statistics.reviewer_accounts}</strong>
                </article>
                <article className="admin-stat-card">
                  <span>Administrators</span>
                  <strong>{statistics.admin_accounts}</strong>
                </article>
              </div>
            )}

            {error && <p className="admin-feedback error" role="alert">{error}</p>}
            {notice && <p className="admin-feedback success" role="status">{notice}</p>}

            {loading ? (
              <p className="admin-disabled-note">Loading accounts from PostgreSQL...</p>
            ) : filteredUsers.length === 0 ? (
              <p className="admin-disabled-note">
                {users.length === 0 ? "No accounts found." : "No accounts match your search."}
              </p>
            ) : (
              <div className="admin-user-list">
                {filteredUsers.map((user) => {
                  const userId = String(user.user_id);
                  const isAdministrator = user.role === "admin";
                  return (
                    <article className="admin-user-row" key={userId}>
                      <span className="admin-preview-avatar" aria-hidden="true">
                        {user.full_name.charAt(0).toUpperCase()}
                      </span>
                      <div className="admin-user-details">
                        <strong>{user.full_name}</strong>
                        <span>{user.email}</span>
                        <small>{user.student_id} · {user.authentication_provider}</small>
                      </div>
                      <span className={`admin-user-status ${user.is_active ? "active" : "inactive"}`}>
                        {user.is_active ? "Active" : "Inactive"}
                      </span>
                      <span className={`account-role-badge ${isAdministrator ? "admin" : "user"}`}>
                        {isAdministrator ? "Admin" : "Student"}
                      </span>
                      <button
                        type="button"
                        className="admin-user-action"
                        onClick={() => void toggleUserStatus(user)}
                        disabled={isAdministrator || busyUserId === userId}
                        title={isAdministrator ? "Administrator accounts are protected" : undefined}
                      >
                        {busyUserId === userId ? "Saving..." : user.is_active ? "Deactivate" : "Activate"}
                      </button>
                    </article>
                  );
                })}
              </div>
            )}
            <p className="admin-disabled-note">
              Account changes take effect immediately. Administrator accounts are protected from deactivation here.
            </p>
          </section>

          <section id="admin-reports" className="admin-section admin-queue">
            <div className="admin-section-heading">
              <div>
                <p className="section-label">NEEDS ATTENTION</p>
                <h2>Recent report queue</h2>
              </div>
              <span className="admin-queue-count">8 pending</span>
            </div>

            <div className="admin-report-list">
              {reports.map((report) => (
                <article className="admin-report-row" key={report.item}>
                  <span className="admin-report-icon" aria-hidden="true">
                    {report.type === "Lost item" ? "⌕" : "✓"}
                  </span>
                  <div className="admin-report-details">
                    <strong>{report.item}</strong>
                    <span>
                      {report.type} · {report.location}
                    </span>
                    <small>{report.date}</small>
                  </div>
                  <span className="admin-pending-status">Pending</span>
                  <button type="button" disabled title="Preview only">
                    Review
                  </button>
                </article>
              ))}
            </div>
            <p className="admin-disabled-note">
              Report review will be available when verified admin access and
              backend review endpoints are implemented.
            </p>
          </section>

          <section id="admin-activity" className="admin-section admin-activity">
            <div className="admin-section-heading">
              <div>
                <p className="section-label">SYSTEM STATUS</p>
                <h2>Recent activity</h2>
              </div>
            </div>
            <p>
              Activity history is sample content in this UI preview and is not
              connected to campus accounts or reports.
            </p>
          </section>

          <section id="admin-account" className="admin-section admin-account">
            <div className="admin-section-heading">
              <div>
                <p className="section-label">YOUR CAMPUSFIND ACCOUNT</p>
                <h2>My account</h2>
              </div>
            </div>
            <div className="admin-account-card">
              <span className="admin-preview-avatar" aria-hidden="true">
                {email.charAt(0).toUpperCase()}
              </span>
              <div>
                <strong>{email}</strong>
                <span>Signed in with a backend-assigned role</span>
              </div>
              <span className="account-role-badge admin">Admin</span>
            </div>
          </section>
        </div>
      </section>
    </main>
  );
}
