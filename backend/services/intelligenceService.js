const Groq = require("groq-sdk");

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const model = process.env.GROQ_MODEL || "llama-3.1-8b-instant";

const stripCodeFences = (text = "") => {
  return text
    .replace(/^\s*```json\s*/i, "")
    .replace(/^\s*```\s*/i, "")
    .replace(/\s*```\s*$/i, "")
    .trim();
};

const safeJsonParse = (rawText, fallback) => {
  if (!rawText || !rawText.trim()) {
    return fallback;
  }

  const cleaned = stripCodeFences(rawText);

  try {
    return JSON.parse(cleaned);
  } catch (err) {
    const start = cleaned.indexOf("{");
    const end = cleaned.lastIndexOf("}");

    if (start !== -1 && end !== -1 && end > start) {
      try {
        return JSON.parse(cleaned.slice(start, end + 1));
      } catch (nestedErr) {
        return fallback;
      }
    }

    return fallback;
  }
};

const completeJsonTask = async (prompt, fallback) => {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("Missing GROQ_API_KEY in .env");
  }

  let result;

  try {
    result = await groq.chat.completions.create({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: "Return valid JSON only. Do not include markdown code fences."
        },
        {
          role: "user",
          content: prompt
        }
      ]
    });
  } catch (err) {
    // Retry without response_format for models that do not support it.
    result = await groq.chat.completions.create({
      model,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content: "Return valid JSON only. Do not include markdown code fences."
        },
        {
          role: "user",
          content: prompt
        }
      ]
    });
  }

  const raw = result.choices?.[0]?.message?.content || "";
  return safeJsonParse(raw, fallback);
};

const toArticleContext = (articles = []) => {
  return articles
    .map((item, idx) => {
      return `Article ${idx + 1}:\nTitle: ${item.title || "Untitled"}\nURL: ${item.url || "N/A"}\nContent: ${(item.content || "").slice(0, 1800)}`;
    })
    .join("\n\n");
};

exports.buildNavigatorBriefing = async ({ topic, articles, userProfile }) => {
  const fallback = {
    topic: topic || "Business update",
    executive_summary: "Not enough data to generate briefing.",
    key_developments: [],
    market_impact: "Unclear from available coverage.",
    decisions: {
      suggested_action: "Wait",
      confidence: "Low",
      reason: "Insufficient article context"
    },
    follow_up_questions: [
      "What changed since last week?",
      "Which sector is most exposed?",
      "What should I watch next?"
    ],
    watch_next: []
  };

  const prompt = `
You are News Navigator, an AI business editor.

Create one synthesized intelligence briefing from multiple business articles.

User profile:
${JSON.stringify(userProfile || {}, null, 2)}

Target topic: ${topic || "Business headlines"}

Articles:
${toArticleContext(articles)}

Return JSON with exact keys:
{
  "topic": "...",
  "executive_summary": "2-4 lines",
  "key_developments": ["...", "...", "..."],
  "market_impact": "...",
  "decisions": {
    "suggested_action": "Buy/Hold/Wait/Avoid",
    "confidence": "Low/Medium/High",
    "reason": "..."
  },
  "follow_up_questions": ["...", "...", "..."],
  "watch_next": ["...", "...", "..."]
}
`;

  return completeJsonTask(prompt, fallback);
};

exports.buildStoryArc = async ({ topic, articles }) => {
  const fallback = {
    topic: topic || "Business story",
    timeline: [],
    key_players: [],
    sentiment_shift: "Neutral",
    contrarian_views: [],
    predictions: []
  };

  const prompt = `
You are Story Arc Tracker.

Build a concise visual narrative from ongoing story coverage.

Story topic: ${topic || "Business story"}

Articles:
${toArticleContext(articles)}

Return JSON with exact keys:
{
  "topic": "...",
  "timeline": [
    { "time_label": "...", "event": "...", "impact": "..." }
  ],
  "key_players": ["...", "..."],
  "sentiment_shift": "Positive/Neutral/Negative with reason",
  "contrarian_views": ["...", "..."],
  "predictions": ["...", "..."]
}
`;

  return completeJsonTask(prompt, fallback);
};

exports.buildVernacularInsight = async ({ text, language, audience }) => {
  const fallback = {
    language: language || "Hindi",
    headline_localized: "Localized briefing unavailable",
    explainer: "No localized explanation available.",
    key_points: [],
    local_context: "No local context available."
  };

  const prompt = `
You are Vernacular Business News Engine.

Translate and culturally adapt the following English business news into ${language || "Hindi"}.
Audience: ${audience || "Retail investor"}.
Do not do literal translation; make it context-aware and practical.

Input text:
${(text || "").slice(0, 3500)}

Return JSON with exact keys:
{
  "language": "${language || "Hindi"}",
  "headline_localized": "...",
  "explainer": "...",
  "key_points": ["...", "...", "..."],
  "local_context": "..."
}
`;

  return completeJsonTask(prompt, fallback);
};

exports.buildVideoStudioScript = async ({ title, text, durationSec }) => {
  const seconds = Number.isFinite(durationSec) ? durationSec : 90;

  const fallback = {
    title: title || "Business News Update",
    duration_sec: seconds,
    voiceover_script: "Voiceover script unavailable.",
    visual_plan: [],
    overlays: [],
    closing_line: "Stay informed for the next update."
  };

  const prompt = `
You are AI News Video Studio.

Create a short-form script for a ${seconds}-second business news video.
Title: ${title || "Business News Update"}

Source:
${(text || "").slice(0, 3500)}

Return JSON with exact keys:
{
  "title": "...",
  "duration_sec": ${seconds},
  "voiceover_script": "...",
  "visual_plan": [
    { "time": "0-15s", "scene": "...", "animation": "..." }
  ],
  "overlays": ["...", "..."],
  "closing_line": "..."
}
`;

  return completeJsonTask(prompt, fallback);
};
