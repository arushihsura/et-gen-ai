import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { apiFetch } from "../api/client";

export default function NavigatorPage() {
  const { userId } = useOutletContext();
  const [topic, setTopic] = useState("Union Budget");
  const [urls, setUrls] = useState("");
  const [mode, setMode] = useState("detailed");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    try {
      setLoading(true);
      setError("");
      const urlList = urls
        .split("\n")
        .map((u) => u.trim())
        .filter(Boolean);

      const data = await apiFetch("/navigator", {
        method: "POST",
        body: JSON.stringify({
          userId,
          topic,
          urls: urlList,
          mode
        })
      });

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
          <h2>News Navigator</h2>
          <button onClick={generate} disabled={loading}>{loading ? "Synthesizing..." : "Build Briefing"}</button>
        </div>

        <label>
          Topic
          <input value={topic} onChange={(e) => setTopic(e.target.value)} />
        </label>
        <label>
          Optional URLs (one per line)
          <textarea value={urls} onChange={(e) => setUrls(e.target.value)} rows={5} />
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
            <h3>{result.briefing?.topic}</h3>
            <h4>Summary</h4>
            <p>{result.briefing?.executive_summary}</p>
            <h4>Sector Impact</h4>
            <ul>
              {(result.briefing?.key_developments || []).slice(0, 3).map((item, idx) => <li key={`sector-${idx}`}>{item}</li>)}
            </ul>
            <h4>Winners & Losers</h4>
            <p><strong>Winners:</strong> {(result.briefing?.watch_next || []).slice(0, 2).join(", ") || "Not enough data"}</p>
            <p><strong>Losers:</strong> {(result.briefing?.key_developments || []).slice(0, 2).join(", ") || "Not enough data"}</p>
            <h4>Timeline</h4>
            <ul>
              {(result.briefing?.key_developments || []).map((item, idx) => <li key={idx}>{item}</li>)}
            </ul>
            <h4>What to Watch Next</h4>
            <ul>
              {(result.briefing?.watch_next || []).map((item, idx) => <li key={`watch-${idx}`}>{item}</li>)}
            </ul>
            <h4>Ask Questions</h4>
            <div className="tab-row">
              {(result.briefing?.follow_up_questions || []).map((item, idx) => <button className="chip" key={`q-${idx}`}>{item}</button>)}
            </div>
            <h4>Decision</h4>
            <p>
              {result.briefing?.decisions?.suggested_action} ({result.briefing?.decisions?.confidence}) - {result.briefing?.decisions?.reason}
            </p>
          </div>
        ) : null}
      </article>
    </section>
  );
}
