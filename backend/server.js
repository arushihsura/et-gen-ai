const express = require("express");
const cors = require("cors");
const Groq = require("groq-sdk");
require("dotenv").config();

const { getETHeadlines, getArticleContent } = require("./services/scraper");
const { summarize } = require("./services/aiService");
const {
  buildNavigatorBriefing,
  buildStoryArc,
  buildVernacularInsight,
  buildVideoStudioScript
} = require("./services/intelligenceService");
const { renderVideoFromScript } = require("./services/videoRenderer");
const {
  initDb,
  upsertProfile,
  getProfileByUserId,
  saveSummary,
  getSummaryHistoryByUserId,
  saveChatInteraction,
  getChatHistoryByUserId
} = require("./services/db");
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const groqChatModel = process.env.GROQ_CHAT_MODEL || process.env.GROQ_MODEL || "llama-3.1-8b-instant";

const ensureList = (value = []) => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value === "string" && value.trim()) {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
};

const normalizeProfile = (raw = {}) => {
  return {
    userId: String(raw.userId || "").trim(),
    persona: String(raw.persona || "").trim(),
    sectors: ensureList(raw.sectors),
    interests: ensureList(raw.interests),
    portfolioSymbols: ensureList(raw.portfolioSymbols),
    riskAppetite: String(raw.riskAppetite || "medium").trim().toLowerCase(),
    horizon: String(raw.horizon || "long-term").trim().toLowerCase()
  };
};

const getToneFromTitle = (title = "") => {
  const t = title.toLowerCase();
  const risky = /(war|volatility|crash|fall|slump|uncertain|risk)/.test(t);
  const positive = /(surge|rally|gain|growth|beat|upside)/.test(t);

  if (risky) {
    return "risky";
  }

  if (positive) {
    return "positive";
  }

  return "neutral";
};

const rankArticleForProfile = (article, profile) => {
  const title = String(article.title || "");
  const titleLower = title.toLowerCase();
  let score = 1;
  const reasons = [];

  const matchedSectors = profile.sectors.filter((sector) => titleLower.includes(sector.toLowerCase()));
  if (matchedSectors.length > 0) {
    score += matchedSectors.length * 3;
    reasons.push(`Matches your sector interests: ${matchedSectors.join(", ")}`);
  }

  const matchedInterests = profile.interests.filter((interest) => titleLower.includes(interest.toLowerCase()));
  if (matchedInterests.length > 0) {
    score += matchedInterests.length * 2;
    reasons.push(`Relevant to your interests: ${matchedInterests.join(", ")}`);
  }

  const matchedSymbols = profile.portfolioSymbols.filter((symbol) => {
    const escaped = symbol.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    return new RegExp(`\\b${escaped.toLowerCase()}\\b`).test(titleLower);
  });

  if (matchedSymbols.length > 0) {
    score += matchedSymbols.length * 4;
    reasons.push(`Connected to your portfolio: ${matchedSymbols.join(", ")}`);
  }

  if (profile.persona && titleLower.includes(profile.persona.toLowerCase())) {
    score += 2;
    reasons.push(`Useful for your persona: ${profile.persona}`);
  }

  const tone = getToneFromTitle(title);
  if (profile.riskAppetite === "low" && tone === "risky") {
    score -= 1;
    reasons.push("Higher volatility than your risk preference");
  }

  if (profile.riskAppetite === "high" && tone === "risky") {
    score += 1;
    reasons.push("Fits your high-risk appetite");
  }

  if (profile.horizon.includes("long") && /(long-term|value|fundamental|peg|earnings)/.test(titleLower)) {
    score += 2;
    reasons.push("Aligned with long-term investing focus");
  }

  if (reasons.length === 0) {
    reasons.push("General market relevance");
  }

  return {
    ...article,
    score,
    why_this_is_for_you: reasons,
    tone
  };
};

const app = express();
app.use(cors());
app.use(express.json());
app.use("/media", express.static("media"));

