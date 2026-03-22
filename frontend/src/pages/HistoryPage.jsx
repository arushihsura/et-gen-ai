import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { apiFetch } from "../api/client";

export default function HistoryPage() {
  const { userId } = useOutletContext();
  const [summaries, setSummaries] = useState([]);
  const [chats, setChats] = useState([]);
  const [status, setStatus] = useState("");

  const loadHistory = async () => {
    if (!userId?.trim()) {
      setStatus("User ID is required.");
      return;
    }

    try {
      setStatus("Loading history...");
      const [summaryData, chatData] = await Promise.all([
        apiFetch(`/history/summaries?userId=${encodeURIComponent(userId)}&limit=20`),
        apiFetch(`/history/chats?userId=${encodeURIComponent(userId)}&limit=20`)
      ]);

      setSummaries(summaryData.items || []);
      setChats(chatData.items || []);
      setStatus("History loaded.");
    } catch (error) {
      setStatus(error.message);
    }
  };

  return (
    <section className="panel-grid">
      <article className="panel panel-span">
        <div className="panel-head">
          <h2>Session History</h2>
          <button onClick={loadHistory}>Load History</button>
        </div>
        <p className="status">{status}</p>

        <div className="history-columns">
          <div>
            <h3>Summaries</h3>
            {summaries.map((item) => (
              <div key={item.id} className="history-card">
                <p className="tiny">{item.createdAt}</p>
                <p><strong>Action:</strong> {item.response?.decision?.suggested_action || "-"}</p>
                <p><strong>Risk:</strong> {item.response?.summary?.["Risk Level"] || "-"}</p>
              </div>
            ))}
          </div>

          <div>
            <h3>Chats</h3>
            {chats.map((item) => (
              <div key={item.id} className="history-card">
                <p className="tiny">{item.createdAt}</p>
                <p><strong>Q:</strong> {item.question}</p>
                <p><strong>A:</strong> {item.answer}</p>
              </div>
            ))}
          </div>
        </div>
      </article>
    </section>
  );
}
