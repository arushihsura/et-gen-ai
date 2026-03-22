import { useState } from "react";
import { apiFetch } from "../api/client";

export default function VernacularPage() {
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [language, setLanguage] = useState("Hindi");
  const [audience, setAudience] = useState("Retail investor");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const generate = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await apiFetch("/vernacular", {
        method: "POST",
        body: JSON.stringify({ url, text, language, audience, mode: "detailed" })
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
          <h2>Vernacular Business News Engine</h2>
          <button onClick={generate} disabled={loading}>{loading ? "Translating..." : "Generate"}</button>
        </div>

        <p className="tiny">Language Toggle: English | हिंदी | தமிழ் | తెలుగు</p>

        <label>
          Language
          <select value={language} onChange={(e) => setLanguage(e.target.value)}>
            <option>Hindi</option>
            <option>Tamil</option>
            <option>Telugu</option>
            <option>Bengali</option>
          </select>
        </label>

        <label>
          Audience
          <input value={audience} onChange={(e) => setAudience(e.target.value)} />
        </label>

        <label>
          Article URL (optional)
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://economictimes..." />
        </label>

        <label>
          Or paste text
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={6} />
        </label>

        {error ? <p className="error">{error}</p> : null}

        {result ? (
          <div className="result-box">
            <h3>{result.headline_localized}</h3>
            <p>{result.explainer}</p>
            <h4>Key Points</h4>
            <ul>{(result.key_points || []).map((item, idx) => <li key={idx}>{item}</li>)}</ul>
            <h4>Local Context</h4>
            <p>{result.local_context}</p>
            <h4>Why this matters</h4>
            <p>Simplified and culturally adapted for {audience} in {result.language}.</p>
          </div>
        ) : null}
      </article>
    </section>
  );
}