const parseLimit = (value, fallback = 20) => {
  const parsed = Number.parseInt(value, 10);

  if (Number.isNaN(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.min(parsed, 100);
};

const getUserIdFromRequest = (req) => {
  const fromBody = String(req.body?.userId || "").trim();
  if (fromBody) {
    return fromBody;
  }

  const fromQuery = String(req.query?.userId || "").trim();
  if (fromQuery) {
    return fromQuery;
  }

  return "guest";
};

const toArticleBundleFromUrls = async (urls = [], mode = "brief") => {
  const trimmedUrls = urls
    .filter((u) => typeof u === "string" && u.trim())
    .map((u) => u.trim())
    .slice(0, 8);

  const bundles = await Promise.all(
    trimmedUrls.map(async (url) => {
      try {
        const content = await getArticleContent(url, { mode });
        return {
          title: "ET article",
          url,
          content: content || ""
        };
      } catch (error) {
        return {
          title: "ET article",
          url,
          content: ""
        };
      }
    })
  );

  return bundles.filter((b) => b.content && b.content.length >= 120);
};

const toArticleBundleFromFeed = async (topic = "", mode = "brief") => {
  const headlines = await getETHeadlines();
  const topicLower = topic.toLowerCase();
  const candidates = headlines
    .filter((item) => !topicLower || item.title.toLowerCase().includes(topicLower))
    .slice(0, 8);

  const bundles = await Promise.all(
    candidates.map(async (item) => {
      try {
        const content = await getArticleContent(item.url, { mode });
        return {
          title: item.title,
          url: item.url,
          content: content || ""
        };
      } catch (error) {
        return {
          title: item.title,
          url: item.url,
          content: ""
        };
      }
    })
  );

  return bundles.filter((b) => b.content && b.content.length >= 120);
};

app.post("/profile", async (req, res) => {
  try {
    const profile = normalizeProfile(req.body || {});

    if (!profile.userId) {
      return res.status(400).json({ error: "Missing userId" });
    }

    const profileWithTimestamp = {
      ...profile,
      updatedAt: new Date().toISOString()
    };

    await upsertProfile(profileWithTimestamp);
    const savedProfile = await getProfileByUserId(profile.userId);

    return res.json({
      message: "Profile saved",
      profile: savedProfile
    });
  } catch (error) {
    return res.status(500).json({ error: "Failed to save profile" });
  }
});

app.get("/profile/:userId", async (req, res) => {
  const profile = await getProfileByUserId(req.params.userId);

  if (!profile) {
    return res.status(404).json({ error: "Profile not found" });
  }

  return res.json(profile);
});

app.get("/my-et", async (req, res) => {
  try {
    const userId = String(req.query.userId || "").trim();

    if (!userId) {
      return res.status(400).json({ error: "Missing userId query parameter" });
    }

    const profile = await getProfileByUserId(userId);
    if (!profile) {
      return res.status(404).json({ error: "Profile not found. Save profile via POST /profile first." });
    }

    const headlines = await getETHeadlines();
    const personalizedStories = headlines
      .map((article) => rankArticleForProfile(article, profile))
      .sort((a, b) => b.score - a.score)
      .slice(0, 10);

    return res.json({
      userId,
      persona: profile.persona || "general",
      feed: personalizedStories
    });
  } catch (error) {
    return res.status(500).json({ error: "Failed to generate personalized feed" });
  }
});

app.get("/news", async (req, res) => {
  const news = await getETHeadlines();
  res.json(news);
});

app.get("/article", async (req, res) => {
  const { url, mode } = req.query;
  const content = await getArticleContent(url, { mode });
  res.json({ content });
});

const resolveContent = async ({ content, url, mode }) => {
  if (content && content.trim()) {
    return content;
  }

  if (url && url.trim()) {
    return getArticleContent(url, { mode });
  }

  return null;
};

app.get("/summarize", async (req, res) => {
  try {
    const { content, url, mode } = req.query;
    const userId = getUserIdFromRequest(req);
    const resolvedContent = await resolveContent({ content, url, mode });

    if (!resolvedContent) {
      return res.status(400).json({
        error: "Missing input. Use /summarize?content=... or /summarize?url=..."
      });
    }

    const summaryPayload = await summarize(resolvedContent);
    await saveSummary({
      userId,
      sourceUrl: url,
      mode: mode || null,
      content: resolvedContent.slice(0, 4000),
      response: summaryPayload,
      createdAt: new Date().toISOString()
    });
    res.json(summaryPayload);
  } catch (error) {
    res.status(500).json({ error: error.message || "Failed to generate summary" });
  }
});

app.post("/summarize", async (req, res) => {
  try {
    const { content, url, mode } = req.body;
    const userId = getUserIdFromRequest(req);
    const resolvedContent = await resolveContent({ content, url, mode });

    if (!resolvedContent) {
      return res.status(400).json({
        error: "Missing input in request body. Send JSON { content } or { url }."
      });
    }

    const summaryPayload = await summarize(resolvedContent);
    await saveSummary({
      userId,
      sourceUrl: url,
      mode: mode || null,
      content: resolvedContent.slice(0, 4000),
      response: summaryPayload,
      createdAt: new Date().toISOString()
    });
    res.json(summaryPayload);
  } catch (error) {
    res.status(500).json({ error: error.message || "Failed to generate summary" });
  }
});

app.post("/chat", async (req, res) => {
  try {
    const { article, question } = req.body;
    const userId = getUserIdFromRequest(req);

    if (!article || !article.trim() || !question || !question.trim()) {
      return res.status(400).json({ error: "Missing data. Send non-empty article and question." });
    }

    const response = await groq.chat.completions.create({
      model: groqChatModel,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: "You are a financial assistant. Explain news in simple, practical terms. Give actionable insights when possible."
        },
        {
          role: "user",
          content: `Article:\n${article}\n\nQuestion:\n${question}`
        }
      ]
    });

    const answer = response.choices?.[0]?.message?.content || "No answer generated";
    await saveChatInteraction({
      userId,
      article: article.slice(0, 4000),
      question: question.slice(0, 1000),
      answer: answer.slice(0, 4000),
      createdAt: new Date().toISOString()
    });

    res.json({ answer });
  } catch (err) {
    const providerMessage = err?.error?.error?.message || err?.message || "Chat failed";
    console.error("Chat Error:", providerMessage);
    res.status(500).json({ error: providerMessage });
  }
});

