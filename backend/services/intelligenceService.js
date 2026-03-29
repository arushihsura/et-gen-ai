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

const normalizeSourceRefs = (refs = [], maxSource = 8) => {
  const values = Array.isArray(refs) ? refs : [];
  const seen = new Set();

  return values
    .map((value) => Number.parseInt(value, 10))
    .filter((value) => Number.isInteger(value) && value >= 1 && value <= maxSource)
    .filter((value) => {
      if (seen.has(value)) {
        return false;
      }
      seen.add(value);
      return true;
    });
};

exports.buildNavigatorBriefing = async ({ topic, articles, userProfile }) => {
  const sourceCount = Array.isArray(articles) ? articles.length : 0;

  const fallback = {
    topic: topic || "Business update",
    executive_summary: "Not enough data to generate briefing.",
    key_developments: [],
    market_impact: "Unclear from available coverage.",
    sections: [],
    claim_cards: [],
    timeline: [],
    opportunities: [],
    risks: [],
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
  "sections": [
    {
      "id": "overview|impact|risk|watch",
      "title": "...",
      "summary": "...",
      "source_refs": [1, 2]
    }
  ],
  "claim_cards": [
    {
      "claim": "one factual synthesized claim",
      "why_it_matters": "why this claim matters for a retail or long-term investor",
      "source_refs": [1, 3]
    }
  ],
  "timeline": [
    {
      "label": "Now / This week / Next quarter",
      "event": "...",
      "why_it_matters": "...",
      "source_refs": [2, 4]
    }
  ],
  "opportunities": ["...", "..."],
  "risks": ["...", "..."],
  "decisions": {
    "suggested_action": "Buy/Hold/Wait/Avoid",
    "confidence": "Low/Medium/High",
    "reason": "..."
  },
  "follow_up_questions": ["...", "...", "..."],
  "watch_next": ["...", "...", "..."]
}

Rules:
- source_refs must only reference valid article numbers from 1 to ${sourceCount}.
- Keep each list concise and non-redundant.
- Keep language practical and investor-friendly.
`;

  const briefing = await completeJsonTask(prompt, fallback);

  briefing.sections = Array.isArray(briefing.sections) ? briefing.sections : [];
  briefing.sections = briefing.sections.map((section, idx) => ({
    id: String(section?.id || `section-${idx + 1}`),
    title: String(section?.title || `Section ${idx + 1}`),
    summary: String(section?.summary || ""),
    source_refs: normalizeSourceRefs(section?.source_refs, sourceCount)
  }));

  briefing.claim_cards = Array.isArray(briefing.claim_cards) ? briefing.claim_cards : [];
  briefing.claim_cards = briefing.claim_cards.map((card) => ({
    claim: String(card?.claim || ""),
    why_it_matters: String(card?.why_it_matters || ""),
    source_refs: normalizeSourceRefs(card?.source_refs, sourceCount)
  })).filter((card) => card.claim);

  briefing.timeline = Array.isArray(briefing.timeline) ? briefing.timeline : [];
  briefing.timeline = briefing.timeline.map((item) => ({
    label: String(item?.label || "Update"),
    event: String(item?.event || ""),
    why_it_matters: String(item?.why_it_matters || ""),
    source_refs: normalizeSourceRefs(item?.source_refs, sourceCount)
  })).filter((item) => item.event);

  briefing.opportunities = Array.isArray(briefing.opportunities) ? briefing.opportunities.slice(0, 6) : [];
  briefing.risks = Array.isArray(briefing.risks) ? briefing.risks.slice(0, 6) : [];

  if (!Array.isArray(briefing.follow_up_questions)) {
    briefing.follow_up_questions = fallback.follow_up_questions;
  }

  if (!Array.isArray(briefing.watch_next)) {
    briefing.watch_next = [];
  }

  return briefing;
};

exports.buildNavigatorFollowUp = async ({ topic, briefing, question, selectedSection, sourceMap, userProfile }) => {
  const fallback = {
    answer: "I could not derive a grounded answer from the briefing. Try a more specific question.",
    confidence: "Low",
    cited_source_refs: [],
    follow_up_questions: []
  };

  const sourceCount = Array.isArray(sourceMap) ? sourceMap.length : 0;

  const prompt = `
You are News Navigator Q&A assistant.

Answer the user question strictly grounded in the synthesized briefing and its source map.

User profile:
${JSON.stringify(userProfile || {}, null, 2)}

Topic: ${topic || "Business update"}
Selected section: ${selectedSection || "overview"}
Question: ${question}

Briefing JSON:
${JSON.stringify(briefing || {}, null, 2)}

Source map:
${JSON.stringify(sourceMap || [], null, 2)}

Return JSON:
{
  "answer": "3-6 concise lines",
  "confidence": "Low/Medium/High",
  "cited_source_refs": [1, 2],
  "follow_up_questions": ["...", "..."]
}

Rules:
- Only cite source refs from 1 to ${sourceCount}.
- If evidence is weak, explicitly mention uncertainty.
- Keep answer practical and decision-oriented.
`;

  const response = await completeJsonTask(prompt, fallback);
  response.cited_source_refs = normalizeSourceRefs(response.cited_source_refs, sourceCount);
  response.follow_up_questions = Array.isArray(response.follow_up_questions)
    ? response.follow_up_questions.slice(0, 4)
    : [];
  response.answer = String(response.answer || fallback.answer);
  response.confidence = String(response.confidence || "Low");

  return response;
};

exports.buildStoryArc = async ({ topic, articles }) => {
  const fallback = {
    topic: topic || "Business story",
    story_title: topic || "Business story",
    timeline: [],
    key_players: [],
    key_entities: {
      countries: [],
      companies: [],
      people: [],
      sectors: []
    },
    sentiment_trail: [],
    article_sentiments: [],
    sentiment_shift: "Neutral",
    contrarian_view: "No contrarian view available.",
    contrarian_views: [],
    watch_next: [],
    predictions: []
  };

  const prompt = `
You are Story Arc Tracker.

Build a concise visual narrative from ongoing story coverage.
This is a transformation pipeline:
1) Detect one unified story topic from all articles.
2) Extract timeline events.
3) Extract entities.
4) Track sentiment over time.
5) Provide contrarian perspective.
6) Provide what-to-watch-next signals.

