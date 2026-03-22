import { useMemo, useState } from "react";
import { useNavigate, useOutletContext } from "react-router-dom";
import { apiFetch } from "../api/client";

const initialProfile = {
  persona: "Mutual fund investor",
  sectors: "banking,it,energy",
  interests: "budget,earnings,valuation",
  portfolioSymbols: "HDFC,TCS",
  riskAppetite: "medium",
  horizon: "long-term"
};

export default function DashboardPage() {
  const { userId } = useOutletContext();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(initialProfile);
  const [feed, setFeed] = useState([]);
  const [activeTab, setActiveTab] = useState("For You");
  const [status, setStatus] = useState("");
  const tabs = ["For You", "Markets", "Startups", "Explainers", "Videos"];

  const onProfileChange = (key, value) => {
    setProfile((prev) => ({ ...prev, [key]: value }));
  };

  const saveProfile = async () => {
    if (!userId.trim()) {
      setStatus("User ID is required.");
      return;
    }

    try {
      setStatus("Saving profile...");
      await apiFetch("/profile", {
        method: "POST",
        body: JSON.stringify({ userId, ...profile })
      });
      setStatus("Profile saved.");
    } catch (error) {
      setStatus(error.message);
    }
  };

  const loadFeed = async () => {
    if (!userId.trim()) {
      setStatus("User ID is required.");
      return;
    }

    try {
      setStatus("Loading personalized feed...");
      const data = await apiFetch(`/my-et?userId=${encodeURIComponent(userId)}`);
      setFeed(data.feed || []);
      setStatus("Feed ready.");
    } catch (error) {
      setStatus(error.message);
    }
  };

  const pulse = useMemo(() => {
    const riskyCount = feed.filter((item) => item.tone === "risky").length;
    if (riskyCount >= 3) {
      return { label: "High Volatility", color: "risk-red", dot: "🔴" };
    }
    if (riskyCount >= 1) {
      return { label: "Mixed Signal", color: "risk-yellow", dot: "🟡" };
    }
    return { label: "Stable", color: "risk-green", dot: "🟢" };
  }, [feed]);

  const filteredFeed = useMemo(() => {
    if (activeTab === "For You") {
      return feed;
    }

    const patterns = {
      Markets: /(market|sensex|nifty|fii|dii|stocks|shares|volatility)/i,
      Startups: /(startup|funding|venture|founder|unicorn)/i,
      Explainers: /(explainer|why|what|how|guide|ratio|analysis)/i,
      Videos: /(video|watch|clip|studio)/i
    };

    const pattern = patterns[activeTab];
    return feed.filter((item) => pattern?.test(item.title));
  }, [activeTab, feed]);

  const cardMeta = (item) => {
    if (item.tone === "risky") {
      return { flag: "HIGH RISK", dot: "🔴", action: "HOLD" };
    }

    if (item.tone === "positive") {
      return { flag: "OPPORTUNITY", dot: "🟡", action: "WATCH" };
    }

    return { flag: "LONG TERM", dot: "🟢", action: "EXPLORE" };
  };

  const openArticleIntelligence = (item) => {
    navigate(`/article?url=${encodeURIComponent(item.url)}&mode=detailed`);
  };

  return (
    <section className="panel-grid">
      <article className="panel panel-span hero-home">
        <p className="welcome">Good Evening, Aru</p>
        <p className={`market-pulse ${pulse.color}`}>
          Market Pulse: {pulse.dot} {pulse.label}
        </p>
      </article>

      <article className="panel">
        <div className="panel-head">
          <h2>Profile Setup</h2>
          <button onClick={saveProfile}>Save Profile</button>
        </div>
        <div className="fields">
          <label>
            Persona
            <input value={profile.persona} onChange={(e) => onProfileChange("persona", e.target.value)} />
          </label>
          <label>
            Sectors
            <input value={profile.sectors} onChange={(e) => onProfileChange("sectors", e.target.value)} />
          </label>
          <label>
            Interests
            <input value={profile.interests} onChange={(e) => onProfileChange("interests", e.target.value)} />
          </label>
          <label>
            Portfolio Symbols
            <input
              value={profile.portfolioSymbols}
              onChange={(e) => onProfileChange("portfolioSymbols", e.target.value)}
            />
          </label>
          <label>
            Risk Appetite
            <select
              value={profile.riskAppetite}
              onChange={(e) => onProfileChange("riskAppetite", e.target.value)}
            >
              <option value="low">low</option>
              <option value="medium">medium</option>
              <option value="high">high</option>
            </select>
          </label>
          <label>
            Horizon
            <select value={profile.horizon} onChange={(e) => onProfileChange("horizon", e.target.value)}>
              <option value="short-term">short-term</option>
              <option value="long-term">long-term</option>
            </select>
          </label>
        </div>
        <p className="status">{status}</p>
      </article>

      <article className="panel panel-span">
        <div className="panel-head">
          <h2>AI Personalized Newsroom</h2>
          <button onClick={loadFeed}>Load Feed</button>
        </div>

        <div className="tab-row">
          {tabs.map((tab) => (
            <button
              key={tab}
              className={`chip ${activeTab === tab ? "chip-active" : ""}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </div>

        <div className="swipe-feed">
          {filteredFeed.map((item) => {
            const meta = cardMeta(item);

            return (
              <button className="feed-item swipe-card" key={item.url} onClick={() => openArticleIntelligence(item)}>
                <p className="risk-line">{meta.dot} {meta.flag}</p>
                <h3>{item.title}</h3>
                <p className="decision-line">→ {meta.action}</p>
                <p className="tiny">→ Affects your: {(item.why_this_is_for_you || []).slice(0, 2).join(" + ")}</p>
              </button>
            );
          })}
        </div>
      </article>
    </section>
  );
}
