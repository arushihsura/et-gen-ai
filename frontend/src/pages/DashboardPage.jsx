import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, ArrowRight, Circle, Shield, TrendingUp } from "lucide-react";
import { useNavigate, useOutletContext, useSearchParams } from "react-router-dom";
import { apiFetch } from "../api/client";

export default function DashboardPage() {
  const { userId } = useOutletContext();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const query = String(searchParams.get("q") || "").trim().toLowerCase();
  const [feed, setFeed] = useState([]);
  const [activeTab, setActiveTab] = useState("Trending");
  const [status, setStatus] = useState("");
  const [loading, setLoading] = useState(false);
  const tabs = ["Trending", "Markets", "Economy", "Policy", "Earnings"];

  const loadFeed = async () => {
    if (!userId.trim()) {
      setStatus("User ID is required.");
      return;
    }

    try {
      setLoading(true);
      setStatus("Loading personalized feed...");
      const data = await apiFetch(`/my-et?userId=${encodeURIComponent(userId)}&limit=30`);
      setFeed(data.feed || []);
      setStatus("Feed ready.");
    } catch (error) {
      try {
        const fallback = await apiFetch("/news");
        const mapped = (fallback || []).slice(0, 30).map((item) => ({
          ...item,
          score: 1,
          tone: "neutral",
          why_this_is_for_you: ["Create a profile to personalize this feed"]
        }));
        setFeed(mapped);
        setStatus("Showing general trending feed. Save profile for personalization.");
      } catch (nestedError) {
        setStatus(error.message || nestedError.message);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFeed();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    const onProfileUpdated = (event) => {
      const changedUserId = event?.detail?.userId;
      if (!changedUserId || changedUserId === userId) {
        loadFeed();
      }
    };

    window.addEventListener("profile-updated", onProfileUpdated);
    return () => window.removeEventListener("profile-updated", onProfileUpdated);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const pulse = useMemo(() => {
    const riskyCount = feed.filter((item) => item.tone === "risky").length;
    if (riskyCount >= 3) {
      return { label: "High Volatility", color: "risk-red", Icon: AlertTriangle };
    }
    if (riskyCount >= 1) {
      return { label: "Mixed Signal", color: "risk-yellow", Icon: Shield };
    }
    return { label: "Stable", color: "risk-green", Icon: TrendingUp };
  }, [feed]);

  const filteredFeed = useMemo(() => {
    if (activeTab === "Trending") {
      if (!query) {
        return feed;
      }

      return feed.filter((item) => String(item.title || "").toLowerCase().includes(query));
    }

    const patterns = {
      Markets: /(market|sensex|nifty|fii|dii|stocks|shares|volatility)/i,
      Economy: /(economy|gdp|inflation|rbi|fiscal|rupee|budget)/i,
      Policy: /(policy|government|union budget|regulation|tax|bill)/i,
      Earnings: /(profit|earnings|results|quarter|guidance|margin)/i
    };

    const pattern = patterns[activeTab];
    const scoped = feed.filter((item) => pattern?.test(item.title));
    if (!query) {
      return scoped;
    }

    return scoped.filter((item) => String(item.title || "").toLowerCase().includes(query));
  }, [activeTab, feed, query]);

  const cardMeta = (item) => {
    if (item.tone === "risky") {
      return { flag: "HIGH RISK", Icon: AlertTriangle, action: "HOLD", confidence: "Medium", toneClass: "risk-red" };
    }

    if (item.tone === "positive") {
      return { flag: "OPPORTUNITY", Icon: TrendingUp, action: "WATCH", confidence: "High", toneClass: "risk-green" };
    }

    return { flag: "BALANCED", Icon: Circle, action: "REVIEW", confidence: "Medium", toneClass: "risk-yellow" };
  };

  const openArticleIntelligence = async (item) => {
    navigate(`/briefings?url=${encodeURIComponent(item.url)}&title=${encodeURIComponent(item.title)}&mode=detailed`);
  };

  const openStoryArc = (item) => {
    navigate(`/story-arc?topic=${encodeURIComponent(item.title || "Business story")}&url=${encodeURIComponent(item.url || "")}`);
  };

  return (
    <section className="signalx-home">
      <article className="signalx-home-hero">
        <div>
          <p className="signalx-hero-kicker">Trending For You</p>
          <h2>Personalized market intelligence built from your interests</h2>
          <p className="tiny">Click any signal card to open a unified AI briefing with navigator, vernacular, and video actions.</p>
        </div>
        <div className={`signalx-pulse ${pulse.color}`}>
          <pulse.Icon size={16} />
          <strong>{pulse.label}</strong>
        </div>
      </article>

      <article className="panel panel-span signalx-home-feed">
        <div className="panel-head">
          <h2>Trending News Based On Your Profile</h2>
          <button onClick={loadFeed} disabled={loading}>{loading ? "Refreshing..." : "Refresh"}</button>
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

        <div className="signalx-card-grid">
          {filteredFeed.map((item, idx) => {
            const meta = cardMeta(item);
            const why = (item.why_this_is_for_you || []).slice(0, 2).join(" • ") || "General market relevance";

            return (
              <div className="signalx-news-card" key={item.url || idx}>
                {item.image && (
                  <img src={item.image} alt={item.title} className="signalx-news-image" />
                )}
                <div className="signalx-news-content">
                  <p className={`signalx-news-risk ${meta.toneClass}`}>
                    <meta.Icon size={14} style={{ marginRight: 6, verticalAlign: "text-bottom" }} />
                    {meta.flag}
                  </p>
                  <h3>{item.title}</h3>
                  <p className="signalx-news-decision">{meta.action} • {meta.confidence} Confidence</p>
                  <p className="tiny">Affects: {why}</p>
                  <div className="signalx-news-actions">
                    <button className="signalx-open-briefing" onClick={() => openArticleIntelligence(item)}>
                      Open AI Briefing
                    </button>
                    <button className="signalx-open-briefing" onClick={() => openStoryArc(item)}>
                      View Story Arc <ArrowRight size={14} style={{ marginLeft: 6 }} />
                    </button>
                    <a 
                      href={item.url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="signalx-open-original"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Read Article <ArrowRight size={14} style={{ marginLeft: 6 }} />
                    </a>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        {status ? <p className="status">{status}</p> : null}
      </article>
    </section>
  );
}