Story topic: ${topic || "Business story"}

Articles:
${toArticleContext(articles)}

Return JSON with exact keys:
{
  "topic": "detected clustered story topic",
  "story_title": "short visual title",
  "timeline": [
    { "time_label": "Day 1 / Today / etc", "event": "...", "impact": "..." }
  ],
  "key_players": ["flattened list of major players"],
  "key_entities": {
    "countries": ["..."],
    "companies": ["..."],
    "people": ["..."],
    "sectors": ["..."]
  },
  "sentiment_trail": [
    { "time_label": "Day 1", "sentiment": "Positive/Negative/Neutral", "reason": "..." }
  ],
  "article_sentiments": [
    { "source_ref": 1, "sentiment": "Positive/Negative/Neutral", "confidence": "Low/Medium/High", "reason": "..." }
  ],
  "sentiment_shift": "Positive/Neutral/Negative with reason",
  "contrarian_view": "one concise alternative perspective",
  "contrarian_views": ["optional extra contrarian bullets"],
  "watch_next": ["3 concise watch items"],
  "predictions": ["optional prediction list (can mirror watch_next)"]
}
`;

  const arc = await completeJsonTask(prompt, fallback);

  // Backward compatibility and safety normalization.
  if (!arc.story_title) {
    arc.story_title = arc.topic || fallback.story_title;
  }
  if (!Array.isArray(arc.watch_next)) {
    arc.watch_next = Array.isArray(arc.predictions) ? arc.predictions : [];
  }
  if (!Array.isArray(arc.predictions)) {
    arc.predictions = Array.isArray(arc.watch_next) ? arc.watch_next : [];
  }
  if (!arc.contrarian_view) {
    arc.contrarian_view = Array.isArray(arc.contrarian_views) && arc.contrarian_views[0]
      ? arc.contrarian_views[0]
      : fallback.contrarian_view;
  }
  if (!Array.isArray(arc.key_players) || arc.key_players.length === 0) {
    const entities = arc.key_entities || {};
    arc.key_players = [
      ...(entities.countries || []),
      ...(entities.companies || []),
      ...(entities.people || []),
      ...(entities.sectors || [])
    ].slice(0, 10);
  }

  return arc;
};

const VERNACULAR_LANGUAGE_MAP = {
  hindi: "Hindi",
  tamil: "Tamil",
  telugu: "Telugu",
  bengali: "Bengali"
};

const VERNACULAR_LOCAL_CONTEXT_HINTS = {
  Hindi: "Include practical India context (fuel prices, RBI rates, SIP investors, MSME impact) in naturally spoken Hindi.",
  Tamil: "Adapt with Tamil Nadu context when relevant (manufacturing, auto corridor, SME exporters, household savings behavior).",
  Telugu: "Adapt with Andhra/Telangana investor context when relevant (IT services, pharma, infra and retail participation).",
  Bengali: "Adapt with East India context when relevant (trade flows, consumption trends, SME impact and risk sensitivity)."
};

const normalizeVernacularLanguage = (value) => {
  const normalized = String(value || "hindi").trim().toLowerCase();
  return VERNACULAR_LANGUAGE_MAP[normalized] || "Hindi";
};

const firstNonEmptyString = (...values) => {
  for (const value of values) {
    const normalized = String(value || "").trim();
    if (normalized) {
      return normalized;
    }
  }

  return "";
};

const buildLocalContextFallback = (language, audience) => {
  const normalizedLanguage = normalizeVernacularLanguage(language);
  const audienceLabel = String(audience || "Retail investor").trim() || "Retail investor";

  const byLanguage = {
    Hindi: `${audienceLabel} के लिए संदर्भ: RBI दरों, SIP प्रवाह, ईंधन कीमतों और रोजमर्रा की महंगाई का असर निवेश निर्णय पर ध्यान से देखें।`,
    Tamil: `${audienceLabel} க்கான உள்ளூர் பார்வை: வட்டி விகிதங்கள், சேமிப்பு ஓட்டம், உற்பத்தி/ஆட்டோ துறை சைகைகள் மற்றும் குடும்ப செலவு போக்கை சேர்த்து மதிப்பிடுங்கள்.`,
    Telugu: `${audienceLabel} కోసం స్థానిక సందర్భం: వడ్డీ రేట్లు, SIP ప్రవాహాలు, ఐటీ-ఫార్మా-ఇన్ఫ్రా రంగాల సంకేతాలు మరియు గృహ వినియోగ ధోరణులను కలిపి అంచనా వేయండి.`,
    Bengali: `${audienceLabel} এর জন্য স্থানীয় প্রেক্ষাপট: সুদের হার, সঞ্চয় প্রবাহ, ভোক্তা চাহিদা ও SME নগদ প্রবাহের দিকগুলো একসাথে দেখে সিদ্ধান্ত নিন।`
  };

  return byLanguage[normalizedLanguage] || byLanguage.Hindi;
};

const buildFullLocalizedFallback = (payload = {}, fallback = {}) => {
  const fullText = firstNonEmptyString(payload?.full_article_localized, payload?.full_brief_localized, fallback?.full_article_localized);
  if (fullText) {
    return fullText;
  }

  const explainer = firstNonEmptyString(payload?.explainer, fallback?.explainer);
  const keyPoints = Array.isArray(payload?.key_points)
    ? payload.key_points.map((item) => String(item || "").trim()).filter(Boolean)
    : (Array.isArray(fallback?.key_points) ? fallback.key_points : []);

  const synthesized = [
    explainer,
    keyPoints.length > 0 ? keyPoints.join(" ") : ""
  ].map((item) => String(item || "").trim()).filter(Boolean).join("\n\n");

  return synthesized;
};

const normalizeVernacularResponse = (payload, fallbackLanguage, fallback = {}, audience) => {
  const normalizedLanguage = normalizeVernacularLanguage(payload?.language || fallbackLanguage);
  const normalizedLocalContext = firstNonEmptyString(
    payload?.local_context,
    payload?.localContext,
    payload?.regional_context,
    payload?.context_local,
    fallback.local_context,
    buildLocalContextFallback(normalizedLanguage, audience)
  );

  const normalized = {
    language: normalizedLanguage,
    headline_localized: String(payload?.headline_localized || fallback.headline_localized || "Localized briefing unavailable"),
    explainer: String(payload?.explainer || fallback.explainer || "No localized explanation available."),
    key_points: Array.isArray(payload?.key_points)
      ? payload.key_points.slice(0, 6).map((item) => String(item))
      : (Array.isArray(fallback.key_points) ? fallback.key_points : []),
    local_context: normalizedLocalContext,
    cultural_adaptation_notes: String(payload?.cultural_adaptation_notes || ""),
    source_integrity: String(payload?.source_integrity || "Medium"),
    caution: String(payload?.caution || ""),
    glossary: Array.isArray(payload?.glossary)
      ? payload.glossary.slice(0, 6).map((item) => ({
        term_en: String(item?.term_en || ""),
        term_local: String(item?.term_local || "")
      })).filter((item) => item.term_en || item.term_local)
      : []
  };

  normalized.title_translated = String(payload?.title_translated || fallback.title_translated || "");
  normalized.key_points_translated = Array.isArray(payload?.key_points_translated)
    ? payload.key_points_translated.slice(0, 8).map((item) => String(item || "").trim()).filter(Boolean)
    : (Array.isArray(fallback.key_points_translated)
      ? fallback.key_points_translated
      : (Array.isArray(payload?.key_points)
        ? payload.key_points.slice(0, 8).map((item) => String(item || "").trim()).filter(Boolean)
        : []));
  normalized.market_impact_translated = String(payload?.market_impact_translated || fallback.market_impact_translated || "");
  normalized.insight_translated = String(payload?.insight_translated || fallback.insight_translated || "");
  normalized.relevance_translated = String(payload?.relevance_translated || fallback.relevance_translated || "");
  normalized.navigator_summary_translated = String(payload?.navigator_summary_translated || fallback.navigator_summary_translated || "");
  normalized.full_article_localized = buildFullLocalizedFallback(payload, fallback);
  normalized.paragraphs_localized = Array.isArray(payload?.paragraphs_localized)
    ? payload.paragraphs_localized.slice(0, 12).map((item) => String(item || "").trim()).filter(Boolean)
    : (Array.isArray(fallback.paragraphs_localized) ? fallback.paragraphs_localized : []);
  normalized.key_developments_translated = Array.isArray(payload?.key_developments_translated)
    ? payload.key_developments_translated.slice(0, 8).map((item) => String(item))
    : (Array.isArray(fallback.key_developments_translated) ? fallback.key_developments_translated : []);
  normalized.follow_up_questions_translated = Array.isArray(payload?.follow_up_questions_translated)
    ? payload.follow_up_questions_translated.slice(0, 6).map((item) => String(item))
    : (Array.isArray(fallback.follow_up_questions_translated) ? fallback.follow_up_questions_translated : []);

  return normalized;
};

const textLooksEnglishHeavy = (value) => {
  const text = String(value || "").trim();
  if (!text) {
    return false;
  }

  const englishLetters = (text.match(/[A-Za-z]/g) || []).length;
  const compactLength = text.replace(/\s+/g, "").length || 1;

  return englishLetters >= 10 && (englishLetters / compactLength) > 0.45;
};

const vernacularHasEnglishLeak = (payload = {}, language) => {
  const normalizedLanguage = normalizeVernacularLanguage(language);
  if (normalizedLanguage === "English") {
    return false;
  }

  const candidateStrings = [
    payload.title_translated,
    payload.headline_localized,
    payload.explainer,
    payload.market_impact_translated,
    payload.insight_translated,
    payload.relevance_translated,
    payload.navigator_summary_translated,
    payload.full_article_localized,
    payload.local_context,
    payload.cultural_adaptation_notes,
    payload.caution
  ];

  const candidateArrays = [
    payload.key_points,
    payload.key_points_translated,
    payload.key_developments_translated,
    payload.follow_up_questions_translated,
    payload.paragraphs_localized
  ];

  if (candidateStrings.some((item) => textLooksEnglishHeavy(item))) {
    return true;
  }

  return candidateArrays.some((arr) => Array.isArray(arr) && arr.some((item) => textLooksEnglishHeavy(item)));
};

const repairVernacularLanguageIfNeeded = async ({ normalizedPayload, normalizedLanguage, audience }) => {
  if (!vernacularHasEnglishLeak(normalizedPayload, normalizedLanguage)) {
    return normalizedPayload;
  }

  const repairPrompt = `
