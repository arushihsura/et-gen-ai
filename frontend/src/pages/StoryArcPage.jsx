import { useState } from "react";
import { apiFetch } from "../api/client";

export default function StoryArcPage() {
  const [topic, setTopic] = useState("Oil prices");
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const buildArc = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await apiFetch("/story-arc", {
        method: "POST",
        body: JSON.stringify({ topic })
      });
      setResult(data.arc);
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
          <h2>Story Arc Tracker</h2>
          <button onClick={buildArc} disabled={loading}>{loading ? "Tracking..." : "Build Arc"}</button>
        </div>

        <label>
          Topic
          <input value={topic} onChange={(e) => setTopic(e.target.value)} />
        </label>

        {error ? <p className="error">{error}</p> : null}

        {result ? (
          <div className="result-box">
            <h3>{result.topic}</h3>
            <h4>Timeline</h4>
            <ul className="timeline-list">
              {(result.timeline || []).map((item, idx) => (
                <li key={idx} className="timeline-item">
                  <strong>{item.time_label}:</strong> {item.event} - {item.impact}
                </li>
              ))}
            </ul>
            <h4>Key Players</h4>
            <ul>{(result.key_players || []).map((item, idx) => <li key={idx}>{item}</li>)}</ul>
            <h4>Sentiment Shift</h4>
            <p>{result.sentiment_shift}</p>
            <h4>Contrarian View</h4>
            <ul>{(result.contrarian_views || []).map((item, idx) => <li key={`c-${idx}`}>{item}</li>)}</ul>
            <h4>Predictions</h4>
            <ul>{(result.predictions || []).map((item, idx) => <li key={idx}>{item}</li>)}</ul>
          </div>
        ) : null}
      </article>
    </section>
  );
}
