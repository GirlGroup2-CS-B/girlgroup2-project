import { FormEvent, useEffect, useMemo, useState } from "react";

import {
  CampusItem,
  ItemType,
  itemRepository,
  NewItem,
} from "../data/itemRepository";
import type { AccountRole } from "../authTypes";

type Props = {
  email: string;
  token: string;
  role: AccountRole;
  onSignOut: () => void;
};

type Page =
  | "dashboard"
  | "lost"
  | "found"
  | "matches"
  | "my-reports"
  | "report-lost"
  | "report-found"
  | "details"
  | "profile";

const categories = [
  "Bags",
  "Documents",
  "Electronics",
  "Clothing",
  "Accessories",
  "Personal items",
  "Other",
];

function formatDate(value: string) {
  return new Date(`${value}T12:00:00`).toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function dateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function ItemCard({
  item,
  onOpen,
}: {
  item: CampusItem;
  onOpen: (item: CampusItem) => void;
}) {
  return (
    <button className="item-card" type="button" onClick={() => onOpen(item)}>
      <span className={`item-art ${item.type}`} aria-hidden="true">
        {item.icon}
      </span>
      <span className="item-card-content">
        <span className="item-card-topline">
          <span className={`item-type ${item.type}`}>
            {item.type === "lost" ? "LOST ITEM" : "FOUND ITEM"}
          </span>
          {item.status === "Possible match" && (
            <span className="match-pill">Possible match</span>
          )}
        </span>
        <strong>{item.name}</strong>
        <span className="item-meta">
          <span aria-hidden="true">⌖</span> {item.location}
        </span>
        <span className="item-meta">
          <span aria-hidden="true">◷</span> {formatDate(item.date)}
        </span>
      </span>
      <span className="item-card-arrow" aria-hidden="true">
        →
      </span>
    </button>
  );
}

function NavigationButton({
  label,
  icon,
  active,
  onClick,
}: {
  label: string;
  icon: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      className={`nav-link ${active ? "active" : ""}`}
      type="button"
      onClick={onClick}
      aria-current={active ? "page" : undefined}
    >
      <span aria-hidden="true">{icon}</span>
      {label}
    </button>
  );
}

export default function CampusApp({ email, token, role, onSignOut }: Props) {
  const [page, setPage] = useState<Page>("dashboard");
  const [items, setItems] = useState<CampusItem[]>([]);
  const [ownReports, setOwnReports] = useState<CampusItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<CampusItem | null>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState("All categories");
  const [notice, setNotice] = useState("");

  useEffect(() => {
    let active = true;
    Promise.all([itemRepository.list(), itemRepository.listMine(token)])
      .then(([listedItems, userItems]) => {
        if (active) {
          setItems(listedItems);
          setOwnReports(userItems);
        }
      })
      .catch((error: unknown) => {
        if (active) {
          setNotice(
            error instanceof Error
              ? error.message
              : "Unable to load reports from the server.",
          );
        }
      });

    return () => {
      active = false;
    };
  }, [token]);

  const publicItems = useMemo(
    () => items.filter((item) => item.reviewStatus === "Approved"),
    [items],
  );
  const activeItems = useMemo(() => {
    const type: ItemType | null =
      page === "lost" ? "lost" : page === "found" ? "found" : null;
    return publicItems.filter((item) => {
      const matchesType = type === null || item.type === type;
      const searchText =
        `${item.name} ${item.category} ${item.location} ${item.description}`.toLowerCase();
      const matchesQuery = searchText.includes(query.trim().toLowerCase());
      const matchesCategory =
        category === "All categories" || item.category === category;
      return matchesType && matchesQuery && matchesCategory;
    });
  }, [category, page, publicItems, query]);

  function openItem(item: CampusItem) {
    setSelectedItem(item);
    setPage("details");
  }

  function navigate(nextPage: Page) {
    setNotice("");
    setQuery("");
    setCategory("All categories");
    setPage(nextPage);
  }

  async function submitReport(
    event: FormEvent<HTMLFormElement>,
    type: ItemType,
  ) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const name = String(form.get("name") ?? "").trim();
    const itemCategory = String(form.get("category") ?? "");
    const location = String(form.get("location") ?? "").trim();
    const date = String(form.get("date") ?? "");
    const description = String(form.get("description") ?? "").trim();

    if (!name || !itemCategory || !location || !date || !description) {
      setNotice("Please complete all required fields.");
      return;
    }

    const newItem: NewItem = {
      type,
      name,
      category: itemCategory,
      location,
      date,
      description,
      icon:
        itemCategory === "Bags"
          ? "🎒"
          : itemCategory === "Documents"
            ? "🪪"
            : itemCategory === "Electronics"
              ? "🎧"
              : itemCategory === "Accessories"
                ? "🧴"
                : "📦",
    };
    try {
      const created = await itemRepository.create(newItem, token);
      setItems((current) => [created, ...current]);
      setOwnReports((current) => [created, ...current]);
      setNotice("Report submitted and saved. It will appear under My Reports.");
      setPage("my-reports");
    } catch (error) {
      setNotice(
        error instanceof Error
          ? error.message
          : "Unable to save your report. Please try again.",
      );
    }
  }

  return (
    <main className="campus-app">
      <aside className="app-sidebar">
        <a
          className="brand app-brand"
          href="#dashboard"
          onClick={(event) => {
            event.preventDefault();
            navigate("dashboard");
          }}
          aria-label="CampusFind dashboard"
        >
          <span className="brand-icon" aria-hidden="true">
            CF
          </span>
          <span className="brand-name">
            Campus<span>Find</span>
          </span>
        </a>
        <div className="sidebar-campus">
          <span className="sidebar-campus-dot" />
          JRMSU Main Campus
        </div>
        <p className="sidebar-label">MENU</p>
        <nav className="sidebar-nav" aria-label="Main navigation">
          <NavigationButton label="Dashboard" icon="⌂" active={page === "dashboard"} onClick={() => navigate("dashboard")} />
          <NavigationButton label="Lost items" icon="⌕" active={page === "lost"} onClick={() => navigate("lost")} />
          <NavigationButton label="Found items" icon="✓" active={page === "found"} onClick={() => navigate("found")} />
          <NavigationButton label="Match alerts" icon="✧" active={page === "matches"} onClick={() => navigate("matches")} />
          <NavigationButton label="My reports" icon="▤" active={page === "my-reports"} onClick={() => navigate("my-reports")} />
          <NavigationButton label="My account" icon="◉" active={page === "profile"} onClick={() => navigate("profile")} />
        </nav>
        <div className="sidebar-help">
          <span className="help-mark" aria-hidden="true">?</span>
          <strong>Need a hand?</strong>
          <p>Every report helps bring a belonging back home.</p>
        </div>
        <div className="sidebar-user">
          <span className="avatar">{email.charAt(0).toUpperCase()}</span>
          <span className="sidebar-user-copy">
            <strong>{email.split("@")[0]}</strong>
            <span>Signed-in account</span>
          </span>
          <button className="icon-button" type="button" onClick={onSignOut} aria-label="Sign out" title="Sign out">↪</button>
        </div>
      </aside>

      <section className="app-main">
        <header className="app-topbar">
          <a
            className="brand app-mobile-brand"
            href="#dashboard"
            onClick={(event) => { event.preventDefault(); navigate("dashboard"); }}
            aria-label="CampusFind dashboard"
          >
            <span className="brand-icon" aria-hidden="true">CF</span>
            <span className="brand-name">Campus<span>Find</span></span>
          </a>
          <div>
            <p className="topbar-campus">JRMSU MAIN CAMPUS</p>
            <p className="topbar-page">
              {page === "dashboard" ? "Your campus, connected"
                : page === "lost" ? "Lost items"
                : page === "found" ? "Found items"
                : page === "matches" ? "Match alerts"
                : page === "my-reports" ? "My reports"
                : page === "profile" ? "My account"
                : page.startsWith("report") ? "Create a report"
                : "Item details"}
            </p>
          </div>
          <button className="topbar-alerts" type="button" onClick={() => navigate("matches")} aria-label="Open match alerts" title="Match alerts">✧</button>
          <form className="global-search" role="search" onSubmit={(event) => { event.preventDefault(); setCategory("All categories"); setPage("lost"); }}>
            <span aria-hidden="true">⌕</span>
            <input aria-label="Search campus items" placeholder="Search campus items..." value={query} onChange={(event) => setQuery(event.target.value)} />
            <button type="submit" aria-label="Search">↵</button>
          </form>
          <button className="topbar-account" type="button" onClick={() => navigate("profile")} aria-label="Open account">
            <span className="avatar">{email.charAt(0).toUpperCase()}</span>
          </button>
        </header>

        <div className="app-content" key={page}>
          {notice && (
            <div className="app-notice" role="status">
              <span aria-hidden="true">✓</span>
              {notice}
              <button type="button" aria-label="Dismiss message" onClick={() => setNotice("")}>×</button>
            </div>
          )}

          {page === "dashboard" && (<Dashboard items={publicItems} onNavigate={navigate} onOpen={openItem} />)}
          {page === "my-reports" && (<MyReportsPage reports={ownReports} onOpen={openItem} />)}
          {(page === "lost" || page === "found") && (
            <ItemListing type={page} items={activeItems} query={query} category={category}
              onQueryChange={setQuery} onCategoryChange={setCategory} onOpen={openItem}
              onReport={() => navigate(`report-${page}`)} />
          )}
          {page === "matches" && (<MatchesPage items={publicItems} onOpen={openItem} />)}
          {(page === "report-lost" || page === "report-found") && (
            <ReportForm type={page === "report-lost" ? "lost" : "found"} onSubmit={submitReport} onCancel={() => navigate("dashboard")} />
          )}
          {page === "details" && selectedItem && (<ItemDetails item={selectedItem} onBack={() => navigate(selectedItem.type)} />)}
          {page === "profile" && (<ProfilePage email={email} role={role} onSignOut={onSignOut} />)}
        </div>
      </section>

      <button className="app-report-fab" type="button" onClick={() => navigate("report-lost")}>
        <span aria-hidden="true">+</span> Report
      </button>

      <nav className="mobile-nav" aria-label="Mobile navigation">
        <NavigationButton label="Home" icon="⌂" active={page === "dashboard"} onClick={() => navigate("dashboard")} />
        <NavigationButton label="Lost" icon="⌕" active={page === "lost"} onClick={() => navigate("lost")} />
        <NavigationButton label="Found" icon="✓" active={page === "found"} onClick={() => navigate("found")} />
        <NavigationButton label="Matches" icon="✧" active={page === "matches"} onClick={() => navigate("matches")} />
        <NavigationButton label="Account" icon="◉" active={page === "profile"} onClick={() => navigate("profile")} />
      </nav>
    </main>
  );
}

