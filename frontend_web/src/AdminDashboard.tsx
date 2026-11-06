type Props = {
  email: string;
  onExit: () => void;
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

export default function AdminDashboard({ email, onExit }: Props) {
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
        <nav className="admin-nav" aria-label="Admin preview navigation">
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
              <strong>Admin access verified.</strong> The report queue below
              uses sample data; review actions are unavailable until the
              backend administration endpoints are implemented.
            </p>
          </div>

          <section id="admin-overview" className="admin-section">
            <div className="admin-page-heading">
              <div>
                <p className="section-label">CAMPUSFIND MANAGEMENT</p>
                <h1>Admin dashboard</h1>
                <p>Overview of campus reports and review activity.</p>
              </div>
              <span className="admin-demo-chip">SAMPLE DATA</span>
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
                <span>Campus members</span>
                <strong>246</strong>
                <small>Sample dashboard data</small>
              </article>
            </div>
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
