const el = {
  userId: document.getElementById("userId"),
  persona: document.getElementById("persona"),
  sectors: document.getElementById("sectors"),
  interests: document.getElementById("interests"),
  portfolioSymbols: document.getElementById("portfolioSymbols"),
  riskAppetite: document.getElementById("riskAppetite"),
  horizon: document.getElementById("horizon"),
  saveProfileBtn: document.getElementById("saveProfileBtn"),
  loadFeedBtn: document.getElementById("loadFeedBtn"),
  summarizeBtn: document.getElementById("summarizeBtn"),
  askBtn: document.getElementById("askBtn"),
  loadHistoryBtn: document.getElementById("loadHistoryBtn"),
  articleUrl: document.getElementById("articleUrl"),
  mode: document.getElementById("mode"),
  question: document.getElementById("question"),
  chatArticle: document.getElementById("chatArticle"),
  feed: document.getElementById("feed"),
  summaryResult: document.getElementById("summaryResult"),
  chatAnswer: document.getElementById("chatAnswer"),
  summaryHistory: document.getElementById("summaryHistory"),
  chatHistory: document.getElementById("chatHistory"),
  toast: document.getElementById("toast")
};

const state = {
  latestSummaryText: ""
};

const showToast = (message) => {
  el.toast.textContent = message;
  el.toast.classList.add("show");
  window.setTimeout(() => el.toast.classList.remove("show"), 2200);
};

const safeText = (value) => String(value ?? "").replace(/[<>]/g, "");

const api = async (url, options = {}) => {
  const response = await fetch(url, {
    headers: {
      "Content-Type": "application/json"
    },
    ...options
  });

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.error || `Request failed (${response.status})`);
  }

  return data;
};

const getProfilePayload = () => ({
  userId: el.userId.value.trim(),
  persona: el.persona.value.trim(),
  sectors: el.sectors.value.trim(),
  interests: el.interests.value.trim(),
  portfolioSymbols: el.portfolioSymbols.value.trim(),
  riskAppetite: el.riskAppetite.value,
  horizon: el.horizon.value
});

const renderFeed = (items = []) => {
  if (!items.length) {
    el.feed.innerHTML = "<p>No stories yet.</p>";
    return;
  }

  el.feed.innerHTML = items
    .map((item) => {
      const reasons = (item.why_this_is_for_you || []).map((r) => `<li>${safeText(r)}</li>`).join("");
      return `
        <article class="feed-item">
          <h4><a href="${item.url}" target="_blank" rel="noreferrer">${safeText(item.title)}</a></h4>
          <div class="feed-meta">
            <span class="badge">Score ${item.score}</span>
            <span class="badge">Tone ${safeText(item.tone)}</span>
          </div>
          <ul>${reasons}</ul>
        </article>
      `;
    })
    .join("");
};

const riskClass = (riskColor) => {
  if (riskColor === "red") return "risk-red";
  if (riskColor === "green") return "risk-green";
  return "risk-yellow";
};

const renderSummary = (payload) => {
  const summary = payload.summary || {};
  const keyPoints = Array.isArray(summary["Key Points"]) ? summary["Key Points"] : [];
  const risk = summary["Risk Level"] || "Medium";

  const text = `Suggested Action: ${payload.decision?.suggested_action || "Wait"} (${payload.decision?.confidence || "Medium"})\n`
    + `Reason: ${payload.decision?.reason || "-"}\n\n`
    + `Key Points:\n${keyPoints.map((k) => `- ${k}`).join("\n")}\n\n`
    + `Market Impact:\n${summary["Market Impact"] || "-"}\n\n`
    + `Risk Level:\n${risk}\n\n`
    + `What You Should Do:\n${payload.insight || "-"}\n\n`
    + `Why This Matters:\n${payload.relevance || "-"}\n\n`
    + `Short Term:\n${payload.time_horizon?.short_term || "-"}\n\n`
    + `Long Term:\n${payload.time_horizon?.long_term || "-"}\n\n`
    + `Suggested Questions:\n${(payload.suggested_questions || []).map((q) => `- ${q}`).join("\n")}`;

  state.latestSummaryText = text;
  el.summaryResult.innerHTML = `<div class="${riskClass(payload.risk_color)}">${safeText(text)}</div>`;
  el.chatArticle.value = text;
};

const renderHistory = (container, items, mapFn) => {
  if (!items.length) {
    container.innerHTML = "<p>No history yet.</p>";
    return;
  }

  container.innerHTML = items
    .map((item) => `<article class="history-item">${mapFn(item)}</article>`)
    .join("");
};

el.saveProfileBtn.addEventListener("click", async () => {
  try {
    const payload = getProfilePayload();
    if (!payload.userId) {
      throw new Error("User ID is required");
    }

    await api("/profile", {
      method: "POST",
      body: JSON.stringify(payload)
    });

    showToast("Profile saved");
  } catch (error) {
    showToast(error.message);
  }
});

el.loadFeedBtn.addEventListener("click", async () => {
  try {
    const userId = el.userId.value.trim();
    const data = await api(`/my-et?userId=${encodeURIComponent(userId)}`);
    renderFeed(data.feed || []);
  } catch (error) {
    showToast(error.message);
  }
});

el.summarizeBtn.addEventListener("click", async () => {
  try {
    const userId = el.userId.value.trim();
    const url = el.articleUrl.value.trim();
    const mode = el.mode.value;

    if (!url) {
      throw new Error("Article URL is required");
    }

    const payload = await api(`/summarize?userId=${encodeURIComponent(userId)}&url=${encodeURIComponent(url)}&mode=${encodeURIComponent(mode)}`);
    renderSummary(payload);
    showToast("Briefing ready");
  } catch (error) {
    showToast(error.message);
  }
});

el.askBtn.addEventListener("click", async () => {
  try {
    const userId = el.userId.value.trim();
    const article = el.chatArticle.value.trim() || state.latestSummaryText;
    const question = el.question.value.trim();

    if (!article) {
      throw new Error("Generate briefing or paste article context first");
    }

    if (!question) {
      throw new Error("Question is required");
    }

    const data = await api("/chat", {
      method: "POST",
      body: JSON.stringify({ userId, article, question })
    });

    el.chatAnswer.textContent = data.answer || "No answer generated";
  } catch (error) {
    showToast(error.message);
  }
});

el.loadHistoryBtn.addEventListener("click", async () => {
  try {
    const userId = el.userId.value.trim();
    const [summaries, chats] = await Promise.all([
      api(`/history/summaries?userId=${encodeURIComponent(userId)}&limit=10`),
      api(`/history/chats?userId=${encodeURIComponent(userId)}&limit=10`)
    ]);

    renderHistory(el.summaryHistory, summaries.items || [], (item) => {
      const action = item.response?.decision?.suggested_action || "-";
      const created = item.createdAt || "-";
      return `<strong>${safeText(action)}</strong><br/><small>${safeText(created)}</small>`;
    });

    renderHistory(el.chatHistory, chats.items || [], (item) => {
      return `<strong>Q:</strong> ${safeText(item.question)}<br/><small>${safeText(item.createdAt || "")}</small>`;
    });
  } catch (error) {
    showToast(error.message);
  }
});