app.post("/navigator", async (req, res) => {
  try {
    const userId = getUserIdFromRequest(req);
    const { topic, urls = [], mode = "detailed" } = req.body || {};
    const profile = await getProfileByUserId(userId);

    let articles = await toArticleBundleFromUrls(urls, mode);
    if (articles.length === 0) {
      articles = await toArticleBundleFromFeed(topic || "", mode);
    }

    if (articles.length === 0) {
      return res.status(400).json({ error: "Unable to build briefing context from provided or fetched articles." });
    }

    const briefing = await buildNavigatorBriefing({
      topic,
      articles,
      userProfile: profile || { userId, persona: "general" }
    });

    return res.json({
      userId,
      sources: articles.map((a) => ({ title: a.title, url: a.url })),
      briefing
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Failed to generate navigator briefing" });
  }
});

app.post("/story-arc", async (req, res) => {
  try {
    const { topic, urls = [], mode = "brief" } = req.body || {};

    let articles = await toArticleBundleFromUrls(urls, mode);
    if (articles.length === 0) {
      articles = await toArticleBundleFromFeed(topic || "", mode);
    }

    if (articles.length === 0) {
      return res.status(400).json({ error: "Unable to build story arc context from available coverage." });
    }

    const arc = await buildStoryArc({ topic, articles });
    return res.json({
      sources: articles.map((a) => ({ title: a.title, url: a.url })),
      arc
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Failed to generate story arc" });
  }
});

app.post("/vernacular", async (req, res) => {
  try {
    const { text, url, language = "Hindi", audience = "Retail investor", mode = "detailed" } = req.body || {};

    let sourceText = String(text || "").trim();
    if (!sourceText && typeof url === "string" && url.trim()) {
      sourceText = (await getArticleContent(url.trim(), { mode })) || "";
    }

    if (!sourceText) {
      return res.status(400).json({ error: "Missing text or valid article url for vernacular adaptation." });
    }

    const localized = await buildVernacularInsight({ text: sourceText, language, audience });
    return res.json(localized);
  } catch (error) {
    return res.status(500).json({ error: error.message || "Failed to generate vernacular output" });
  }
});

app.post("/video-studio", async (req, res) => {
  try {
    const { title, text, url, durationSec = 90, mode = "detailed", showSubtitles = false, language = "English" } = req.body || {};

    let sourceText = String(text || "").trim();
    if (!sourceText && typeof url === "string" && url.trim()) {
      sourceText = (await getArticleContent(url.trim(), { mode })) || "";
    }

    if (!sourceText) {
      return res.status(400).json({ error: "Missing text or valid article url for video studio." });
    }

    const script = await buildVideoStudioScript({ title, text: sourceText, durationSec });

    const languageMap = {
      english: "en",
      hindi: "hi",
      tamil: "ta",
      telugu: "te"
    };

    const ttsLang = languageMap[String(language || "english").toLowerCase()] || "en";

    const render = await renderVideoFromScript({
      script,
      durationSec: Number(durationSec) || 90,
      showSubtitles: Boolean(showSubtitles),
      language: ttsLang
    });

    return res.json({
      ...script,
      video_url: render.relativeUrl,
      with_audio: render.withAudio,
      audio_error: render.audioError
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Failed to generate video" });
  }
});

app.get("/history/summaries", async (req, res) => {
  try {
    const userId = String(req.query.userId || "").trim();
    if (!userId) {
      return res.status(400).json({ error: "Missing userId query parameter" });
    }

    const limit = parseLimit(req.query.limit, 20);
    const items = await getSummaryHistoryByUserId(userId, limit);
    return res.json({ userId, count: items.length, items });
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch summary history" });
  }
});

app.get("/history/chats", async (req, res) => {
  try {
    const userId = String(req.query.userId || "").trim();
    if (!userId) {
      return res.status(400).json({ error: "Missing userId query parameter" });
    }

    const limit = parseLimit(req.query.limit, 20);
    const items = await getChatHistoryByUserId(userId, limit);
    return res.json({ userId, count: items.length, items });
  } catch (error) {
    return res.status(500).json({ error: "Failed to fetch chat history" });
  }
});

const startServer = async () => {
  await initDb();
  app.listen(5000, () => console.log("Server running on 5000"));
};

startServer().catch((error) => {
  console.error("Failed to start server:", error.message || error);
  process.exit(1);
});