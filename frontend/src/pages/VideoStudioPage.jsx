import { useState } from "react";
import { API_BASE, apiFetch } from "../api/client";

export default function VideoStudioPage() {
  const [title, setTitle] = useState("Market Wrap");
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [durationSec, setDurationSec] = useState(90);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSubtitles, setShowSubtitles] = useState(false);
  const [language, setLanguage] = useState("English");

  const generate = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await apiFetch("/video-studio", {
        method: "POST",
        body: JSON.stringify({
          title,
          url,
          text,
          durationSec: Number(durationSec),
          mode: "detailed",
          showSubtitles,
          language
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
          <h2>AI News Video Studio</h2>
          <button onClick={generate} disabled={loading}>{loading ? "Rendering..." : "Generate Video"}</button>
        </div>

        <label>
          Video Title
          <input value={title} onChange={(e) => setTitle(e.target.value)} />
        </label>
        <label>
          Duration (seconds)
          <input type="number" value={durationSec} onChange={(e) => setDurationSec(e.target.value)} />
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
            <div className="video-mock">
              {result.video_url ? (
                <video
                  controls
                  width="100%"
                  src={`${API_BASE}${result.video_url}`}
                  style={{ borderRadius: "12px", background: "#000" }}
                />
              ) : (
                <>
                  <p>▶ Rendered preview unavailable</p>
                  <small>Script is generated, but video URL is missing.</small>
                </>
              )}
            </div>
            <div className="tab-row">
              <button className="chip" onClick={generate}>Re-render</button>
              <button className="chip" disabled>{result.with_audio ? "Audio On" : "Silent"}</button>
              <button className="chip" disabled>{result.video_url ? "Ready" : "Pending"}</button>
            </div>
            {!result.with_audio && result.audio_error ? (
              <p className="error">Audio generation failed: {result.audio_error}</p>
            ) : null}
            <div className="toggle-row">
              <button className={showSubtitles ? "chip chip-active" : "chip"} onClick={() => setShowSubtitles((v) => !v)}>
                Subtitles {showSubtitles ? "On" : "Off"}
              </button>
              <select value={language} onChange={(e) => setLanguage(e.target.value)}>
                <option>English</option>
                <option>Hindi</option>
                <option>Tamil</option>
                <option>Telugu</option>
              </select>
            </div>
            <h3>{result.title}</h3>
            <p><strong>Duration:</strong> {result.duration_sec}s</p>
            <h4>Voiceover Script</h4>
            <p>{result.voiceover_script}</p>
            <h4>Visual Plan</h4>
            <ul>
              {(result.visual_plan || []).map((item, idx) => (
                <li key={idx}>
                  <strong>{item.time}</strong> - {item.scene} ({item.animation})
                </li>
              ))}
            </ul>
            <h4>Overlays</h4>
            <ul>{(result.overlays || []).map((item, idx) => <li key={idx}>{item}</li>)}</ul>
          </div>
        ) : null}
      </article>
    </section>
  );
}
