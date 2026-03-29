import { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { useOutletContext, useSearchParams } from "react-router-dom";
import { apiFetch } from "../api/client";

export default function ChatPage() {
  const { userId } = useOutletContext();
  const [searchParams] = useSearchParams();
  const [article, setArticle] = useState(searchParams.get("context") || "");
  const [question, setQuestion] = useState(searchParams.get("q") || "Should I invest now?");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const quickButtons = ["Explain simply", "Impact on India", "Best sectors?"];

  const ask = async () => {
    if (!article.trim() || !question.trim()) {
      setError("Article context and question are required.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      const data = await apiFetch("/chat", {
        method: "POST",
        body: JSON.stringify({
          userId: userId || "guest",
          article,
          question
        })
      });

      setAnswer(data.answer || "No answer generated.");
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
          <h2>Intelligence Assistant</h2>
          <button onClick={ask} disabled={loading}>
            {loading ? "Asking..." : "Ask"}
          </button>
        </div>

        <div className="tab-row">
          {quickButtons.map((item) => (
            <button key={item} className="chip" onClick={() => setQuestion(item)}>{item}</button>
          ))}
        </div>

        <label>
          Question
          <input value={question} onChange={(e) => setQuestion(e.target.value)} />
        </label>

        <label>
          Article Context
          <textarea value={article} onChange={(e) => setArticle(e.target.value)} rows={8} />
        </label>

        {error ? <p className="error">{error}</p> : null}

        {answer ? (
          <div className="result-box">
            <p className="risk-red"><AlertTriangle size={14} style={{ marginRight: 6, verticalAlign: "text-bottom" }} />Risk: High</p>
            <h3>Assistant Reply</h3>
            <p>{answer}</p>
          </div>
        ) : null}
      </article>
    </section>
  );
}
