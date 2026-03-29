import { useMemo, useState } from "react";
import { ArrowRight, BookText, Brain, ExternalLink, RefreshCw, Sparkles } from "lucide-react";
import { useOutletContext } from "react-router-dom";
import { apiFetch } from "../api/client";

const SECTION_DEFAULT = "overview";

export default function NavigatorPage() {
  const { userId } = useOutletContext();
  const [topic, setTopic] = useState("Union Budget 2026");
  const [urls, setUrls] = useState("");
  const [mode, setMode] = useState("detailed");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeSection, setActiveSection] = useState(SECTION_DEFAULT);
  const [question, setQuestion] = useState("");
  const [followUpAnswer, setFollowUpAnswer] = useState(null);
  const [followUpLoading, setFollowUpLoading] = useState(false);

  const sectionItems = useMemo(() => {
    const sections = result?.briefing?.sections || [];
    const core = [
      { id: "overview", title: "Executive Summary" },
      { id: "developments", title: "Key Developments" },
      { id: "claims", title: "Evidence Cards" },
      { id: "timeline", title: "Timeline" },
      { id: "decision", title: "Decision" },
      { id: "watch", title: "What To Watch" }
    ];

    const dynamic = sections
      .filter((item) => item?.id && item?.title)
      .map((item) => ({ id: item.id, title: item.title }));

    return [...core, ...dynamic].filter(
      (item, index, arr) => arr.findIndex((x) => x.id === item.id) === index
    );
  }, [result]);

  const activeSourceRefs = useMemo(() => {
    if (!result?.briefing) return [];

    if (activeSection === "claims") {
      return (result.briefing.claim_cards || []).flatMap((card) => card.source_refs || []);
    }

    if (activeSection === "timeline") {
      return (result.briefing.timeline || []).flatMap((item) => item.source_refs || []);
    }

    const matchedSection = (result.briefing.sections || []).find((section) => section.id === activeSection);
    if (matchedSection && Array.isArray(matchedSection.source_refs)) {
      return matchedSection.source_refs;
    }

    return [];
  }, [activeSection, result]);

  const sourceMapByRef = useMemo(() => {
    const map = new Map();
    (result?.source_map || []).forEach((source) => {
      map.set(source.ref, source);
    });
    return map;
  }, [result]);

  const generate = async (forceRefresh = false) => {
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
          mode,
          forceRefresh
        })
      });

      setResult(data);
      setActiveSection(SECTION_DEFAULT);
      setQuestion("");
      setFollowUpAnswer(null);
    } catch (err) {
      setError(err.message || "Failed to build navigator briefing");
    } finally {
      setLoading(false);
    }
  };

  const askFollowUp = async (nextQuestion) => {
    const prompt = String(nextQuestion || question).trim();
    if (!prompt || !result?.briefing) {
      return;
    }

    try {
      setFollowUpLoading(true);
      setError("");
      const data = await apiFetch("/navigator/ask", {
        method: "POST",
        body: JSON.stringify({
          userId,
          topic: result.topic || topic,
          briefing: result.briefing,
          source_map: result.source_map || [],
          question: prompt,
          selected_section: activeSection
        })
      });

      setFollowUpAnswer(data);
      setQuestion(prompt);
    } catch (err) {
      setError(err.message || "Failed to answer follow-up question");
    } finally {
      setFollowUpLoading(false);
    }
  };

  return (
    <section className="panel-grid signalx-navigator-page">
      <style>{`
        .navigator-shell {
          display: grid;
          grid-template-columns: 240px minmax(0, 1fr) 340px;
          gap: 14px;
        }

        .navigator-card {
          border: 1px solid var(--line);
          border-radius: 14px;
          background: color-mix(in srgb, var(--card) 96%, transparent);
          padding: 14px;
        }

        .navigator-side {
          display: grid;
          gap: 10px;
          align-content: start;
          position: sticky;
          top: 86px;
          height: fit-content;
        }

        .navigator-nav-btn {
          width: 100%;
          text-align: left;
          border-radius: 10px;
          border: 1px solid var(--line);
          background: color-mix(in srgb, var(--card) 94%, transparent);
          padding: 8px 10px;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
        }

        .navigator-nav-btn.active {
          background: color-mix(in srgb, var(--brand) 16%, var(--card));
          border-color: color-mix(in srgb, var(--brand) 38%, var(--line));
        }

        .navigator-main {
          display: grid;
          gap: 10px;
        }

        .navigator-right {
          display: grid;
          gap: 10px;
          align-content: start;
          position: sticky;
          top: 86px;
          height: fit-content;
        }

        .source-item {
          border: 1px solid var(--line);
          border-radius: 10px;
          padding: 10px;
          display: grid;
          gap: 6px;
          background: color-mix(in srgb, var(--card) 95%, transparent);
        }

        .source-item.highlight {
          border-color: color-mix(in srgb, var(--brand) 44%, var(--line));
          background: color-mix(in srgb, var(--brand) 12%, var(--card));
        }

        .source-item a {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          color: var(--brand);
          text-decoration: none;
          width: fit-content;
        }

        .claim-card,
        .timeline-card {
          border: 1px solid var(--line);
          border-radius: 12px;
          padding: 10px;
          background: color-mix(in srgb, var(--card) 95%, transparent);
        }

        .ref-row {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
          margin-top: 8px;
        }

        .ref-pill {
          border-radius: 999px;
          border: 1px solid var(--line);
          padding: 2px 8px;
          font-size: 12px;
          font-weight: 700;
        }

        .qa-box {
          border: 1px solid var(--line);
          border-radius: 12px;
          padding: 10px;
          background: color-mix(in srgb, var(--card) 95%, transparent);
          display: grid;
          gap: 8px;
        }

        .qa-input-row {
          display: grid;
          grid-template-columns: 1fr auto;
          gap: 8px;
        }

        @media (max-width: 1180px) {
          .navigator-shell {
            grid-template-columns: 1fr;
          }

          .navigator-side,
          .navigator-right {
            position: static;
          }
        }
      `}</style>

      <article className="panel panel-span">
        <div className="panel-head">
          <div>
            <h2>News Navigator</h2>
            <p className="tiny">Interactive Intelligence Briefing from ET coverage</p>
          </div>
          <div className="tab-row">
            <button onClick={() => generate(false)} disabled={loading}>
              {loading ? "Synthesizing..." : "Build Briefing"}
            </button>
            <button onClick={() => generate(true)} disabled={loading}>
              <RefreshCw size={14} style={{ marginRight: 6, verticalAlign: "text-bottom" }} />
              Refresh Coverage
            </button>
          </div>
        </div>

        <div className="fields">
          <label>
            Topic
            <input value={topic} onChange={(e) => setTopic(e.target.value)} />
          </label>
          <label>
            Optional URLs (one per line)
            <textarea value={urls} onChange={(e) => setUrls(e.target.value)} rows={4} />
          </label>
          <label>
            Mode
            <select value={mode} onChange={(e) => setMode(e.target.value)}>
              <option value="brief">brief</option>
              <option value="detailed">detailed</option>
            </select>
          </label>
        </div>

        {error ? <p className="error">{error}</p> : null}
      </article>

      {result ? (
        <div className="navigator-shell panel-span">
          <aside className="navigator-side navigator-card">
            <p className="tiny">Explore Briefing</p>
            {sectionItems.map((section) => (
              <button
                key={section.id}
                className={`navigator-nav-btn ${activeSection === section.id ? "active" : ""}`}
                onClick={() => setActiveSection(section.id)}
              >
                {section.title}
              </button>
            ))}
            <p className="tiny">{result.cached ? "Using cached briefing" : "Freshly synthesized"} • {result.source_count || 0} sources</p>
          </aside>

          <main className="navigator-main">
            <article className="navigator-card">
              <p className="tiny">Topic</p>
              <h3 style={{ marginTop: 0 }}>{result.briefing?.topic || topic}</h3>
              <p>{result.briefing?.executive_summary}</p>
            </article>

            <article className="navigator-card">
              <h4 style={{ marginTop: 0 }}>Key Developments</h4>
              <ul>
                {(result.briefing?.key_developments || []).map((item, idx) => (
                  <li key={`dev-${idx}`}>{item}</li>
                ))}
              </ul>
              <h4>Market Impact</h4>
              <p>{result.briefing?.market_impact}</p>
            </article>

            <article className="navigator-card">
              <h4 style={{ marginTop: 0 }}>Evidence Cards</h4>
              <div style={{ display: "grid", gap: 8 }}>
                {(result.briefing?.claim_cards || []).map((card, idx) => (
                  <div className="claim-card" key={`claim-${idx}`}>
                    <p style={{ margin: 0, fontWeight: 700 }}>{card.claim}</p>
                    <p style={{ margin: "6px 0 0" }}>{card.why_it_matters}</p>
                    <div className="ref-row">
                      {(card.source_refs || []).map((ref) => (
                        <button key={`claim-ref-${idx}-${ref}`} className="ref-pill" onClick={() => setActiveSection("claims")}>
                          Source {ref}
                        </button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </article>

            <article className="navigator-card">
              <h4 style={{ marginTop: 0 }}>Timeline</h4>
              <div style={{ display: "grid", gap: 8 }}>
                {(result.briefing?.timeline || []).map((item, idx) => (
                  <div className="timeline-card" key={`timeline-${idx}`}>
                    <p className="tiny" style={{ margin: 0 }}>{item.label}</p>
                    <p style={{ margin: "4px 0 0", fontWeight: 700 }}>{item.event}</p>
                    <p style={{ margin: "6px 0 0" }}>{item.why_it_matters}</p>
                    <div className="ref-row">
                      {(item.source_refs || []).map((ref) => (
                        <span key={`timeline-ref-${idx}-${ref}`} className="ref-pill">Source {ref}</span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </article>

            <article className="navigator-card">
              <h4 style={{ marginTop: 0 }}>Decision Lens</h4>
              <p className="signalx-decision-pill risk-medium">
                {result.briefing?.decisions?.suggested_action || "Wait"} ({result.briefing?.decisions?.confidence || "Medium"})
              </p>
              <p>{result.briefing?.decisions?.reason}</p>
              <div className="panel-grid" style={{ gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                <div className="claim-card">
                  <p className="tiny" style={{ margin: 0 }}>Opportunities</p>
                  <ul style={{ marginBottom: 0 }}>
                    {(result.briefing?.opportunities || []).map((item, idx) => <li key={`opp-${idx}`}>{item}</li>)}
                  </ul>
                </div>
                <div className="claim-card">
                  <p className="tiny" style={{ margin: 0 }}>Risks</p>
                  <ul style={{ marginBottom: 0 }}>
                    {(result.briefing?.risks || []).map((item, idx) => <li key={`risk-${idx}`}>{item}</li>)}
                  </ul>
                </div>
              </div>
            </article>

            <article className="navigator-card">
              <h4 style={{ marginTop: 0 }}>What To Watch</h4>
              <ul>
                {(result.briefing?.watch_next || []).map((item, idx) => (
                  <li key={`watch-${idx}`}>{item}</li>
                ))}
              </ul>
              <h4>Follow-up Questions</h4>
              <div className="tab-row">
                {(result.briefing?.follow_up_questions || []).map((item, idx) => (
                  <button
                    className="chip"
                    key={`q-${idx}`}
                    onClick={() => askFollowUp(item)}
                    disabled={followUpLoading}
                  >
                    <Sparkles size={13} style={{ marginRight: 6, verticalAlign: "text-bottom" }} />
                    {item}
                  </button>
                ))}
              </div>
            </article>
          </main>

          <aside className="navigator-right">
            <article className="navigator-card">
              <h4 style={{ marginTop: 0, display: "inline-flex", gap: 8, alignItems: "center" }}>
                <BookText size={16} /> Source Map
              </h4>
              <div style={{ display: "grid", gap: 8 }}>
                {(result.source_map || []).map((source) => {
                  const highlighted = activeSourceRefs.includes(source.ref);
                  return (
                    <div className={`source-item ${highlighted ? "highlight" : ""}`} key={`source-${source.ref}`}>
                      <p style={{ margin: 0, fontWeight: 700 }}>[{source.ref}] {source.title}</p>
                      <p className="tiny" style={{ margin: 0 }}>{source.snippet}</p>
                      <a href={source.url} target="_blank" rel="noreferrer">
                        Open source <ExternalLink size={12} />
                      </a>
                    </div>
                  );
                })}
              </div>
            </article>

            <article className="navigator-card qa-box">
              <h4 style={{ margin: 0, display: "inline-flex", gap: 8, alignItems: "center" }}>
                <Brain size={16} /> Ask This Briefing
              </h4>
              <div className="qa-input-row">
                <input
                  value={question}
                  onChange={(e) => setQuestion(e.target.value)}
                  placeholder="Ask about risk, exposure, next steps..."
                />
                <button onClick={() => askFollowUp(question)} disabled={followUpLoading || !question.trim()}>
                  {followUpLoading ? "Thinking..." : "Ask"}
                </button>
              </div>

              {followUpAnswer ? (
                <div className="claim-card">
                  <p className="tiny" style={{ margin: 0 }}>
                    Confidence: {followUpAnswer.confidence || "Low"}
                  </p>
                  <p style={{ margin: "6px 0 0" }}>{followUpAnswer.answer}</p>
                  <div className="ref-row">
                    {(followUpAnswer.cited_source_refs || []).map((ref) => (
                      <span className="ref-pill" key={`ans-ref-${ref}`}>Source {ref}</span>
                    ))}
                  </div>
                  {(followUpAnswer.follow_up_questions || []).length > 0 ? (
                    <div className="tab-row" style={{ marginTop: 8 }}>
                      {followUpAnswer.follow_up_questions.map((item, idx) => (
                        <button key={`ans-q-${idx}`} className="chip" onClick={() => askFollowUp(item)}>
                          {item}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </article>

            <article className="navigator-card">
              <button className="signalx-open-briefing" onClick={() => setActiveSection("overview")}>
                Jump To Summary <ArrowRight size={14} style={{ marginLeft: 6 }} />
              </button>
            </article>
          </aside>
        </div>
      ) : null}
    </section>
  );
}