You are a strict localization editor.

Rewrite the following JSON so all user-facing content is in ${normalizedLanguage}.
Do not change factual meaning, numbers, company names, policy names, percentages, dates, or ticker references.
Keep globally recognized abbreviations such as RBI, SIP, GDP as-is when natural.

Important:
- Preserve the same JSON keys.
- Preserve array lengths where possible.
- Keep "term_en" in glossary in English, but ensure "term_local" is in ${normalizedLanguage}.
- Do not leave explanatory fields in English.

Audience: ${audience || "Retail investor"}

Input JSON:
${JSON.stringify(normalizedPayload, null, 2)}
`;

  const repaired = await completeJsonTask(repairPrompt, normalizedPayload);
  return normalizeVernacularResponse(repaired, normalizedLanguage, normalizedPayload, audience);
};

exports.buildVernacularInsight = async ({ text, language, audience, structured }) => {
  const normalizedLanguage = normalizeVernacularLanguage(language);
  const localHint = VERNACULAR_LOCAL_CONTEXT_HINTS[normalizedLanguage] || VERNACULAR_LOCAL_CONTEXT_HINTS.Hindi;

  const fallback = {
    language: normalizedLanguage,
    headline_localized: "Localized briefing unavailable",
    explainer: "No localized explanation available.",
    key_points: [],
    local_context: buildLocalContextFallback(normalizedLanguage, audience),
    title_translated: "",
    key_points_translated: [],
    market_impact_translated: "",
    insight_translated: "",
    relevance_translated: "",
    navigator_summary_translated: "",
    full_article_localized: "",
    paragraphs_localized: [],
    key_developments_translated: [],
    follow_up_questions_translated: []
  };

  // If structured data provided, translate each section.
  if (structured && typeof structured === "object") {
    const sections = [];
    if (structured.title) sections.push(`Title: ${structured.title}`);
    if (structured.keyPoints?.length) sections.push(`Key Points:\n${structured.keyPoints.join("\n")}`);
    if (structured.marketImpact) sections.push(`Market Impact: ${structured.marketImpact}`);
    if (structured.insight) sections.push(`What You Should Do: ${structured.insight}`);
    if (structured.relevance) sections.push(`Why This Matters: ${structured.relevance}`);
    if (structured.navigatorSummary) sections.push(`Navigator Summary: ${structured.navigatorSummary}`);
    if (structured.keyDevelopments?.length) sections.push(`Key Developments:\n${structured.keyDevelopments.join("\n")}`);
    if (structured.followUpQuestions?.length) sections.push(`Follow-up Questions:\n${structured.followUpQuestions.join("\n")}`);

    const structuredText = sections.join("\n\n");

    const prompt = `
