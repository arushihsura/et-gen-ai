const express = require("express");
const cors = require("cors");
const Groq = require("groq-sdk");
require("dotenv").config();

const { getETHeadlines, getArticleContent } = require("./services/scraper");
const { summarize, generateScript } = require("./services/aiService");
const {
  buildNavigatorBriefing,
  buildNavigatorFollowUp,
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
const navigatorCache = new Map();
const NAVIGATOR_CACHE_TTL_MS = 15 * 60 * 1000;

const buildNavigatorCacheKey = ({ userId, topic, urls, mode }) => {
  const normalizedUrls = Array.isArray(urls)
    ? urls.map((item) => String(item || "").trim()).filter(Boolean).sort()
    : [];

  return JSON.stringify({
    userId: String(userId || "guest"),
    topic: String(topic || "").trim().toLowerCase(),
    urls: normalizedUrls,
    mode: String(mode || "detailed")
  });
};

const getNavigatorCache = (key) => {
  const hit = navigatorCache.get(key);
  if (!hit) {
    return null;
  }

  if (Date.now() - hit.createdAt > NAVIGATOR_CACHE_TTL_MS) {
    navigatorCache.delete(key);
    return null;
  }

  return hit.payload;
};

const setNavigatorCache = (key, payload) => {
  navigatorCache.set(key, {
    createdAt: Date.now(),
    payload
  });
};

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

const SENTIMENT_LEXICON = {
  positive: [
    "surge",
    "rally",
    "gain",
    "growth",
    "beat",
    "record",
    "profit",
    "rise",
    "upside",
    "improve",
    "expands"
  ],
  negative: [
    "fall",
    "slump",
    "drop",
    "miss",
    "loss",
    "risk",
    "volatile",
    "uncertain",
    "decline",
    "cuts",
    "slowdown"
  ]
};

const toArticleSentiment = (article = {}, ref = 1) => {
  const title = String(article.title || "");
  const content = String(article.content || "");
  const text = `${title} ${content}`.toLowerCase();

  const positiveHits = SENTIMENT_LEXICON.positive.filter((word) => text.includes(word)).length;
  const negativeHits = SENTIMENT_LEXICON.negative.filter((word) => text.includes(word)).length;

  let sentiment = "Neutral";
  if (positiveHits > negativeHits) {
    sentiment = "Positive";
  } else if (negativeHits > positiveHits) {
    sentiment = "Negative";
  }

  const confidence = Math.max(positiveHits, negativeHits) >= 3
    ? "High"
    : Math.max(positiveHits, negativeHits) === 2
      ? "Medium"
      : "Low";

  const reason = sentiment === "Neutral"
    ? "Mixed or limited directional cues in this article."
    : sentiment === "Positive"
      ? `Positive cues (${positiveHits}) outweighed negative cues (${negativeHits}).`
      : `Negative cues (${negativeHits}) outweighed positive cues (${positiveHits}).`;

  return {
    source_ref: ref,
    title,
    url: String(article.url || ""),
    sentiment,
    confidence,
    reason
  };
};

const buildFallbackStoryArc = ({ topic, articles = [] }) => {
  const top = articles.slice(0, 5);
  const timeline = top.map((article, index) => ({
    time_label: `Step ${index + 1}`,
    event: String(article.title || `Source ${index + 1}`),
    impact: "Signal extracted from recent coverage"
  }));

  const sentimentTrail = top.map((article, index) => {
    const localSentiment = toArticleSentiment(article, index + 1);
    return {
      time_label: `Step ${index + 1}`,
      sentiment: localSentiment.sentiment,
      reason: localSentiment.reason || "Derived from lexical sentiment fallback"
    };
  });

  const keyEntities = {
    countries: [],
    companies: [],
    people: [],
    sectors: []
  };

  return {
    topic: String(topic || "Market Narrative").trim() || "Market Narrative",
    story_title: "Coverage Narrative (Fallback)",
    timeline,
    key_players: [],
    key_entities: keyEntities,
    sentiment_trail: sentimentTrail,
    sentiment_shift: sentimentTrail.length > 0
      ? `${sentimentTrail[sentimentTrail.length - 1].sentiment} (fallback)`
      : "Neutral (fallback)",
    contrarian_view: "Provider unavailable. Use source-level evidence and verify with fresh updates.",
    contrarian_views: [
      "Cross-check each claim against multiple market sources before acting."
    ],
    watch_next: [
      "Policy updates",
      "Earnings revisions",
      "Liquidity and volatility shifts"
    ],
    predictions: [
      "Short-term uncertainty may persist until new directional catalysts emerge."
    ],
    fallback: true
  };
};

const tokenize = (value = "") => {
  return String(value)
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .map((token) => token.trim())
    .filter(Boolean);
};

const PERSONA_KEYWORDS = {
  founder: [
    "startup",
    "founder",
    "vc",
    "funding",
    "ipo",
    "ai",
    "policy",
    "regulation",
    "competition",
    "acquisition"
  ],
  student: [
    "education",
    "edtech",
    "career",
    "learning",
    "internship",
    "skill",
    "startup",
    "technology",
    "economy"
  ],
  investor: [
    "market",
    "stocks",
    "shares",
    "nifty",
    "sensex",
    "earnings",
    "valuation",
    "fund",
    "returns",
    "ipo"
  ]
};

const getPersonaKeywords = (persona = "") => {
  const normalized = String(persona).trim().toLowerCase();
  if (!normalized) {
    return [];
  }

  for (const [key, keywords] of Object.entries(PERSONA_KEYWORDS)) {
    if (normalized.includes(key)) {
      return keywords;
    }
  }

  return tokenize(persona);
};

const rankArticleForProfile = (article, profile) => {
  const title = String(article.title || "");
  const titleLower = title.toLowerCase();
  const titleTokens = new Set(tokenize(title));
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

  const personaKeywords = getPersonaKeywords(profile.persona);
  const matchedPersonaKeywords = personaKeywords.filter((keyword) => {
    const normalizedKeyword = keyword.toLowerCase();
    return titleLower.includes(normalizedKeyword) || titleTokens.has(normalizedKeyword);
  });

  if (matchedPersonaKeywords.length > 0) {
    score += matchedPersonaKeywords.length * 2;
    reasons.push(`Relevant for ${profile.persona}: ${matchedPersonaKeywords.slice(0, 3).join(", ")}`);
  } else if (profile.persona) {
    reasons.push(`Prioritized for ${profile.persona} profile`);
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
  const topicLower = String(topic || "").toLowerCase().trim();
  const topicTokens = topicLower
    .split(/[^a-z0-9]+/)
    .map((token) => token.trim())
    .filter((token) => token.length >= 4)
    .slice(0, 6);

  let candidates = headlines
    .filter((item) => !topicLower || item.title.toLowerCase().includes(topicLower))
    .slice(0, 8);

  if (candidates.length === 0 && topicTokens.length > 0) {
    candidates = headlines
      .filter((item) => {
        const titleLower = item.title.toLowerCase();
        return topicTokens.some((token) => titleLower.includes(token));
      })
      .slice(0, 8);
  }

  if (candidates.length === 0) {
    candidates = headlines.slice(0, 8);
  }

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
    const limit = parseLimit(req.query.limit, 30);

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
      .slice(0, limit);

    return res.json({
      userId,
      persona: profile.persona || "general",
      limit,
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

const toSlideLines = (text = "") => {
  return String(text)
    .split("\n")
    .map((line) => line.replace(/^[-*\d.)\s]+/, "").trim())
    .filter(Boolean);
};

const buildSlidesFromScript = (script = "") => {
  const lines = toSlideLines(script);
  if (lines.length === 0) {
    return [];
  }

  const hook = lines[0] || "Top market update";
  const body = lines.slice(1, 6);
  const conclusion = lines[lines.length - 1] || "Stay informed for the next move.";

  const slides = [
    {
      title: hook,
      subtitle: "60-sec AI Brief"
    }
  ];

  body.forEach((line, idx) => {
    slides.push({
      title: `Point ${idx + 1}`,
      subtitle: line
    });
  });

  slides.push({
    title: "What this means",
    subtitle: conclusion
  });

  return slides.slice(0, 6);
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
    const { topic, urls = [], mode = "detailed", forceRefresh = false } = req.body || {};
    const profile = await getProfileByUserId(userId);

    const cacheKey = buildNavigatorCacheKey({ userId, topic, urls, mode });
    if (!forceRefresh) {
      const cached = getNavigatorCache(cacheKey);
      if (cached) {
        return res.json({ ...cached, cached: true });
      }
    }

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

    const sourceMap = articles.map((article, index) => ({
      ref: index + 1,
      title: article.title,
      url: article.url,
      snippet: String(article.content || "").replace(/\s+/g, " ").trim().slice(0, 220)
    }));

    const payload = {
      userId,
      topic: briefing.topic || topic || "Business update",
      source_count: sourceMap.length,
      source_map: sourceMap,
      sources: sourceMap.map((item) => ({ title: item.title, url: item.url })),
      briefing,
      cached: false
    };

    setNavigatorCache(cacheKey, payload);

    return res.json(payload);
  } catch (error) {
    return res.status(500).json({ error: error.message || "Failed to generate navigator briefing" });
  }
});

app.post("/navigator/ask", async (req, res) => {
  try {
    const userId = getUserIdFromRequest(req);
    const { topic, briefing, source_map: sourceMap = [], question, selected_section: selectedSection } = req.body || {};

    if (!question || !String(question).trim()) {
      return res.status(400).json({ error: "Missing question for follow-up." });
    }

    if (!briefing || typeof briefing !== "object") {
      return res.status(400).json({ error: "Missing briefing context for follow-up." });
    }

    const profile = await getProfileByUserId(userId);
    const answer = await buildNavigatorFollowUp({
      topic,
      briefing,
      question: String(question).trim(),
      selectedSection,
      sourceMap,
      userProfile: profile || { userId, persona: "general" }
    });

    return res.json(answer);
  } catch (error) {
    return res.status(500).json({ error: error.message || "Failed to answer navigator follow-up" });
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

    let arc;
    try {
      arc = await buildStoryArc({ topic, articles });
    } catch (providerError) {
      console.error("[story-arc] Provider failure, using fallback arc:", providerError?.message || providerError);
      arc = buildFallbackStoryArc({ topic, articles });
    }
    const fallbackArticleSentiments = articles.map((article, index) => toArticleSentiment(article, index + 1));
    const normalizedArticleSentiments = Array.isArray(arc?.article_sentiments)
      ? arc.article_sentiments
        .map((item, index) => ({
          source_ref: Number.parseInt(item?.source_ref, 10) || index + 1,
          title: String(item?.title || articles[index]?.title || `Source ${index + 1}`),
          url: String(item?.url || articles[index]?.url || ""),
          sentiment: String(item?.sentiment || fallbackArticleSentiments[index]?.sentiment || "Neutral"),
          confidence: String(item?.confidence || fallbackArticleSentiments[index]?.confidence || "Low"),
          reason: String(item?.reason || fallbackArticleSentiments[index]?.reason || "")
        }))
        .slice(0, articles.length)
      : fallbackArticleSentiments;

    return res.json({
      sources: articles.map((a) => ({ title: a.title, url: a.url })),
      arc: {
        ...arc,
        article_sentiments: normalizedArticleSentiments
      }
    });
  } catch (error) {
    console.error("[story-arc] Route failure:", error?.stack || error?.message || error);
    return res.status(500).json({ error: error.message || "Failed to generate story arc" });
  }
});

app.post("/story-arc/ask", async (req, res) => {
  try {
    const userId = getUserIdFromRequest(req);
    const { question, arc, topic, sources = [] } = req.body || {};

    const cleanQuestion = String(question || "").trim();
    if (!cleanQuestion) {
      return res.status(400).json({ error: "Missing question for story arc follow-up." });
    }

    if (!arc || typeof arc !== "object") {
      return res.status(400).json({ error: "Missing story arc context for follow-up." });
    }

    const sourceList = Array.isArray(sources)
      ? sources.map((item, idx) => {
        if (typeof item === "string") {
          return { ref: idx + 1, title: `Source ${idx + 1}`, url: item };
        }

        return {
          ref: idx + 1,
          title: String(item?.title || `Source ${idx + 1}`),
          url: String(item?.url || "")
        };
      }).filter((item) => item.url)
      : [];

    const profile = await getProfileByUserId(userId);

    const response = await groq.chat.completions.create({
      model: groqChatModel,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: "You are a financial intelligence assistant. Answer using the provided story arc only. Be concise, practical, and mention uncertainty when evidence is weak."
        },
        {
          role: "user",
          content: `User profile:\n${JSON.stringify(profile || { userId, persona: "general" }, null, 2)}\n\nStory topic: ${topic || arc?.story_title || arc?.topic || "Business story"}\n\nStory arc JSON:\n${JSON.stringify(arc, null, 2)}\n\nSources:\n${JSON.stringify(sourceList, null, 2)}\n\nQuestion:\n${cleanQuestion}\n\nReturn JSON only with keys:\n{\n  "answer": "3-6 concise lines",\n  "confidence": "Low/Medium/High",\n  "follow_up_questions": ["...", "..."]\n}`
        }
      ],
      response_format: { type: "json_object" }
    });

    let parsed;
    try {
      parsed = JSON.parse(response.choices?.[0]?.message?.content || "{}");
    } catch (error) {
      parsed = { answer: response.choices?.[0]?.message?.content || "No answer generated.", confidence: "Low", follow_up_questions: [] };
    }

    return res.json({
      answer: String(parsed.answer || "No answer generated."),
      confidence: String(parsed.confidence || "Low"),
      follow_up_questions: Array.isArray(parsed.follow_up_questions) ? parsed.follow_up_questions.slice(0, 4) : []
    });
  } catch (error) {
    const providerMessage = error?.error?.error?.message || error?.message || "Failed to answer story arc question";
    return res.status(500).json({ error: providerMessage });
  }
});

