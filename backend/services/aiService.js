const Groq = require("groq-sdk");

const groq = new Groq({
  apiKey: process.env.GROQ_API_KEY
});
const groqModel = process.env.GROQ_MODEL || "llama-3.1-8b-instant";

const defaultPayload = {
  summary: {
    "Key Points": [],
    "Market Impact": "",
    "Risk Level": "Medium - Unclear market direction",
    "Who is affected": []
  },
  insight: "No actionable insight available",
  relevance: "No relevance statement available",
  decision: {
    suggested_action: "Wait",
    confidence: "Low",
    reason: "Insufficient confidence from source content"
  },
  time_horizon: {
    short_term: "Volatility likely in the near term.",
    long_term: "Fundamentals should guide long-term decisions."
  },
  suggested_questions: [
    "Should I invest now?",
    "Is this risky long-term?",
    "Which sectors benefit?"
  ],
  risk_color: "yellow"
};

const deriveRiskColor = (riskText = "") => {
  const normalized = String(riskText).toLowerCase();

  if (normalized.includes("high")) {
    return "red";
  }

  if (normalized.includes("low")) {
    return "green";
  }

  return "yellow";
};

const ensureArray = (value, fallback = []) => {
  if (Array.isArray(value)) {
    return value.filter(Boolean).map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value === "string" && value.trim()) {
    return value
      .split(/\n|,|\u2022|-\s/)
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return fallback;
};

const normalizePayload = (raw = {}) => {
  const summaryCandidate = typeof raw.summary === "object" && raw.summary !== null
    ? raw.summary
    : {};

  const keyPoints = ensureArray(
    summaryCandidate["Key Points"] || summaryCandidate.keyPoints,
    defaultPayload.summary["Key Points"]
  );

  const affected = ensureArray(
    summaryCandidate["Who is affected"] || summaryCandidate.whoIsAffected,
    defaultPayload.summary["Who is affected"]
  );

  const riskLevel = String(
    summaryCandidate["Risk Level"] || summaryCandidate.riskLevel || defaultPayload.summary["Risk Level"]
  ).trim();

  const normalized = {
    summary: {
      "Key Points": keyPoints,
      "Market Impact": String(
        summaryCandidate["Market Impact"] || summaryCandidate.marketImpact || defaultPayload.summary["Market Impact"]
      ).trim(),
      "Risk Level": riskLevel,
      "Who is affected": affected
    },
    insight: String(raw.insight || defaultPayload.insight).trim(),
    relevance: String(raw.relevance || defaultPayload.relevance).trim(),
    decision: {
      suggested_action: String(
        raw.decision?.suggested_action || defaultPayload.decision.suggested_action
      ).trim(),
      confidence: String(raw.decision?.confidence || defaultPayload.decision.confidence).trim(),
      reason: String(raw.decision?.reason || defaultPayload.decision.reason).trim()
    },
    time_horizon: {
      short_term: String(
        raw.time_horizon?.short_term || defaultPayload.time_horizon.short_term
      ).trim(),
      long_term: String(
        raw.time_horizon?.long_term || defaultPayload.time_horizon.long_term
      ).trim()
    },
    suggested_questions: ensureArray(raw.suggested_questions, defaultPayload.suggested_questions),
    risk_color: deriveRiskColor(riskLevel)
  };

  return normalized;
};

const buildPrompt = (trimmedText) => {
  return `You are a financial news analyst.

Analyze the article and respond in this format:

Key Points:
- ...
- ...
- ...

Market Impact:
(1-2 lines)

Actionable Insight:
(What should an investor actually do?)

Risk Level:
(Low/Medium/High with reason)

Who is affected:
(list)

Decision:
- Suggested Action (Buy / Hold / Wait / Avoid)
- Confidence (Low/Medium/High)
- Reason (1 line)

Time Horizon:
- short_term
- long_term

Suggested Questions:
- 3 brief questions a retail investor might ask next

Explain why this matters to a retail investor interested in long-term investing.

Return ONLY valid JSON with exactly these keys:
{
  "summary": {
    "Key Points": ["...", "...", "..."],
    "Market Impact": "...",
    "Risk Level": "Low/Medium/High with reason",
    "Who is affected": ["...", "..."]
  },
  "insight": "Actionable Insight content",
  "relevance": "Why this matters to a long-term retail investor",
  "decision": {
    "suggested_action": "Buy/Hold/Wait/Avoid",
    "confidence": "Low/Medium/High",
    "reason": "..."
  },
  "time_horizon": {
    "short_term": "...",
    "long_term": "..."
  },
  "suggested_questions": ["...", "...", "..."]
}

Article:
${trimmedText}`;
};

const parseModelOutput = (rawOutput) => {
  if (!rawOutput || !rawOutput.trim()) {
    return defaultPayload;
  }

  try {
    return normalizePayload(JSON.parse(rawOutput));
  } catch (err) {
    const start = rawOutput.indexOf("{");
    const end = rawOutput.lastIndexOf("}");

    if (start !== -1 && end !== -1 && end > start) {
      try {
        return normalizePayload(JSON.parse(rawOutput.slice(start, end + 1)));
      } catch (nestedErr) {
        // Fall through to plain-text fallback.
      }
    }

    const fallback = {
      ...defaultPayload,
      summary: {
        ...defaultPayload.summary,
        "Key Points": [rawOutput.trim()]
      }
    };

    return normalizePayload(fallback);
  }
};

exports.summarize = async (text) => {
  try {
    if (!process.env.GROQ_API_KEY) {
      throw new Error("Missing GROQ_API_KEY in .env");
    }

    if (!text || !text.trim()) {
      throw new Error("No content provided for summarization");
    }

    const trimmedText = text.slice(0, 3000);

    const res = await groq.chat.completions.create({
      model: groqModel,
      temperature: 0.2,
      messages: [
        {
          role: "user",
          content: buildPrompt(trimmedText)
        }
      ]
    });

    const rawOutput = res.choices?.[0]?.message?.content || "";
    return parseModelOutput(rawOutput);

  } catch (err) {
    const providerMessage =
      err?.error?.error?.message ||
      err?.message ||
      "Unknown summarization error";

    console.error("Groq Error:", providerMessage);
    throw new Error(providerMessage);
  }
};

exports.generateScript = async (text) => {
  if (!process.env.GROQ_API_KEY) {
    throw new Error("Missing GROQ_API_KEY in .env");
  }

  if (!text || !String(text).trim()) {
    throw new Error("No content provided for script generation");
  }

  const trimmedText = String(text).slice(0, 4000);

  const videoScriptModel = process.env.GROQ_VIDEO_MODEL || groqModel || "llama-3.1-8b-instant";

  const res = await groq.chat.completions.create({
    model: videoScriptModel,
    temperature: 0.4,
    messages: [
      {
        role: "user",
        content: `
Convert this news into a 60-second video script.

Format:
- Hook (1 line)
- 3 key points
- Conclusion

Keep it engaging and simple.

Article:
${trimmedText}
`
      }
    ]
  });

  const content = res.choices?.[0]?.message?.content;
  if (!content || !content.trim()) {
    throw new Error("Failed to generate video script");
  }

  return content.trim();
};