You are Vernacular Business News Engine.

Translate and culturally adapt the following English business content into ${normalizedLanguage}.
Audience: ${audience || "Retail investor"}.
Do not do literal translation; make it context-aware and practical.
Preserve all critical facts and numbers exactly (percentages, prices, company names, policy names).
If a term is commonly kept in English in local usage (for example SIP, RBI repo rate), keep it or transliterate naturally.
${localHint}

Input content:
${structuredText}

Return JSON with exact keys:
{
  "language": "${normalizedLanguage}",
  "title_translated": "${structured.title ? "Translated title here" : ""}",
  "key_points_translated": [${structured.keyPoints ? `"Translated point 1", "Translated point 2"` : ""}],
  "market_impact_translated": "${structured.marketImpact ? "Translated market impact here" : ""}",
  "insight_translated": "${structured.insight ? "Translated insight here" : ""}",
  "relevance_translated": "${structured.relevance ? "Translated relevance here" : ""}",
  "navigator_summary_translated": "${structured.navigatorSummary ? "Translated navigator summary here" : ""}",
  "full_article_localized": "Complete localized rendering of the full input content in ${normalizedLanguage}",
  "paragraphs_localized": ["Localized paragraph 1", "Localized paragraph 2"],
  "key_developments_translated": [${structured.keyDevelopments ? `"Translated development 1", "Translated development 2"` : ""}],
  "follow_up_questions_translated": [${structured.followUpQuestions ? `"Translated follow-up question 1", "Translated follow-up question 2"` : ""}],
  "local_context": "Brief explanation of local context relevant to ${normalizedLanguage} investors",
  "headline_localized": "short localized headline",
  "explainer": "2-4 lines localized summary",
  "key_points": ["...", "...", "..."],
  "cultural_adaptation_notes": "How this was adapted culturally and why",
  "source_integrity": "Low/Medium/High",
  "caution": "Any uncertainty or caveat",
  "glossary": [
    { "term_en": "Repo Rate", "term_local": "..." }
  ]
}

