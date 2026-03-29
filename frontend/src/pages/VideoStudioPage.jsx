import { useEffect, useMemo, useState } from "react";
import { PlayCircle } from "lucide-react";
import { useOutletContext } from "react-router-dom";
import { API_BASE, apiFetch } from "../api/client";

const toSceneType = (text = "", idx = 0) => {
  const probe = String(text).toLowerCase();
  if (idx === 0 || /hook|headline|breaking/.test(probe)) {
    return "headline";
  }
  if (/risk|hold|buy|avoid|decision|action/.test(probe)) {
    return "decision";
  }
  if (/context|why|cause|because|tension|policy/.test(probe)) {
    return "context";
  }
  return "insight";
};

const toCaption = (value = "") => {
  const clean = String(value).replace(/\s+/g, " ").trim();
  if (!clean) {
    return "Market update";
  }

  const firstPart = clean.split(/[.!?]/)[0] || clean;
  return firstPart.length > 82 ? `${firstPart.slice(0, 79)}...` : firstPart;
};

const parseTimeToMs = (value = "", fallbackMs = 3200) => {
  const match = String(value).match(/(\d+)\s*-\s*(\d+)\s*s/i);
  if (!match) {
    return fallbackMs;
  }

  const start = Number.parseInt(match[1], 10);
  const end = Number.parseInt(match[2], 10);
  if (Number.isNaN(start) || Number.isNaN(end) || end <= start) {
    return fallbackMs;
  }

  return (end - start) * 1000;
};

const getRiskOverlay = (result) => {
  const pool = [
    ...(Array.isArray(result?.overlays) ? result.overlays : []),
    result?.closing_line || ""
  ].join(" ").toLowerCase();

  if (/high risk|volatile|avoid|red/.test(pool)) {
    return { label: "HIGH RISK", tone: "high" };
  }
  if (/low risk|stable|safe|green/.test(pool)) {
    return { label: "LOW RISK", tone: "low" };
  }
  return { label: "MEDIUM RISK", tone: "medium" };
};

