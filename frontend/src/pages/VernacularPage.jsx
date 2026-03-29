import { useMemo, useState } from "react";
import { Globe2, Languages, Sparkles } from "lucide-react";
import { useOutletContext } from "react-router-dom";
import { apiFetch } from "../api/client";

export default function VernacularPage() {
  const { language: appLanguage } = useOutletContext();
  const supportedLanguages = ["Hindi", "Tamil", "Telugu", "Bengali"];
  const defaultLanguage = supportedLanguages.includes(appLanguage) ? appLanguage : "Hindi";

  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [language, setLanguage] = useState(defaultLanguage);
  const [audience, setAudience] = useState("Retail investor");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const languageHints = useMemo(() => ({
    Hindi: "Practical Hindi for retail investors; keeps finance terms like SIP and repo rate natural.",
    Tamil: "Tamil with clear investor wording and market context relevant to regional industries.",
    Telugu: "Telugu with straightforward, actionable investor context and business clarity.",
    Bengali: "Bengali with local market framing and easy explanatory tone for non-experts."
  }), []);

  const uiLabels = useMemo(() => ({
    Hindi: {
      title: "स्थानीय बिज़नेस न्यूज़ इंजन",
      intro: "ET बिज़नेस न्यूज़ का रियल-टाइम, संदर्भ-आधारित अनुवाद हिंदी, तमिल, तेलुगु और बंगाली में।",
      keyPoints: "स्थानीय मुख्य बिंदु",
      localContext: "स्थानीय संदर्भ",
      glossary: "बिज़नेस शब्दावली",
      structured: "संरचित अनुवाद फ़ील्ड",
      fullText: "पूरा स्थानीयकृत लेख",
      caution: "सावधानी",
      adaptation: "अनुकूलन नोट्स",
      sourceIntegrity: "स्रोत विश्वसनीयता",
      titleField: "शीर्षक",
      marketImpact: "मार्केट प्रभाव",
      insight: "इनसाइट",
      relevance: "प्रासंगिकता",
      keyDevelopments: "मुख्य विकास"
    },
    Tamil: {
      title: "உள்ளூர் வணிக செய்திகள் இயந்திரம்",
      intro: "ET வணிக செய்திகளை இந்தி, தமிழ், தெலுங்கு, பெங்காலியில் நேரடி சூழல் அடிப்படையிலான மொழிபெயர்ப்பு.",
      keyPoints: "உள்ளூர்மயமான முக்கிய புள்ளிகள்",
      localContext: "உள்ளூர் சூழல்",
      glossary: "வணிக சொற்களஞ்சியம்",
      structured: "வடிவமைக்கப்பட்ட மொழிபெயர்ப்பு புலங்கள்",
      fullText: "முழு உள்ளூர்மயமான கட்டுரை",
      caution: "எச்சரிக்கை",
      adaptation: "உள்ளூர்மய ஏற்பு குறிப்புகள்",
      sourceIntegrity: "மூல நம்பகத்தன்மை",
      titleField: "தலைப்பு",
      marketImpact: "சந்தை தாக்கம்",
      insight: "ஆழ்ந்த பார்வை",
      relevance: "பொருத்தம்",
      keyDevelopments: "முக்கிய முன்னேற்றங்கள்"
    },
    Telugu: {
      title: "స్థానిక వ్యాపార వార్తల ఇంజిన్",
      intro: "ET ఆంగ్ల వ్యాపార వార్తలను హిందీ, తమిళం, తెలుగు, బెంగాలీలో రియల్-టైమ్ సందర్భానుసారంగా అనువదించండి.",
      keyPoints: "స్థానికీకరించిన ముఖ్యాంశాలు",
      localContext: "స్థానిక సందర్భం",
      glossary: "వ్యాపార పదకోశం",
      structured: "సంఘటిత అనువాద ఫీల్డులు",
      fullText: "పూర్తి స్థానికీకరించిన వ్యాసం",
      caution: "జాగ్రత్త",
      adaptation: "అనుకరణ గమనికలు",
      sourceIntegrity: "మూల విశ్వసనీయత",
      titleField: "శీర్షిక",
      marketImpact: "మార్కెట్ ప్రభావం",
      insight: "ఇన్‌సైట్",
      relevance: "సంబంధితత",
      keyDevelopments: "ముఖ్య పరిణామాలు"
    },
    Bengali: {
      title: "স্থানীয় ব্যবসায়িক সংবাদ ইঞ্জিন",
      intro: "ET-এর ইংরেজি ব্যবসায়িক সংবাদকে হিন্দি, তামিল, তেলেগু ও বাংলা ভাষায় রিয়েল-টাইম প্রাসঙ্গিক অনুবাদ।",
      keyPoints: "স্থানীয়কৃত মূল পয়েন্ট",
      localContext: "স্থানীয় প্রেক্ষাপট",
      glossary: "ব্যবসায়িক শব্দতালিকা",
      structured: "কাঠামোবদ্ধ অনুবাদ ক্ষেত্র",
      fullText: "সম্পূর্ণ স্থানীয়কৃত নিবন্ধ",
      caution: "সতর্কতা",
      adaptation: "অভিযোজন নোট",
      sourceIntegrity: "উৎসের নির্ভরযোগ্যতা",
      titleField: "শিরোনাম",
      marketImpact: "বাজারে প্রভাব",
      insight: "ইনসাইট",
      relevance: "প্রাসঙ্গিকতা",
      keyDevelopments: "মূল উন্নয়ন"
    }
  }), []);

  const localContextFallback = useMemo(() => ({
    Hindi: "Retail investors ke liye local context: RBI policy, SIP flows aur inflation trend ko saath me dekhkar decision lein.",
    Tamil: "Retail investors-kku local context: vatti vigitham, savings flow, manufacturing signals matrum household demand trends-ai serthu paarungal.",
    Telugu: "Retail investors కోసం local context: వడ్డీ రేట్లు, SIP ప్రవాహాలు, IT-ఫార్మా-ఇన్ఫ్రా సంకేతాలు, వినియోగ ధోరణులను కలిపి చూడండి.",
    Bengali: "Retail investors-er jonne local context: suder har, savings flow, demand trend ebong SME cash-flow ekshathe dekhe decision nin."
  }), []);

  const displayLocalContext = useMemo(() => {
    const value = String(result?.local_context || "").trim();
    if (!value || value.toLowerCase() === "no local context available.") {
      const selectedLanguage = supportedLanguages.includes(result?.language) ? result.language : language;
      return localContextFallback[selectedLanguage] || localContextFallback.Hindi;
    }

    return value;
  }, [result, language, supportedLanguages, localContextFallback]);

  const activeLabels = useMemo(() => {
    const selectedLanguage = supportedLanguages.includes(result?.language) ? result.language : language;
    return uiLabels[selectedLanguage] || uiLabels.Hindi;
  }, [result, language, supportedLanguages, uiLabels]);

  const fullLocalizedArticle = useMemo(() => {
    const fullText = String(result?.full_article_localized || "").trim();
    if (fullText) {
      return fullText;
    }

    const fromParagraphs = Array.isArray(result?.paragraphs_localized)
      ? result.paragraphs_localized.map((item) => String(item || "").trim()).filter(Boolean).join("\n\n")
      : "";

    if (fromParagraphs) {
      return fromParagraphs;
    }

    const fallback = [
      String(result?.explainer || "").trim(),
      ...(Array.isArray(result?.key_points) ? result.key_points.map((item) => String(item || "").trim()) : [])
    ].filter(Boolean).join("\n\n");

    return fallback;
  }, [result]);

  const generate = async () => {
    const cleanUrl = url.trim();
    const cleanText = text.trim();

    if (!cleanUrl && !cleanText) {
      setError("Add an ET article URL or paste article text to translate.");
      return;
    }

    try {
      setLoading(true);
      setError("");
      const data = await apiFetch("/vernacular", {
        method: "POST",
        body: JSON.stringify({ url: cleanUrl, text: cleanText, language, audience, mode: "detailed" })
      });
      setResult(data);
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
          <div>
            <p className="tiny" style={{ margin: 0 }}>Real-time ET localization</p>
            <h2 style={{ marginTop: 4 }}>{activeLabels.title}</h2>
          </div>
          <button onClick={generate} disabled={loading}>{loading ? "Translating..." : "Generate"}</button>
        </div>

        <p className="tiny" style={{ marginTop: 0 }}>
          {activeLabels.intro}
        </p>

        <div className="fields" style={{ marginBottom: 12 }}>
          <label>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Languages size={14} /> Language</span>
            <select value={language} onChange={(e) => setLanguage(e.target.value)}>
              {supportedLanguages.map((item) => <option key={item}>{item}</option>)}
            </select>
          </label>

          <label>
            <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Sparkles size={14} /> Audience</span>
            <input value={audience} onChange={(e) => setAudience(e.target.value)} placeholder="Retail investor" />
          </label>
        </div>

        <p className="tiny" style={{ marginTop: -4 }}>{languageHints[language]}</p>

        <label>
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Globe2 size={14} /> ET article URL</span>
          <input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://economictimes..." />
        </label>

        <label>
          Or paste article text
          <textarea value={text} onChange={(e) => setText(e.target.value)} rows={8} placeholder="Paste the English business article content here..." />
        </label>

        {error ? <p className="error">{error}</p> : null}

        {result ? (
          <div className="panel-grid" style={{ marginTop: 12 }}>
            <div className="result-box">
              <p className="tiny" style={{ marginTop: 0 }}>
                {result.language} translation • {result.translation_mode || "text"} mode • {result.latency_ms || "-"} ms
              </p>
              <h3>{result.headline_localized}</h3>
              <p>{result.explainer}</p>
            </div>

              {fullLocalizedArticle ? (
                <div className="result-box" style={{ whiteSpace: "pre-wrap" }}>
                  <h4>{activeLabels.fullText}</h4>
                  <p>{fullLocalizedArticle}</p>
                </div>
              ) : null}

            <div className="result-box">
                <h4>{activeLabels.keyPoints}</h4>
              <ul>{(result.key_points || []).map((item, idx) => <li key={idx}>{item}</li>)}</ul>
              {result.caution ? (
                  <p className="tiny"><strong>{activeLabels.caution}:</strong> {result.caution}</p>
              ) : null}
            </div>

            <div className="result-box">
                <h4>{activeLabels.localContext}</h4>
              <p>{displayLocalContext}</p>
              {result.cultural_adaptation_notes ? (
                  <p className="tiny"><strong>{activeLabels.adaptation}:</strong> {result.cultural_adaptation_notes}</p>
              ) : null}
                <p className="tiny"><strong>{activeLabels.sourceIntegrity}:</strong> {result.source_integrity || "Medium"}</p>
            </div>

            {(result.glossary || []).length > 0 ? (
              <div className="result-box">
                  <h4>{activeLabels.glossary}</h4>
                <ul>
                  {(result.glossary || []).map((item, idx) => (
                    <li key={`glossary-${idx}`}>
                      <strong>{item.term_en}</strong> - {item.term_local}
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {(result.title_translated || result.market_impact_translated || result.insight_translated || result.relevance_translated || (result.key_developments_translated || []).length > 0) ? (
              <div className="result-box">
                <h4>{activeLabels.structured}</h4>
                {result.title_translated ? <p><strong>{activeLabels.titleField}:</strong> {result.title_translated}</p> : null}
                {result.market_impact_translated ? <p><strong>{activeLabels.marketImpact}:</strong> {result.market_impact_translated}</p> : null}
                {result.insight_translated ? <p><strong>{activeLabels.insight}:</strong> {result.insight_translated}</p> : null}
                {result.relevance_translated ? <p><strong>{activeLabels.relevance}:</strong> {result.relevance_translated}</p> : null}
                {(result.key_developments_translated || []).length > 0 ? (
                  <>
                    <h4>{activeLabels.keyDevelopments}</h4>
                    <ul>
                      {(result.key_developments_translated || []).map((item, idx) => <li key={`dev-${idx}`}>{item}</li>)}
                    </ul>
                  </>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </article>
    </section>
  );
}