Rules:
- Keep the output in ${normalizedLanguage}, except globally recognized finance abbreviations.
- Do not invent facts not present in input content.
- Keep investor explanation simple and practical.
- Translate the full content, not only the summary.
- Every translated field must be written in ${normalizedLanguage}; do not leave any field in English.
`;

    const translated = await completeJsonTask(prompt, fallback);
    const normalized = normalizeVernacularResponse(translated, normalizedLanguage, fallback, audience);
    return repairVernacularLanguageIfNeeded({
      normalizedPayload: normalized,
      normalizedLanguage,
      audience
    });
  }

  // Raw text mode for near real-time article translation.
  const prompt = `
You are Vernacular Business News Engine.

Translate and culturally adapt the following English business news into ${normalizedLanguage}.
Audience: ${audience || "Retail investor"}.
Do not do literal translation; make it context-aware and practical.
Preserve all important numbers exactly (prices, percentages, dates).
${localHint}

Input text:
${(text || "").slice(0, 3500)}

Return JSON with exact keys:
{
  "language": "${normalizedLanguage}",
  "headline_localized": "...",
  "explainer": "2-4 concise lines",
  "key_points": ["...", "...", "..."],
  "full_article_localized": "Complete localized translation of the full input text",
  "paragraphs_localized": ["Localized paragraph 1", "Localized paragraph 2"],
  "local_context": "...",
  "cultural_adaptation_notes": "...",
  "source_integrity": "Low/Medium/High",
  "caution": "...",
  "glossary": [
    { "term_en": "Inflation", "term_local": "..." }
  ]
}

Rules:
- Keep output language strictly ${normalizedLanguage} except standard finance abbreviations.
- Keep statements grounded in input text only.
- Prefer familiar local idioms over literal English structure.
- Translate the entire input text into localized narrative form in full_article_localized.
- Every translated field must be written in ${normalizedLanguage}; do not leave any field in English.
`;

  const translated = await completeJsonTask(prompt, fallback);
  const normalized = normalizeVernacularResponse(translated, normalizedLanguage, fallback, audience);
  return repairVernacularLanguageIfNeeded({
    normalizedPayload: normalized,
    normalizedLanguage,
    audience
  });
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