function Dashboard({ items, onNavigate, onOpen }: { items: CampusItem[]; onNavigate: (page: Page) => void; onOpen: (item: CampusItem) => void; }) {
  const possibleMatches = items.filter((item) => item.status === "Possible match");
  return (
    <div className="dashboard-page">
      <div className="dashboard-intro">
        <p className="section-label">JRMSU MAIN CAMPUS</p>
        <h1>Your campus, connected</h1>
      </div>
      <section className="dashboard-hero">
        <div className="hero-copy">
          <span className="welcome-badge">A MORE CONNECTED CAMPUS</span>
          <h2>Find what matters.<br /><span>Return what belongs.</span></h2>
          <p>Help a lost belonging find its way back to its owner.</p>
          <div className="hero-actions">
            <button className="primary-button compact" type="button" onClick={() => onNavigate("lost")}>Find an item <span aria-hidden="true">→</span></button>
            <button className="secondary-button" type="button" onClick={() => onNavigate("found")}>Browse found items</button>
          </div>
        </div>
        <div className="hero-illustration" aria-hidden="true">
          <span className="hero-orbit orbit-a" />
          <span className="hero-orbit orbit-b" />
          <span className="hero-bag">🎒</span>
          <span className="hero-sparkle sparkle-a">✦</span>
          <span className="hero-sparkle sparkle-b">✧</span>
          <span className="hero-gold-dot" />
        </div>
      </section>
      <section className="stats-grid" aria-label="Campus overview">
        <div className="stat-card">
          <span className="stat-icon blue" aria-hidden="true">⌕</span>
          <span className="stat-copy"><span>Active reports</span><strong>{items.length}</strong></span>
          <span className="stat-foot">Reported on campus</span>
        </div>
        <div className="stat-card">
          <span className="stat-icon gold" aria-hidden="true">✧</span>
          <span className="stat-copy"><span>Possible matches</span><strong>{possibleMatches.length}</strong></span>
          <span className="stat-foot">Suggestions to review</span>
        </div>
      </section>
      <section className="content-section">
        <div className="section-heading">
          <div><p className="section-label">CAMPUS COMMUNITY</p><h2>Recently reported</h2></div>
          <div className="dashboard-section-actions">
            <button className="text-button" type="button" onClick={() => onNavigate("my-reports")}>My reports</button>
            <button className="text-button" type="button" onClick={() => onNavigate("lost")}>View all <span aria-hidden="true">→</span></button>
          </div>
        </div>
        {items.length ? (
          <div className="dashboard-item-list">
            {items.slice(0, 3).map((item) => (<ItemCard key={item.id} item={item} onOpen={onOpen} />))}
          </div>
        ) : (
          <div className="empty-state">
            <span aria-hidden="true">⌕</span>
            <h2>No items reported yet</h2>
            <p>New campus reports will appear here.</p>
            <button className="secondary-button" type="button" onClick={() => onNavigate("lost")}>Browse lost items</button>
          </div>
        )}
      </section>
      <div className="demo-disclaimer">
        <span aria-hidden="true">ⓘ</span>
        Sample listings and match suggestions are development-only.
      </div>
    </div>
  );
}