export default function VideoStudioPage() {
  const { language: appLanguage } = useOutletContext();
  const [title, setTitle] = useState("Market Wrap");
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [durationSec, setDurationSec] = useState(90);
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showSubtitles, setShowSubtitles] = useState(false);
  const [language, setLanguage] = useState(appLanguage || "English");
  const [renderEngine, setRenderEngine] = useState("storyboard");
  const [sceneIndex, setSceneIndex] = useState(0);
  const [playingBrief, setPlayingBrief] = useState(false);
  const [elapsedLiveMs, setElapsedLiveMs] = useState(0);

  const scenes = useMemo(() => {
    if (Array.isArray(result?.scenes) && result.scenes.length > 0) {
      return result.scenes.map((scene, idx) => ({
        type: scene.type || toSceneType(scene.text || "", idx),
        caption: toCaption(scene.text || "Market update"),
        context: toCaption(scene.context || ""),
        timeMs: Math.max(1000, Number(scene.durationSec || 3) * 1000)
      }));
    }

    if (!result?.visual_plan?.length) {
      return [];
    }

    return result.visual_plan.map((item, idx) => {
      const combined = `${item.scene || "Market update"}${item.animation ? ` ${item.animation}` : ""}`.trim();
      return {
        type: toSceneType(combined, idx),
        caption: toCaption(item.scene || combined),
        context: toCaption(item.animation || ""),
        timeMs: parseTimeToMs(item.time, 3200)
      };
    });
  }, [result]);

  const totalMs = useMemo(() => scenes.reduce((sum, scene) => sum + scene.timeMs, 0), [scenes]);
  const elapsedMs = useMemo(() => {
    let elapsed = 0;
    for (let i = 0; i < sceneIndex; i += 1) {
      elapsed += scenes[i]?.timeMs || 0;
    }
    return elapsed;
  }, [sceneIndex, scenes]);
  const currentScene = scenes[sceneIndex] || null;
  const riskOverlay = useMemo(() => getRiskOverlay(result), [result]);

  const speakText = (value) => {
    if (typeof window === "undefined" || !window.speechSynthesis || !value) {
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new window.SpeechSynthesisUtterance(value);
    const localeMap = {
      english: "en-IN",
      hindi: "hi-IN",
      tamil: "ta-IN",
      telugu: "te-IN"
    };
    utterance.lang = localeMap[String(language || "english").toLowerCase()] || "en-IN";
    utterance.rate = 1;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
  };

  useEffect(() => {
    if (!playingBrief || scenes.length === 0) {
      return undefined;
    }

    const timers = [];
    let elapsed = 0;
    scenes.forEach((scene, idx) => {
      timers.push(setTimeout(() => setSceneIndex(idx), elapsed));
      elapsed += scene.timeMs;
    });
    timers.push(setTimeout(() => {
      setPlayingBrief(false);
    }, elapsed));

    return () => timers.forEach((timer) => clearTimeout(timer));
  }, [playingBrief, scenes]);

  useEffect(() => {
    if (!playingBrief || totalMs <= 0) {
      return undefined;
    }

    const startedAt = Date.now();
    setElapsedLiveMs(0);
    const ticker = setInterval(() => {
      const elapsed = Math.min(Date.now() - startedAt, totalMs);
      setElapsedLiveMs(elapsed);
    }, 120);

    return () => clearInterval(ticker);
  }, [playingBrief, totalMs]);

  useEffect(() => {
    if (!playingBrief || scenes.length === 0) {
      return;
    }

    const narrationLine = currentScene?.caption || "";
    speakText(narrationLine);
  }, [sceneIndex, scenes, currentScene, playingBrief, language]);

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && window.speechSynthesis) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  useEffect(() => {
    if (appLanguage) {
      setLanguage(appLanguage);
    }
  }, [appLanguage]);

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
          language,
          renderEngine
        })
      });
      setResult(data);
      setSceneIndex(0);
      setPlayingBrief(false);
      setElapsedLiveMs(0);
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
        <label>
          Rendering Mode
          <select value={renderEngine} onChange={(e) => setRenderEngine(e.target.value)}>
            <option value="storyboard">Groq + TTS Storyboard (No OpenAI)</option>
          </select>
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
                  <p><PlayCircle size={14} style={{ marginRight: 6, verticalAlign: "text-bottom" }} />Rendered preview unavailable</p>
                  <small>Script is generated, but video URL is missing.</small>
                </>
              )}
            </div>
            <div className="tab-row">
              <button className="chip" onClick={generate}>Re-render</button>
              <button
                className={playingBrief ? "chip chip-active" : "chip"}
                onClick={() => {
                  const next = !playingBrief;
                  setPlayingBrief(next);
                  if (next) {
                    setSceneIndex(0);
                    setElapsedLiveMs(0);
                  }
                  if (!next && typeof window !== "undefined" && window.speechSynthesis) {
                    window.speechSynthesis.cancel();
                  }
                }}
                disabled={scenes.length === 0}
              >
                {playingBrief ? "Pause AI Brief" : "Watch AI Brief"}
              </button>
              <button className="chip" disabled>{result.with_audio ? "Audio On" : "Silent"}</button>
              <button className="chip" disabled>{result.video_url ? "Ready" : "Pending"}</button>
            </div>
            {!result.with_audio && result.audio_error ? (
              <p className="error">Audio generation failed: {result.audio_error}</p>
            ) : null}
            {result.render_engine ? (
              <p><strong>Video Engine:</strong> {result.render_engine === "storyboard" ? "Groq + TTS Storyboard" : result.render_engine}</p>
            ) : null}
            {result.visual_error ? <p className="error">Visual generation note: {result.visual_error}</p> : null}
            {scenes.length > 0 ? (
              <div className={`brief-stage stage-${currentScene?.type || "insight"}`}>
                <div className={`risk-overlay risk-${riskOverlay.tone}`}>{riskOverlay.label}</div>
                <div className="scene-type-pill">{(currentScene?.type || "insight").toUpperCase()}</div>
                <div className="brief-caption">{currentScene?.caption || "AI brief ready"}</div>
                <div className="brief-context">{currentScene?.context || "Analyzing latest market developments"}</div>
                <div className="fake-chart-wrap">
                  <div className={`fake-chart-line chart-${currentScene?.type || "insight"}`} />
                </div>
                <div className="brief-progress-track">
                  <div
                    className="brief-progress-fill"
                    style={{ width: `${totalMs ? ((playingBrief ? elapsedLiveMs : elapsedMs + (currentScene?.timeMs || 0)) / totalMs) * 100 : 0}%` }}
                  />
                </div>
              </div>
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
            <p className="tiny">Narration and visuals are now scene-based: script to scenes to timed visuals to synced scene audio.</p>
            <h4>Visual Plan</h4>
            <ul>
              {(result.scenes?.length ? result.scenes.map((scene) => ({
                time: `${scene.durationSec || 3}s`,
                scene: scene.text,
                animation: scene.type
              })) : result.visual_plan || []).map((item, idx) => (
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
