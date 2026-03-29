import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCircle2, ExternalLink, FileText, Link2, PlayCircle } from "lucide-react";
import { useOutletContext, useSearchParams } from "react-router-dom";
import { apiFetch } from "../api/client";

export default function StoryArcPage() {
  const { userId } = useOutletContext();
  const [searchParams] = useSearchParams();
  const topic = searchParams.get("topic") || "Oil prices";
  const sourceUrl = searchParams.get("url") || "";

  const [result, setResult] = useState(null);
  const [sources, setSources] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);
  const [chatAnswer, setChatAnswer] = useState("");
  const [chatConfidence, setChatConfidence] = useState("");
  const [chatFollowUps, setChatFollowUps] = useState([]);
  const [selectedSourceIndex, setSelectedSourceIndex] = useState(0);

  const normalizedSources = useMemo(() => {
    const rawSources = Array.isArray(sources) && sources.length > 0 ? sources : (sourceUrl ? [sourceUrl] : []);
    return rawSources
      .map((entry) => {
        if (typeof entry === "string") {
          return { url: entry, label: entry };
        }
        if (entry && typeof entry === "object" && typeof entry.url === "string") {
          return { url: entry.url, label: entry.title || entry.url };
        }
        return null;
      })
      .filter(Boolean)
      .slice(0, 6);
  }, [sources, sourceUrl]);

  const sentimentTrail = useMemo(() => {
    return Array.isArray(result?.sentiment_trail) ? result.sentiment_trail : [];
  }, [result]);

  const articleSentiments = useMemo(() => {
    if (Array.isArray(result?.article_sentiments) && result.article_sentiments.length > 0) {
      return result.article_sentiments;
    }

    return normalizedSources.map((source, index) => {
      const trail = sentimentTrail[index] || sentimentTrail[sentimentTrail.length - 1] || {};
      return {
        source_ref: index + 1,
        title: source.label,
        url: source.url,
        sentiment: trail.sentiment || "Neutral",
        confidence: "Low",
        reason: trail.reason || "Sentiment inferred from story timeline."
      };
    });
  }, [result?.article_sentiments, normalizedSources, sentimentTrail]);

  const sentimentDistribution = useMemo(() => {
    if (articleSentiments.length === 0) {
      return { positive: 0, neutral: 0, negative: 0 };
    }

    return articleSentiments.reduce((acc, item) => {
      const sentiment = String(item.sentiment).toLowerCase();
      if (sentiment.includes("positive")) acc.positive += 1;
      else if (sentiment.includes("negative")) acc.negative += 1;
      else acc.neutral += 1;
      return acc;
    }, { positive: 0, neutral: 0, negative: 0 });
  }, [articleSentiments]);

  const selectedArticleSentiment = useMemo(() => {
    if (articleSentiments.length === 0) {
      return {
        source_ref: 0,
        title: "No source selected",
        sentiment: "Neutral",
        confidence: "Low",
        reason: "No article sentiment is available."
      };
    }

    const safeIndex = Math.min(Math.max(selectedSourceIndex, 0), articleSentiments.length - 1);
    return articleSentiments[safeIndex];
  }, [articleSentiments, selectedSourceIndex]);

  const sentimentLabel = useMemo(() => {
    if (sentimentDistribution.positive > sentimentDistribution.negative) return "Positive";
    if (sentimentDistribution.negative > sentimentDistribution.positive) return "Negative";
    return "Mixed";
  }, [sentimentDistribution]);

  const trendStatus = useMemo(() => {
    if (!result) return "Neutral";
    const lastSentiment = sentimentTrail[sentimentTrail.length - 1]?.sentiment || result.sentiment_shift || "";
    if (lastSentiment.toLowerCase().includes("positive")) return "Positive Momentum";
    if (lastSentiment.toLowerCase().includes("negative")) return "Negative Momentum";
    return "Neutral";
  }, [result, sentimentTrail]);

  const riskLevel = useMemo(() => {
    if (!result) return "Medium Risk";
    const contrarian = String(result.contrarian_view || "").toLowerCase();
    if (contrarian.includes("high") || contrarian.includes("significant")) return "High Risk";
    if (contrarian.includes("low") || contrarian.includes("minimal")) return "Low Risk";
    return "Medium Risk";
  }, [result]);

  const watchItems = useMemo(() => {
    return (result?.watch_next || result?.predictions || []).slice(0, 4);
  }, [result]);

  const keyPlayers = useMemo(() => {
    return (result?.key_players || []).slice(0, 6);
  }, [result]);

  const whyThisMatters = useMemo(() => {
    const firstImpact = result?.timeline?.[0]?.impact;
    return result?.why_this_matters || result?.summary || firstImpact || "Investor transparency builds trust and improves long-term decision-making.";
  }, [result]);

  const buildArc = async () => {
    try {
      setLoading(true);
      setError("");
      const data = await apiFetch("/story-arc", {
        method: "POST",
        body: JSON.stringify({
          topic,
          urls: sourceUrl.trim() ? [sourceUrl.trim()] : [],
          mode: "detailed"
        })
      });
      setResult(data.arc);
      setSources(data.sources || []);
      setSelectedSourceIndex(0);
      setChatAnswer("");
      setChatConfidence("");
      setChatFollowUps([]);
    } catch (err) {
      setError(err.message || "Failed to build story arc");
    } finally {
      setLoading(false);
    }
  };

  const handleChatSubmit = async (event) => {
    event.preventDefault();
    const question = chatInput.trim();
    if (!question || !result) {
      return;
    }

    try {
      setChatLoading(true);
      const data = await apiFetch("/story-arc/ask", {
        method: "POST",
        body: JSON.stringify({
          userId,
          topic: result.story_title || result.topic || topic,
          question,
          arc: result,
          sources: normalizedSources
        })
      });

      setChatAnswer(data.answer || "No answer generated.");
      setChatConfidence(data.confidence || "Low");
      setChatFollowUps(Array.isArray(data.follow_up_questions) ? data.follow_up_questions : []);
      setChatInput("");
    } catch (err) {
      setChatAnswer(err.message || "Failed to answer your question.");
      setChatConfidence("Low");
      setChatFollowUps([]);
    } finally {
      setChatLoading(false);
    }
  };

  useEffect(() => {
    if (topic || sourceUrl) {
      buildArc();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <section className="signalx-story-arc-page">
      <style>{`
        .arc-root {
          display: grid;
          gap: 14px;
          width: 100%;
        }

        .arc-hero {
          background: linear-gradient(135deg, color-mix(in srgb, var(--brand) 14%, var(--card)) 0%, var(--card) 72%);
        }

        .arc-title {
          margin: 0;
          font-family: var(--serif);
          font-weight: 400;
          font-size: clamp(2.2rem, 4vw, 3.5rem);
          line-height: 0.95;
        }

        .arc-chip-row {
          display: flex;
          flex-wrap: wrap;
          gap: 8px;
          margin: 12px 0 14px;
        }

        .arc-chip {
          display: inline-flex;
          align-items: center;
          border-radius: 999px;
          padding: 5px 11px;
          font-size: 0.82rem;
          font-weight: 700;
          letter-spacing: 0.01em;
        }

        .arc-chip-green {
          background: color-mix(in srgb, #22c55e 24%, var(--card));
          color: #166534;
        }

        .arc-chip-yellow {
          background: color-mix(in srgb, #f59e0b 24%, var(--card));
          color: #92400e;
        }

        .arc-chip-blue {
          background: color-mix(in srgb, #3b82f6 24%, var(--card));
          color: #1d4ed8;
        }

        .arc-cta {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          border-radius: 12px;
          padding: 9px 14px;
          font-size: 0.95rem;
          font-weight: 700;
          border: 1px solid var(--line);
          background: color-mix(in srgb, var(--card) 96%, transparent);
        }

        .arc-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.7fr) minmax(300px, 1fr);
          gap: 14px;
          align-items: start;
        }

        .arc-col {
          display: grid;
          gap: 12px;
        }

        .arc-card {
          border: 1px solid var(--line);
          border-radius: 14px;
          background: color-mix(in srgb, var(--card) 96%, transparent);
          padding: 14px;
        }

        .arc-card h3,
        .arc-card h4 {
          margin: 0 0 8px;
        }

        .arc-timeline {
          display: grid;
          gap: 8px;
        }

        .arc-timeline-row {
          display: grid;
          grid-template-columns: 24px 1fr;
          gap: 10px;
          padding-top: 8px;
          border-top: 1px solid var(--line);
        }

        .arc-timeline-row:first-child {
          border-top: 0;
          padding-top: 0;
        }

        .arc-index {
          width: 24px;
          height: 24px;
          border-radius: 999px;
          display: grid;
          place-items: center;
          background: color-mix(in srgb, var(--brand) 90%, #000);
          color: #fff;
          font-size: 12px;
          font-weight: 700;
        }

        .arc-source {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 8px;
          border: 1px solid var(--line);
          border-radius: 10px;
          padding: 9px 10px;
          text-decoration: none;
          color: inherit;
          margin-top: 8px;
          font-size: 0.88rem;
          width: 100%;
          text-align: left;
          cursor: pointer;
        }

        .arc-source:hover {
          background: color-mix(in srgb, var(--brand) 8%, var(--card));
        }

        .arc-source-label {
          display: -webkit-box;
          -webkit-line-clamp: 2;
          -webkit-box-orient: vertical;
          overflow: hidden;
        }

        .arc-sentiment {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 10px;
          align-items: center;
          margin-bottom: 12px;
          border: 1px solid var(--line);
          border-radius: 999px;
          padding: 9px 12px;
          background: color-mix(in srgb, var(--card) 94%, transparent);
        }

        .arc-sentiment-bar {
          display: flex;
          height: 14px;
          border-radius: 999px;
          overflow: hidden;
          background: color-mix(in srgb, var(--line) 65%, transparent);
        }

        .arc-sp {
          background: #36c682;
        }

        .arc-sn {
          background: #eec24e;
        }

        .arc-sr {
          background: #dd5f67;
        }

        .arc-list {
          margin: 0;
          padding-left: 18px;
          display: grid;
          gap: 6px;
          font-size: 0.95rem;
          line-height: 1.4;
        }

        .arc-ask-row {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 8px;
        }

        .arc-answer {
          margin-top: 10px;
          border: 1px solid var(--line);
          border-radius: 10px;
          padding: 10px;
          background: color-mix(in srgb, var(--card) 95%, transparent);
        }

        .arc-followups {
          margin-top: 8px;
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }

        .arc-followup-btn {
          border: 1px solid var(--line);
          background: color-mix(in srgb, var(--card) 96%, transparent);
          border-radius: 999px;
          padding: 4px 10px;
          font-size: 0.8rem;
        }

        .arc-highlight {
          border-color: color-mix(in srgb, #f59e0b 44%, var(--line));
          background: color-mix(in srgb, #f59e0b 10%, var(--card));
        }

        @media (max-width: 1120px) {
          .arc-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 720px) {
          .arc-title {
            font-size: clamp(1.8rem, 9vw, 2.3rem);
          }

          .arc-ask-row {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      <div className="arc-root">
        <article className="panel panel-span arc-hero">
          <div className="panel-head">
            <div>
              <p className="tiny" style={{ marginBottom: 6 }}>Story Arc Tracker</p>
              <h1 className="arc-title">{result?.story_title || topic}</h1>
              <div className="arc-chip-row">
                <span className="arc-chip arc-chip-green">{trendStatus}</span>
                <span className="arc-chip arc-chip-yellow">{riskLevel}</span>
                <span className="arc-chip arc-chip-blue">{(result?.impact_tags || ["Markets"])[0] || "Markets"}</span>
              </div>
            </div>
            <button className="arc-cta" onClick={buildArc} disabled={loading}>
              <PlayCircle size={16} />
              {loading ? "Refreshing..." : "Refresh Arc"}
            </button>
          </div>
          {error ? <p className="error" style={{ marginTop: 8 }}>{error}</p> : null}
        </article>

        {result ? (
          <div className="arc-grid panel-span">
            <div className="arc-col">
              <article className="arc-card">
                <h3>Why This Matters</h3>
                <p>{whyThisMatters}</p>
              </article>

              <article className="arc-card">
                <h3>Narrative Flow</h3>
                <div className="arc-timeline">
                  {(result.timeline || []).map((item, idx) => (
                    <div className="arc-timeline-row" key={idx}>
                      <span className="arc-index">{idx + 1}</span>
                      <div>
                        <p style={{ margin: 0, fontWeight: 700 }}>{item.event || "Narrative development"}</p>
                        <p className="tiny" style={{ marginTop: 6 }}>{item.impact || item.time_label || "Signal impact under observation."}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </article>

              <article className="arc-card arc-highlight">
                <h4 style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
                  <AlertTriangle size={18} /> Alternate Perspective
                </h4>
                <p style={{ margin: 0 }}>{result.contrarian_view || (result.contrarian_views || [])[0] || "No contrarian view available."}</p>
              </article>

              <article className="arc-card">
                <h4 style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
                  <FileText size={18} /> Resources
                </h4>
                {normalizedSources.length > 0 ? (
                  normalizedSources.map((source, idx) => (
                    <div
                      className="arc-source"
                      key={`${source.url}-${idx}`}
                      style={{
                        background: idx === selectedSourceIndex
                          ? "color-mix(in srgb, var(--brand) 12%, var(--card))"
                          : undefined
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => setSelectedSourceIndex(idx)}
                        style={{
                          all: "unset",
                          display: "inline-flex",
                          flex: 1,
                          cursor: "pointer"
                        }}
                      >
                        <span
                          className="arc-source-label"
                          style={{
                            fontWeight: idx === selectedSourceIndex ? 700 : 500
                          }}
                        >
                          {source.label}
                        </span>
                      </button>
                      <a href={source.url} target="_blank" rel="noreferrer" style={{ display: "inline-flex", color: "inherit" }}>
                        <ExternalLink size={14} />
                      </a>
                    </div>
                  ))
                ) : (
                  <p className="tiny" style={{ margin: 0 }}>No source links available.</p>
                )}
              </article>
            </div>

            <aside className="arc-col">
              <article className="arc-card">
                <h3>Insights</h3>

                <h4 style={{ marginTop: 12 }}>Key Players</h4>
                <div className="tab-row" style={{ marginBottom: 10 }}>
                  {keyPlayers.map((player, idx) => (
                    <span className="chip" key={idx}>{player}</span>
                  ))}
                </div>

                <h4>Sentiment (Selected Article)</h4>
                <div className="arc-sentiment">
                  <div className="arc-sentiment-bar">
                    <div className="arc-sp" style={{ flex: `${sentimentDistribution.positive || 1}` }}></div>
                    <div className="arc-sn" style={{ flex: `${sentimentDistribution.neutral || 1}` }}></div>
                    <div className="arc-sr" style={{ flex: `${sentimentDistribution.negative || 1}` }}></div>
                  </div>
                  <strong>{String(selectedArticleSentiment.sentiment || sentimentLabel)}</strong>
                </div>
                <p className="tiny" style={{ marginTop: -4 }}>
                  <strong>Article:</strong> {selectedArticleSentiment.title || "N/A"}
                </p>
                <p className="tiny" style={{ marginTop: -2 }}>
                  <strong>Confidence:</strong> {selectedArticleSentiment.confidence || "Low"}
                </p>
                <p className="tiny" style={{ marginTop: -2 }}>{selectedArticleSentiment.reason || "No reason available."}</p>

                <h4>What to Watch</h4>
                <ul className="arc-list">
                  {watchItems.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </article>

              <article className="arc-card">
                <h4 style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
                  <CheckCircle2 size={18} /> For You
                </h4>
                <p className="tiny">If you are a long-term investor:</p>
                <p style={{ margin: 0 }}>{watchItems[0] || "Transparency reduces risk in decision making."}</p>
              </article>

              <article className="arc-card">
                <h4 style={{ display: "inline-flex", gap: 8, alignItems: "center" }}>
                  <Link2 size={18} /> Ask About This Story
                </h4>
                <form onSubmit={handleChatSubmit} className="arc-ask-row">
                  <input
                    className="ask-input"
                    value={chatInput}
                    onChange={(e) => setChatInput(e.target.value)}
                    placeholder="Is this sustainable? Which stocks benefit?"
                  />
                  <button className="ask-btn" type="submit" disabled={chatLoading || !chatInput.trim()}>
                    {chatLoading ? "Thinking..." : "Ask"}
                  </button>
                </form>

                {chatAnswer ? (
                  <div className="arc-answer">
                    <p className="tiny" style={{ margin: 0 }}>Confidence: {chatConfidence || "Low"}</p>
                    <p style={{ margin: "6px 0 0" }}>{chatAnswer}</p>
                    {chatFollowUps.length > 0 ? (
                      <div className="arc-followups">
                        {chatFollowUps.map((item, idx) => (
                          <button
                            key={`arc-followup-${idx}`}
                            type="button"
                            className="arc-followup-btn"
                            onClick={() => setChatInput(item)}
                          >
                            {item}
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                ) : null}
              </article>
            </aside>
          </div>
        ) : null}
      </div>
    </section>
  );
}
