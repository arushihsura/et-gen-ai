import { useState } from "react";
import { useNavigate, useOutletContext, useSearchParams } from "react-router-dom";
import { apiFetch } from "../api/client";

export default function BriefingPage() {
  const { userId } = useOutletContext();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [url, setUrl] = useState(searchParams.get("url") || "");
  const [mode, setMode] = useState(searchParams.get("mode") || "detailed");
  const [viewMode, setViewMode] = useState("beginner");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");

  const questionChips = ["Should I invest now?", "Is this risky long-term?", "Which sectors benefit?"];

  const generateBriefing = async () => {
    if (!url.trim()) {
      setError("Article URL is required.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      const data = await apiFetch(
        `/summarize?userId=${encodeURIComponent(userId || "guest")}&url=${encodeURIComponent(url)}&mode=${encodeURIComponent(mode)}`
      );
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="panel-grid">
      <article className="panel panel-span">
        <div className="panel-head">
          <h2>Interactive Briefing</h2>
          <button onClick={generateBriefing} disabled={loading}>
            {loading ? "Generating..." : "Generate"}
          </button>
        </div>

        <label>
          Article URL
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://economictimes..." />
        </label>
        <label>
          Mode
          <select value={mode} onChange={(e) => setMode(e.target.value)}>
            <option value="brief">brief</option>
            <option value="detailed">detailed</option>
          </select>
        </label>

        {error ? <p className="error">{error}</p> : null}

        {result ? (
          <div className="result-box">
            <div className={`decision-bar risk-${result.risk_color || "yellow"}`}>
              <strong>Suggested Action: {result.decision?.suggested_action || "WAIT"}</strong>
              <span>Confidence: {result.decision?.confidence || "Medium"}</span>
            </div>

            <div className="toggle-row">
              <button className={viewMode === "beginner" ? "chip chip-active" : "chip"} onClick={() => setViewMode("beginner")}>Beginner Mode</button>
              <button className={viewMode === "expert" ? "chip chip-active" : "chip"} onClick={() => setViewMode("expert")}>Expert Mode</button>
            </div>

            <h3>Key Points</h3>
            <ul>
              {(result.summary?.["Key Points"] || []).map((point, idx) => (
                <li key={idx}>{point}</li>
              ))}
            </ul>
            <h3>Market Impact</h3>
            <p>{result.summary?.["Market Impact"]}</p>
            <h3>Actionable Insight</h3>
            <p>{viewMode === "beginner" ? result.insight : `${result.insight} | Reason: ${result.decision?.reason || "-"}`}</p>
            <h3>Why This Matters</h3>
            <p>{result.relevance}</p>
            <h3>Time Horizon</h3>
            <p><strong>Short:</strong> {result.time_horizon?.short_term || "-"}</p>
            <p><strong>Long:</strong> {result.time_horizon?.long_term || "-"}</p>
            <h3>Risk</h3>
            <p className={`risk-${result.risk_color || "yellow"}`}>{result.summary?.["Risk Level"] || "Medium"}</p>

            <div className="video-bar">
              <button onClick={() => navigate("/video-studio")}>Watch AI Video Summary (60 sec)</button>
            </div>

            <h3>Ask Anything</h3>
            <div className="tab-row">
              {questionChips.map((q) => (
                <button key={q} className="chip" onClick={() => navigate(`/chat?q=${encodeURIComponent(q)}&context=${encodeURIComponent(result.insight || "")}`)}>
                  {q}
                </button>
              ))}
            </div>
          </div>
        ) : null}
      </article>
    </section>
  );
}
