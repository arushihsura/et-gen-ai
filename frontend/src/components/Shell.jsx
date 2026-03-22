import { NavLink, Outlet } from "react-router-dom";

const links = [
  { to: "/", label: "Landing" },
  { to: "/home", label: "Newsroom" },
  { to: "/article", label: "Article" },
  { to: "/chat", label: "Chat" },
  { to: "/navigator", label: "Navigator" },
  { to: "/story-arc", label: "Story Arc" },
  { to: "/video-studio", label: "Video" },
  { to: "/vernacular", label: "Vernacular" },
  { to: "/history", label: "History" },
  { to: "/profile", label: "Profile" }
];

export default function Shell({ userId, setUserId }) {
  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand-group">
          <span className="menu-icon">☰</span>
          <div>
            <p className="eyebrow">AI-FIRST BUSINESS NEWS</p>
            <h1>SignalX</h1>
          </div>
        </div>
        <div className="top-actions">
          <span className="top-icon">🔍</span>
          <span className="top-icon">👤</span>
          <label className="user-pill">
            User ID
            <input value={userId} onChange={(e) => setUserId(e.target.value)} placeholder="u1" />
          </label>
        </div>
      </header>

      <nav className="nav">
        {links.map((link) => (
          <NavLink key={link.to} to={link.to} end={link.to === "/"} className="nav-link">
            {link.label}
          </NavLink>
        ))}
      </nav>

      <main className="page-wrap">
        <Outlet context={{ userId, setUserId }} />
      </main>
    </div>
  );
}