app.post("/vernacular", async (req, res) => {
  try {
    const startedAt = Date.now();
    const { text, url, language = "Hindi", audience = "Retail investor", mode = "detailed", structured } = req.body || {};
    const supportedLanguages = ["Hindi", "Tamil", "Telugu", "Bengali"];
    const normalizedLanguage = String(language || "Hindi").trim();

    if (!supportedLanguages.includes(normalizedLanguage)) {
      return res.status(400).json({
        error: "Unsupported language. Use one of: Hindi, Tamil, Telugu, Bengali."
      });
    }

    let sourceText = String(text || "").trim();
    if (!sourceText && typeof url === "string" && url.trim()) {
      sourceText = (await getArticleContent(url.trim(), { mode })) || "";
    }

    // If structured data provided, use it; otherwise fall back to text
    if (structured && typeof structured === "object" && Object.keys(structured).length > 0) {
      const localized = await buildVernacularInsight({ language: normalizedLanguage, audience, structured });
      return res.json({
        ...localized,
        translation_mode: "structured",
        generated_at: new Date().toISOString(),
        latency_ms: Date.now() - startedAt
      });
    }

    if (!sourceText) {
      return res.status(400).json({ error: "Missing text or valid article url for vernacular adaptation." });
    }

    const localized = await buildVernacularInsight({ text: sourceText, language: normalizedLanguage, audience });
    return res.json({
      ...localized,
      translation_mode: "text",
      generated_at: new Date().toISOString(),
      latency_ms: Date.now() - startedAt
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Failed to generate vernacular output" });
  }
});

app.post("/video-studio", async (req, res) => {
  try {
    const {
      title,
      text,
      url,
      durationSec = 90,
      mode = "detailed",
      showSubtitles = false,
      language = "English",
      renderEngine = "storyboard"
    } = req.body || {};

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
      language: ttsLang,
      renderEngine
    });

    return res.json({
      ...script,
      video_url: render.relativeUrl,
      with_audio: render.withAudio,
      audio_error: render.audioError,
      render_engine: render.renderEngine,
      visual_error: render.visualError,
      scenes: Array.isArray(render.scenes) ? render.scenes : []
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Failed to generate video" });
  }
});

app.post("/video-script", async (req, res) => {
  try {
    const { text, url, mode = "detailed" } = req.body || {};
    const sourceText = await resolveContent({
      content: String(text || "").trim(),
      url,
      mode
    });

    if (!sourceText) {
      return res.status(400).json({ error: "Missing text or valid article url for script generation." });
    }

    const script = await generateScript(sourceText);
    const slides = buildSlidesFromScript(script);

    return res.json({
      script,
      slides,
      slide_duration_ms: 3000
    });
  } catch (error) {
    return res.status(500).json({ error: error.message || "Failed to generate script" });
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