function MyReportsPage({ reports, onOpen }: { reports: CampusItem[]; onOpen: (item: CampusItem) => void; }) {
  return (
    <section className="listing-page">
      <div className="page-intro-row">
        <div>
          <p className="section-label">YOUR REPORTS</p>
          <h1>My reports</h1>
          <p className="page-subtitle">Reports you created.</p>
        </div>
      </div>
      {reports.length ? (
        <div className="reports-list">
          {reports.map((report) => (
            <article className="report-row" key={report.id}>
              <ItemCard item={report} onOpen={onOpen} />
              <span className={`report-status ${report.reviewStatus.toLowerCase()}`}>{report.reviewStatus}</span>
            </article>
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <span aria-hidden="true">▤</span>
          <h2>No reports to show</h2>
          <p>Your report history will appear here.</p>
        </div>
      )}
    </section>
  );
}

function ItemListing({ type, items, query, category, onQueryChange, onCategoryChange, onOpen, onReport }: {
  type: ItemType; items: CampusItem[]; query: string; category: string;
  onQueryChange: (value: string) => void; onCategoryChange: (value: string) => void;
  onOpen: (item: CampusItem) => void; onReport: () => void;
}) {
  return (
    <section className="listing-page">
      <div className="page-intro-row">
        <div>
          <p className="section-label">CAMPUS COMMUNITY</p>
          <h1>{type === "lost" ? "Lost items" : "Found items"}</h1>
          <p className="page-subtitle">
            {type === "lost" ? "Browse recent reports and help someone find what they lost." : "See what has been found around campus and help it get home."}
          </p>
        </div>
        <button className="primary-button compact" type="button" onClick={onReport}>+ Report {type}</button>
      </div>
      <div className="filter-toolbar">
        <label className="listing-search">
          <span aria-hidden="true">⌕</span>
          <input aria-label={`Search ${type} items`} placeholder="Search name, location or description" value={query} onChange={(event) => onQueryChange(event.target.value)} />
        </label>
        <label className="category-select">
          <span className="sr-only">Filter by category</span>
          <select value={category} onChange={(event) => onCategoryChange(event.target.value)}>
            <option>All categories</option>
            {categories.map((entry) => (<option key={entry}>{entry}</option>))}
          </select>
        </label>
        <span className="result-count">{items.length} {items.length === 1 ? "item" : "items"}</span>
      </div>
      {items.length ? (
        <div className="item-grid listing-grid">
          {items.map((item) => (<ItemCard key={item.id} item={item} onOpen={onOpen} />))}
        </div>
      ) : (
        <div className="empty-state">
          <span aria-hidden="true">⌕</span>
          <h2>No {type} items found</h2>
          <p>Try a different search or category, or create a new report.</p>
          <button className="secondary-button" type="button" onClick={onReport}>Report {type} item</button>
        </div>
      )}
    </section>
  );
}

function ReportForm({ type, onSubmit, onCancel }: {
  type: ItemType;
  onSubmit: (event: FormEvent<HTMLFormElement>, type: ItemType) => Promise<void>;
  onCancel: () => void;
}) {
  const [photoName, setPhotoName] = useState("");
  const today = dateInputValue(new Date());
  return (
    <section className="report-page">
      <div className="page-intro-row report-intro">
        <div>
          <p className="section-label">HELP YOUR COMMUNITY</p>
          <h1>Report a {type} item</h1>
          <p className="page-subtitle">Share a few details so the right person can recognize it.</p>
        </div>
        <button className="back-button" type="button" onClick={onCancel}>← Back</button>
      </div>
      <form className="report-card" onSubmit={(event) => void onSubmit(event, type)}>
        <div className="form-section-heading">
          <span className="form-step">1</span>
          <div><strong>Item details</strong><span>Fields marked with * are required.</span></div>
        </div>
        <div className="report-form-grid">
          <label className="app-field"><span>Item name *</span><input name="name" required maxLength={80} placeholder="e.g. Navy blue backpack" /></label>
          <label className="app-field"><span>Category *</span>
            <select name="category" required defaultValue="">
              <option value="" disabled>Choose a category</option>
              {categories.map((entry) => (<option key={entry}>{entry}</option>))}
            </select>
          </label>
          <label className="app-field"><span>{type === "lost" ? "Where did you last see it?" : "Where was it found?"} *</span>
            <input name="location" required maxLength={120} placeholder="Building, room or nearby landmark" />
          </label>
          <label className="app-field"><span>{type === "lost" ? "Date lost" : "Date found"} *</span>
            <input name="date" type="date" required max={today} defaultValue={today} />
          </label>
          <label className="app-field wide-field"><span>Description *</span>
            <textarea name="description" required maxLength={500} rows={4} placeholder="Include colors, identifying marks, or other helpful details." />
          </label>
          <label className="app-field wide-field"><span>Photo (optional)</span>
            <span className="file-upload">
              <input type="file" accept="image/*" onChange={(event) => setPhotoName(event.target.files?.[0]?.name ?? "")} />
              <span className="upload-icon" aria-hidden="true">↑</span>
              <strong>{photoName || "Choose an image from your device"}</strong>
              <small>Preview only; uploads are not saved in this demo.</small>
            </span>
          </label>
        </div>
        <div className="report-form-footer">
          <p>Your report will be submitted for review.</p>
          <div className="form-actions">
            <button className="secondary-button" type="button" onClick={onCancel}>Cancel</button>
            <button className="primary-button compact" type="submit">Submit report <span aria-hidden="true">→</span></button>
          </div>
        </div>
      </form>
    </section>
  );
}

function ItemDetails({ item, onBack }: { item: CampusItem; onBack: () => void; }) {
  const [contactMessage, setContactMessage] = useState("");
  return (
    <section className="details-page">
      <button className="back-button" type="button" onClick={onBack}>← Back to {item.type} items</button>
      <div className="details-card">
        <div className={`details-art ${item.type}`} aria-hidden="true">
          <span>{item.icon}</span>
          <span className="details-art-caption">CAMPUSFIND REPORT</span>
        </div>
        <div className="details-content">
          <div className="item-card-topline">
            <span className={`item-type ${item.type}`}>{item.type === "lost" ? "LOST ITEM" : "FOUND ITEM"}</span>
            <span className={`report-status ${item.reviewStatus.toLowerCase()}`}>{item.reviewStatus}</span>
            {item.status === "Possible match" && (<span className="match-pill">Possible match</span>)}
          </div>
          <h1>{item.name}</h1>
          <p className="details-description">{item.description}</p>
          <dl className="details-list">
            <div><dt>Category</dt><dd>{item.category}</dd></div>
            <div><dt>{item.type === "lost" ? "Last seen" : "Found at"}</dt><dd>{item.location}</dd></div>
            <div><dt>Date reported</dt><dd>{formatDate(item.date)}</dd></div>
            <div><dt>Reported by</dt><dd>{item.reporter}</dd></div>
          </dl>
          <button className="primary-button compact" type="button"
            onClick={() => setContactMessage("Contact sharing will be available when the backend is connected.")}>
            I think this is mine <span aria-hidden="true">→</span>
          </button>
          {contactMessage && (<p className="inline-notice" role="status">{contactMessage}</p>)}
          <p className="privacy-hint">Please verify ownership before arranging an item return.</p>
        </div>
      </div>
    </section>
  );
}

function MatchesPage({ items, onOpen }: { items: CampusItem[]; onOpen: (item: CampusItem) => void; }) {
  const possibleMatches = items.filter((item) => item.status === "Possible match");
  return (
    <section className="listing-page matches-page">
      <div className="page-intro-row">
        <div>
          <p className="section-label">A HELPING HAND</p>
          <h1>Possible matches</h1>
          <p className="page-subtitle">Review related reports that may describe the same item.</p>
        </div>
        <span className="match-count-badge">{possibleMatches.length} suggestions</span>
      </div>
      <div className="match-explainer">
        <span aria-hidden="true">✧</span>
        <p>These are sample suggestions for the UI preview. Image-based matching is not connected yet.</p>
      </div>
      {possibleMatches.length ? (
        <div className="item-grid listing-grid">
          {possibleMatches.map((item) => (<ItemCard key={item.id} item={item} onOpen={onOpen} />))}
        </div>
      ) : (
        <div className="empty-state">
          <span aria-hidden="true">✧</span>
          <h2>No possible matches right now</h2>
          <p>We will show related sample reports here.</p>
        </div>
      )}
    </section>
  );
}

function ProfilePage({ email, role, onSignOut }: { email: string; role: AccountRole; onSignOut: () => void; }) {
  return (
    <section className="profile-page">
      <div className="page-intro-row">
        <div>
          <p className="section-label">YOUR CAMPUSFIND ACCOUNT</p>
          <h1>My account</h1>
          <p className="page-subtitle">Manage your session and reports.</p>
        </div>
      </div>
      <div className="profile-card">
        <div className="profile-avatar">{email.charAt(0).toUpperCase()}</div>
        <div className="profile-details">
          <span className="section-label">SIGNED IN AS</span>
          <h2>{email}</h2>
          <span className={`account-role-badge ${role}`}>{role}</span>
          <p>Your account role is assigned by CampusFind and verified when you sign in.</p>
        </div>
        <button className="secondary-button" type="button" onClick={onSignOut}>Sign out</button>
      </div>
      <div className="profile-note">
        <strong>Account capabilities</strong>
        <p>Your reports are saved to the server. Profile editing and admin review are not available yet.</p>
      </div>
    </section>
  );
}
