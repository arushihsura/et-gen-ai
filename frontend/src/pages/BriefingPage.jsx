import { useEffect, useMemo, useState } from "react";
import { PlayCircle } from "lucide-react";
import { Link, useOutletContext, useSearchParams } from "react-router-dom";
import { API_BASE, apiFetch } from "../api/client";

const languageOptions = ["English", "Hindi", "Tamil", "Telugu", "Bengali"];

const briefingUiLabels = {
  English: {
    back: "Back",
    refresh: "Refresh",
    refreshing: "Refreshing...",
    keyPoints: "Key Points",
    marketImpact: "Market Impact",
    whatToDo: "What You Should Do",
    whyMatters: "Why This Matters To You",
    watchVideo: "Watch AI Video Brief",
    buildingVideo: "Building Video...",
    changeLanguage: "Change Language",
    translating: "Translating entire briefing to",
    localContext: "Local Context",
    navigatorTitle: "News Navigator — Interactive Intelligence Briefing",
    sectorImpact: "Sector Impact",
    followUp: "Follow-up Questions",
    deepBriefingPlaceholder: "Deep navigator briefing will appear here once generated.",
    askTitle: "Ask Anything About This Story",
    askPlaceholder: "Ask about risk, sectors, decision, timeline...",
    ask: "Ask",
    thinking: "Thinking...",
    confidence: "Confidence",
    close: "Close",
    videoTitle: "AI News Video Studio",
    videoUnavailable: "Video preview unavailable.",
    engine: "Engine",
    urlRequired: "Article URL is required to build the AI briefing.",
    briefingError: "Failed to generate briefing",
    translateError: "Failed to translate this briefing",
    videoError: "Failed to generate AI video",
    answerError: "Failed to answer your question",
    noAnswer: "No answer generated",
    noMarketImpact: "No market impact available yet.",
    translationPending: "Generating full localized briefing...",
    translationUnavailable: "Localized output is not ready yet. Please refresh or change language again."
  },
  Hindi: {
    back: "वापस",
    refresh: "रीफ्रेश",
    refreshing: "रीफ्रेश हो रहा है...",
    keyPoints: "मुख्य बिंदु",
    marketImpact: "बाजार पर प्रभाव",
    whatToDo: "आपको क्या करना चाहिए",
    whyMatters: "यह आपके लिए क्यों महत्वपूर्ण है",
    watchVideo: "एआई वीडियो ब्रीफ देखें",
    buildingVideo: "वीडियो तैयार हो रहा है...",
    changeLanguage: "भाषा बदलें",
    translating: "पूरी ब्रीफिंग का अनुवाद हो रहा है",
    localContext: "स्थानीय संदर्भ",
    navigatorTitle: "न्यूज़ नेविगेटर — इंटरैक्टिव इंटेलिजेंस ब्रीफिंग",
    sectorImpact: "क्षेत्रीय प्रभाव",
    followUp: "फॉलो-अप प्रश्न",
    deepBriefingPlaceholder: "विस्तृत नेविगेटर ब्रीफिंग बनने के बाद यहां दिखेगी।",
    askTitle: "इस स्टोरी के बारे में कुछ भी पूछें",
    askPlaceholder: "जोखिम, सेक्टर, निर्णय, टाइमलाइन के बारे में पूछें...",
    ask: "पूछें",
    thinking: "सोच रहा है...",
    confidence: "विश्वास",
    close: "बंद करें",
    videoTitle: "एआई न्यूज़ वीडियो स्टूडियो",
    videoUnavailable: "वीडियो प्रीव्यू उपलब्ध नहीं है।",
    engine: "इंजन",
    urlRequired: "एआई ब्रीफिंग बनाने के लिए लेख का URL आवश्यक है।",
    briefingError: "ब्रीफिंग तैयार नहीं हो सकी",
    translateError: "इस ब्रीफिंग का अनुवाद नहीं हो सका",
    videoError: "एआई वीडियो तैयार नहीं हो सका",
    answerError: "आपके प्रश्न का उत्तर नहीं मिल सका",
    noAnswer: "कोई उत्तर तैयार नहीं हुआ",
    noMarketImpact: "अभी बाजार प्रभाव उपलब्ध नहीं है।",
    translationPending: "पूरा स्थानीयकृत ब्रीफिंग तैयार हो रहा है...",
    translationUnavailable: "स्थानीयकृत आउटपुट अभी तैयार नहीं है। कृपया रीफ्रेश करें या भाषा फिर बदलें।"
  },
  Tamil: {
    back: "திரும்ப",
    refresh: "புதுப்பி",
    refreshing: "புதுப்பிக்கப்படுகிறது...",
    keyPoints: "முக்கிய புள்ளிகள்",
    marketImpact: "சந்தை தாக்கம்",
    whatToDo: "நீங்கள் என்ன செய்ய வேண்டும்",
    whyMatters: "இது உங்களுக்கு ஏன் முக்கியம்",
    watchVideo: "AI வீடியோ பிரீஃப் பார்க்க",
    buildingVideo: "வீடியோ தயாராகிறது...",
    changeLanguage: "மொழியை மாற்று",
    translating: "முழு பிரீஃபிங் மொழிபெயர்க்கப்படுகிறது",
    localContext: "உள்ளூர் சூழல்",
    navigatorTitle: "நியூஸ் நாவிகேட்டர் — இடையூக்க நுண்ணறிவு பிரீஃபிங்",
    sectorImpact: "துறை தாக்கம்",
    followUp: "தொடர்ச்சி கேள்விகள்",
    deepBriefingPlaceholder: "விரிவான நாவிகேட்டர் பிரீஃபிங் உருவானதும் இங்கே தோன்றும்.",
    askTitle: "இந்த கதையை பற்றி எதையும் கேளுங்கள்",
    askPlaceholder: "அபாயம், துறை, முடிவு, காலவரிசை பற்றி கேளுங்கள்...",
    ask: "கேள்",
    thinking: "சிந்திக்கிறது...",
    confidence: "நம்பிக்கை",
    close: "மூடு",
    videoTitle: "AI நியூஸ் வீடியோ ஸ்டுடியோ",
    videoUnavailable: "வீடியோ முன்னோட்டம் இல்லை.",
    engine: "எஞ்சின்",
    urlRequired: "AI பிரீஃபிங் உருவாக்க கட்டுரை URL தேவை.",
    briefingError: "பிரீஃபிங் உருவாக்க இயலவில்லை",
    translateError: "இந்த பிரீஃபிங்கை மொழிபெயர்க்க இயலவில்லை",
    videoError: "AI வீடியோ உருவாக்க இயலவில்லை",
    answerError: "உங்கள் கேள்விக்கு பதில் கிடைக்கவில்லை",
    noAnswer: "பதில் உருவாக்கப்படவில்லை",
    noMarketImpact: "சந்தை தாக்கம் இதுவரை இல்லை.",
    translationPending: "முழு உள்ளூர்மயமான பிரீஃபிங் தயாராகிறது...",
    translationUnavailable: "உள்ளூர்மய வெளியீடு இன்னும் தயாராகவில்லை. புதுப்பிக்கவும் அல்லது மொழியை மீண்டும் மாற்றவும்."
  },
  Telugu: {
    back: "వెనక్కి",
    refresh: "రిఫ్రెష్",
    refreshing: "రిఫ్రెష్ అవుతోంది...",
    keyPoints: "ముఖ్యాంశాలు",
    marketImpact: "మార్కెట్ ప్రభావం",
    whatToDo: "మీరు ఏమి చేయాలి",
    whyMatters: "ఇది మీకు ఎందుకు ముఖ్యం",
    watchVideo: "AI వీడియో బ్రీఫ్ చూడండి",
    buildingVideo: "వీడియో తయారవుతోంది...",
    changeLanguage: "భాష మార్చండి",
    translating: "మొత్తం బ్రీఫింగ్ అనువదిస్తోంది",
    localContext: "స్థానిక సందర్భం",
    navigatorTitle: "న్యూస్ నావిగేటర్ — ఇంటరాక్టివ్ ఇంటెలిజెన్స్ బ్రీఫింగ్",
    sectorImpact: "సెక్టార్ ప్రభావం",
    followUp: "తదుపరి ప్రశ్నలు",
    deepBriefingPlaceholder: "డీప్ నావిగేటర్ బ్రీఫింగ్ సిద్ధమైన తర్వాత ఇక్కడ కనిపిస్తుంది.",
    askTitle: "ఈ కథ గురించి ఏదైనా అడగండి",
    askPlaceholder: "రిస్క్, సెక్టార్లు, నిర్ణయం, టైమ్‌లైన్ గురించి అడగండి...",
    ask: "అడగండి",
    thinking: "ఆలోచిస్తోంది...",
    confidence: "నమ్మకం",
    close: "మూసివేయి",
    videoTitle: "AI న్యూస్ వీడియో స్టూడియో",
    videoUnavailable: "వీడియో ప్రివ్యూ అందుబాటులో లేదు.",
    engine: "ఇంజిన్",
    urlRequired: "AI బ్రీఫింగ్ కోసం ఆర్టికల్ URL అవసరం.",
    briefingError: "బ్రీఫింగ్ రూపొందించలేకపోయాం",
    translateError: "ఈ బ్రీఫింగ్‌ను అనువదించలేకపోయాం",
    videoError: "AI వీడియో రూపొందించలేకపోయాం",
    answerError: "మీ ప్రశ్నకు సమాధానం ఇవ్వలేకపోయాం",
    noAnswer: "సమాధానం ఉత్పత్తి కాలేదు",
    noMarketImpact: "మార్కెట్ ప్రభావం ఇంకా అందుబాటులో లేదు.",
    translationPending: "పూర్తి స్థానికీకరించిన బ్రీఫింగ్ సిద్ధమవుతోంది...",
    translationUnavailable: "స్థానికీకరించిన అవుట్‌పుట్ ఇంకా సిద్ధంగా లేదు. దయచేసి రిఫ్రెష్ చేయండి లేదా భాషను మళ్లీ మార్చండి."
  },
  Bengali: {
    back: "ফিরে যান",
    refresh: "রিফ্রেশ",
    refreshing: "রিফ্রেশ হচ্ছে...",
    keyPoints: "মূল পয়েন্ট",
    marketImpact: "বাজারে প্রভাব",
    whatToDo: "আপনার কী করা উচিত",
    whyMatters: "এটি আপনার জন্য কেন গুরুত্বপূর্ণ",
    watchVideo: "AI ভিডিও ব্রিফ দেখুন",
    buildingVideo: "ভিডিও তৈরি হচ্ছে...",
    changeLanguage: "ভাষা পরিবর্তন করুন",
    translating: "পুরো ব্রিফিং অনুবাদ হচ্ছে",
    localContext: "স্থানীয় প্রেক্ষাপট",
    navigatorTitle: "নিউজ ন্যাভিগেটর — ইন্টারঅ্যাক্টিভ ইন্টেলিজেন্স ব্রিফিং",
    sectorImpact: "সেক্টর প্রভাব",
    followUp: "ফলো-আপ প্রশ্ন",
    deepBriefingPlaceholder: "ডিপ ন্যাভিগেটর ব্রিফিং তৈরি হলে এখানে দেখা যাবে।",
    askTitle: "এই স্টোরি নিয়ে যেকোনো প্রশ্ন করুন",
    askPlaceholder: "ঝুঁকি, সেক্টর, সিদ্ধান্ত, টাইমলাইন নিয়ে জিজ্ঞাসা করুন...",
    ask: "জিজ্ঞাসা করুন",
    thinking: "ভাবছে...",
    confidence: "আত্মবিশ্বাস",
    close: "বন্ধ করুন",
    videoTitle: "AI নিউজ ভিডিও স্টুডিও",
    videoUnavailable: "ভিডিও প্রিভিউ পাওয়া যায়নি।",
    engine: "ইঞ্জিন",
    urlRequired: "AI ব্রিফিং তৈরির জন্য আর্টিকেল URL প্রয়োজন।",
    briefingError: "ব্রিফিং তৈরি করা যায়নি",
    translateError: "এই ব্রিফিং অনুবাদ করা যায়নি",
    videoError: "AI ভিডিও তৈরি করা যায়নি",
    answerError: "আপনার প্রশ্নের উত্তর দেওয়া যায়নি",
    noAnswer: "কোনো উত্তর তৈরি হয়নি",
    noMarketImpact: "এখনও বাজার প্রভাব উপলব্ধ নয়।",
    translationPending: "সম্পূর্ণ স্থানীয়কৃত ব্রিফিং তৈরি হচ্ছে...",
    translationUnavailable: "স্থানীয়কৃত আউটপুট এখনও প্রস্তুত নয়। অনুগ্রহ করে রিফ্রেশ করুন অথবা আবার ভাষা পরিবর্তন করুন।"
  }
};

const actionLabelMap = {
  English: { BUY: "BUY", HOLD: "HOLD", WAIT: "WAIT", AVOID: "AVOID" },
  Hindi: { BUY: "खरीदें", HOLD: "होल्ड", WAIT: "रुकें", AVOID: "बचें" },
  Tamil: { BUY: "வாங்கவும்", HOLD: "ஹோல்ட்", WAIT: "காத்திருங்கள்", AVOID: "தவிர்க்கவும்" },
  Telugu: { BUY: "కొనండి", HOLD: "హోల్డ్", WAIT: "వేచి ఉండండి", AVOID: "దూరంగా ఉండండి" },
  Bengali: { BUY: "কিনুন", HOLD: "ধরে রাখুন", WAIT: "অপেক্ষা করুন", AVOID: "এড়িয়ে চলুন" }
};

const confidenceLabelMap = {
  English: { LOW: "Low", MEDIUM: "Medium", HIGH: "High" },
  Hindi: { LOW: "कम", MEDIUM: "मध्यम", HIGH: "उच्च" },
  Tamil: { LOW: "குறைவு", MEDIUM: "மிதமான", HIGH: "உயர்" },
  Telugu: { LOW: "తక్కువ", MEDIUM: "మధ్యస్థ", HIGH: "అధిక" },
  Bengali: { LOW: "কম", MEDIUM: "মাঝারি", HIGH: "উচ্চ" }
};

const buildArticleContext = (result, navigator) => {
  const chunks = [
    ...(result?.summary?.["Key Points"] || []),
    result?.summary?.["Market Impact"] || "",
    result?.insight || "",
    result?.relevance || "",
    navigator?.executive_summary || "",
    ...(navigator?.key_developments || [])
  ].filter(Boolean);

  return chunks.join("\n").slice(0, 3500);
};

const isEnglishHeavy = (value) => {
  const text = String(value || "").trim();
  if (!text) {
    return false;
  }

  const letters = (text.match(/[A-Za-z]/g) || []).length;
  const total = text.replace(/\s+/g, "").length || 1;
  return letters >= 10 && (letters / total) > 0.45;
};

const pickLocalizedValue = ({ options, nonEnglish, fallbackText }) => {
  for (const option of options) {
    const value = String(option || "").trim();
    if (!value) {
      continue;
    }

    if (nonEnglish && isEnglishHeavy(value)) {
      continue;
    }

    return value;
  }

  return fallbackText;
};

const pickLocalizedList = ({ options, nonEnglish, fallbackList }) => {
  for (const option of options) {
    if (!Array.isArray(option) || option.length === 0) {
      continue;
    }

    const cleaned = option.map((item) => String(item || "").trim()).filter(Boolean);
    if (cleaned.length === 0) {
      continue;
    }

    if (nonEnglish) {
      const englishHeavyCount = cleaned.filter((item) => isEnglishHeavy(item)).length;
      if (englishHeavyCount > 0) {
        continue;
      }
    }

    return cleaned;
  }

  return fallbackList;
};

export default function BriefingPage() {
  const { userId, language } = useOutletContext();
  const [searchParams] = useSearchParams();

  const initialUrl = searchParams.get("url") || "";
  const initialTitle = searchParams.get("title") || "Business Intelligence Briefing";
  const initialMode = searchParams.get("mode") || "detailed";
  const url = initialUrl;
  const title = initialTitle;
  const mode = initialMode;

  const [summaryResult, setSummaryResult] = useState(null);
  const [navigatorResult, setNavigatorResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [selectedLanguage, setSelectedLanguage] = useState(language || "English");
  const [vernacularResult, setVernacularResult] = useState(null);
  const [vernacularLoading, setVernacularLoading] = useState(false);
  const [vernacularError, setVernacularError] = useState("");

  const [videoLoading, setVideoLoading] = useState(false);
  const [videoError, setVideoError] = useState("");
  const [videoResult, setVideoResult] = useState(null);
  const [showVideoModal, setShowVideoModal] = useState(false);

  const [chatQuestion, setChatQuestion] = useState("");
  const [chatAnswer, setChatAnswer] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  const uiLanguage = useMemo(() => {
    return languageOptions.includes(selectedLanguage) ? selectedLanguage : "English";
  }, [selectedLanguage]);

  const labels = useMemo(() => {
    return briefingUiLabels[uiLanguage] || briefingUiLabels.English;
  }, [uiLanguage]);

  const isNonEnglishMode = uiLanguage !== "English";

  const decisionToneClass = useMemo(() => {
    const riskText = String(summaryResult?.summary?.["Risk Level"] || "").toLowerCase();
    if (riskText.includes("high")) {
      return "risk-high";
    }
    if (riskText.includes("low")) {
      return "risk-low";
    }
    return "risk-medium";
  }, [summaryResult]);

  const runBriefing = async () => {
    if (!url.trim()) {
      setError(labels.urlRequired);
      return;
    }

    try {
      setLoading(true);
      setError("");

      const [summaryData, navData] = await Promise.all([
        apiFetch(`/summarize?userId=${encodeURIComponent(userId || "guest")}&url=${encodeURIComponent(url)}&mode=${encodeURIComponent(mode)}`),
        apiFetch("/navigator", {
          method: "POST",
          body: JSON.stringify({
            userId,
            topic: title,
            urls: [url],
            mode
          })
        })
      ]);

      setSummaryResult(summaryData);
      setNavigatorResult(navData?.briefing || null);
      setVernacularResult(null);
      setChatAnswer("");
      setVideoResult(null);
    } catch (err) {
      setError(err.message || labels.briefingError);
    } finally {
      setLoading(false);
    }
  };

  const runVernacular = async (targetLanguage) => {
    if (!summaryResult) {
      return;
    }

    if (targetLanguage === "English") {
      setVernacularResult(null);
      setVernacularError("");
      return;
    }

    try {
      setVernacularLoading(true);
      setVernacularError("");

      // Build structured data for comprehensive translation
      const structured = {
        title: title,
        keyPoints: summaryResult.summary?.["Key Points"] || [],
        marketImpact: summaryResult.summary?.["Market Impact"] || "",
        insight: summaryResult.insight || "",
        relevance: summaryResult.relevance || "",
        navigatorSummary: navigatorResult?.executive_summary || "",
        keyDevelopments: navigatorResult?.key_developments || []
        ,followUpQuestions: navigatorResult?.follow_up_questions || []
      };

      const data = await apiFetch("/vernacular", {
        method: "POST",
        body: JSON.stringify({
          url,
          language: targetLanguage,
          audience: "Retail investor",
          mode: "detailed",
          structured
        })
      });

      setVernacularResult(data);
    } catch (err) {
      setVernacularError(err.message || labels.translateError);
    } finally {
      setVernacularLoading(false);
    }
  };

  const openVideo = async () => {
    if (!summaryResult) {
      return;
    }

    try {
      setVideoLoading(true);
      setVideoError("");
      const sourceText = buildArticleContext(summaryResult, navigatorResult);

      const data = await apiFetch("/video-studio", {
        method: "POST",
        body: JSON.stringify({
          title,
          url,
          text: sourceText,
          durationSec: 90,
          mode: "detailed",
          language: selectedLanguage,
          showSubtitles: true,
          renderEngine: "storyboard"
        })
      });

      setVideoResult(data);
      setShowVideoModal(true);
    } catch (err) {
      setVideoError(err.message || labels.videoError);
    } finally {
      setVideoLoading(false);
    }
  };

  const askQuestion = async () => {
    if (!chatQuestion.trim() || !summaryResult) {
      return;
    }

    try {
      setChatLoading(true);
      const article = buildArticleContext(summaryResult, navigatorResult);
      const data = await apiFetch("/chat", {
        method: "POST",
        body: JSON.stringify({
          userId,
          article,
          question: chatQuestion
        })
      });

      setChatAnswer(data.answer || labels.noAnswer);
    } catch (err) {
      setChatAnswer(err.message || labels.answerError);
    } finally {
      setChatLoading(false);
    }
  };

  useEffect(() => {
    if (initialUrl) {
      runBriefing();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialUrl, userId]);

  useEffect(() => {
    setSelectedLanguage(language || "English");
  }, [language]);

  const translatedFollowUps = useMemo(() => {
    if (Array.isArray(vernacularResult?.follow_up_questions_translated) && vernacularResult.follow_up_questions_translated.length > 0) {
      return vernacularResult.follow_up_questions_translated;
    }

    return navigatorResult?.follow_up_questions || [];
  }, [vernacularResult, navigatorResult]);

  const translatedKeyPoints = useMemo(() => {
    return pickLocalizedList({
      options: [
        vernacularResult?.key_points_translated,
        vernacularResult?.key_points,
        summaryResult?.summary?.["Key Points"]
      ],
      nonEnglish: isNonEnglishMode,
      fallbackList: isNonEnglishMode ? [labels.translationUnavailable] : (summaryResult?.summary?.["Key Points"] || [])
    });
  }, [vernacularResult, summaryResult, isNonEnglishMode, labels.translationUnavailable]);

  const translatedMarketImpact = useMemo(() => {
    return pickLocalizedValue({
      options: [
        vernacularResult?.market_impact_translated,
        vernacularResult?.explainer,
        summaryResult?.summary?.["Market Impact"]
      ],
      nonEnglish: isNonEnglishMode,
      fallbackText: isNonEnglishMode ? labels.translationUnavailable : labels.noMarketImpact
    });
  }, [vernacularResult, summaryResult, isNonEnglishMode, labels.noMarketImpact, labels.translationUnavailable]);

  const translatedInsight = useMemo(() => {
    return pickLocalizedValue({
      options: [
        vernacularResult?.insight_translated,
        vernacularResult?.explainer,
        summaryResult?.insight
      ],
      nonEnglish: isNonEnglishMode,
      fallbackText: isNonEnglishMode ? labels.translationUnavailable : ""
    });
  }, [vernacularResult, summaryResult, isNonEnglishMode, labels.translationUnavailable]);

  const translatedRelevance = useMemo(() => {
    return pickLocalizedValue({
      options: [
        vernacularResult?.relevance_translated,
        vernacularResult?.local_context,
        summaryResult?.relevance
      ],
      nonEnglish: isNonEnglishMode,
      fallbackText: isNonEnglishMode ? labels.translationUnavailable : ""
    });
  }, [vernacularResult, summaryResult, isNonEnglishMode, labels.translationUnavailable]);

  const translatedNavigatorSummary = useMemo(() => {
    return pickLocalizedValue({
      options: [
        vernacularResult?.navigator_summary_translated,
        vernacularResult?.explainer,
        navigatorResult?.executive_summary
      ],
      nonEnglish: isNonEnglishMode,
      fallbackText: isNonEnglishMode ? labels.translationUnavailable : ""
    });
  }, [vernacularResult, navigatorResult, isNonEnglishMode, labels.translationUnavailable]);

  const translatedDevelopments = useMemo(() => {
    return pickLocalizedList({
      options: [
        vernacularResult?.key_developments_translated,
        vernacularResult?.key_points,
        navigatorResult?.key_developments
      ],
      nonEnglish: isNonEnglishMode,
      fallbackList: isNonEnglishMode ? [labels.translationUnavailable] : (navigatorResult?.key_developments || [])
    });
  }, [vernacularResult, navigatorResult, isNonEnglishMode, labels.translationUnavailable]);

  const localizedDecisionAction = useMemo(() => {
    const raw = String(summaryResult?.decision?.suggested_action || "HOLD").toUpperCase();
    const map = actionLabelMap[uiLanguage] || actionLabelMap.English;
    return map[raw] || raw;
  }, [summaryResult, uiLanguage]);

  const localizedConfidenceValue = useMemo(() => {
    const raw = String(summaryResult?.decision?.confidence || "Medium").toUpperCase();
    const map = confidenceLabelMap[uiLanguage] || confidenceLabelMap.English;
    return map[raw] || summaryResult?.decision?.confidence || "Medium";
  }, [summaryResult, uiLanguage]);

  const localizedTitle = useMemo(() => {
    return pickLocalizedValue({
      options: [
        vernacularResult?.title_translated,
        vernacularResult?.headline_localized,
        title
      ],
      nonEnglish: isNonEnglishMode,
      fallbackText: isNonEnglishMode ? labels.translationPending : title
    });
  }, [vernacularResult, title, isNonEnglishMode, labels.translationPending]);

  useEffect(() => {
    if (!summaryResult) {
      return;
    }

    if (selectedLanguage === "English") {
      return;
    }

    const shouldRetranslate = !vernacularResult || isEnglishHeavy(JSON.stringify(vernacularResult));
    if (shouldRetranslate && !vernacularLoading) {
      runVernacular(selectedLanguage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [summaryResult, selectedLanguage]);

  return (
    <section className="signalx-story-page">
      <article className="panel panel-span">
        <div className="signalx-story-back-row">
          <Link to="/" className="signalx-back-link">← {labels.back}</Link>
          <button onClick={runBriefing} disabled={loading || !url.trim()}>
            {loading ? labels.refreshing : labels.refresh}
          </button>
        </div>

        {error ? <p className="error">{error}</p> : null}
      </article>

      {summaryResult ? (
        <article className="panel panel-span signalx-story-card">
          <h2>
            {localizedTitle}
            {selectedLanguage !== "English" && <span className="lang-badge">{selectedLanguage}</span>}
          </h2>
          <p className={`signalx-decision-pill ${decisionToneClass}`}>
            {localizedDecisionAction} • {localizedConfidenceValue} {labels.confidence}
          </p>

          <div className="signalx-section-grid">
            <section className="signalx-section">
              <h3>{labels.keyPoints}</h3>
              <ul>
                {translatedKeyPoints.map((point, idx) => (
                  <li key={idx}>{point}</li>
                ))}
              </ul>
            </section>

            <section className="signalx-section">
              <h3>{labels.marketImpact}</h3>
              <p>{translatedMarketImpact}</p>
            </section>

            <section className="signalx-section">
              <h3>{labels.whatToDo}</h3>
              <p>{translatedInsight}</p>
            </section>

            <section className="signalx-section">
              <h3>{labels.whyMatters}</h3>
              <p>{translatedRelevance}</p>
            </section>
          </div>

          <div className="signalx-story-actions">
            <button onClick={openVideo} disabled={videoLoading}>
              <PlayCircle size={16} style={{ marginRight: 6, verticalAlign: "text-bottom" }} />
              {videoLoading ? labels.buildingVideo : labels.watchVideo}
            </button>

            <label className="signalx-lang-control">
              {labels.changeLanguage}
              <select
                value={selectedLanguage}
                onChange={(event) => {
                  const next = event.target.value;
                  setSelectedLanguage(next);
                  runVernacular(next);
                }}
              >
                {languageOptions.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
            </label>
          </div>

          {videoError ? <p className="error">{videoError}</p> : null}
          {vernacularLoading ? <p className="status">{labels.translating} {selectedLanguage}...</p> : null}
          {vernacularError ? <p className="error">{vernacularError}</p> : null}

          {vernacularResult?.local_context ? (
            <section className="signalx-section">
              <h3>{labels.localContext} ({selectedLanguage})</h3>
              <p className="tiny">{vernacularResult.local_context}</p>
            </section>
          ) : null}

          <section className="signalx-section">
            <h3>{labels.navigatorTitle}</h3>
            {navigatorResult ? (
              <>
                <p>{translatedNavigatorSummary}</p>
                <h4>{labels.sectorImpact}</h4>
                <ul>
                  {translatedDevelopments.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
                <h4>{labels.followUp}</h4>
                <div className="tab-row">
                  {translatedFollowUps.map((question, idx) => (
                    <button key={idx} className="chip" onClick={() => setChatQuestion(question)}>{question}</button>
                  ))}
                </div>
              </>
            ) : (
              <p className="tiny">{labels.deepBriefingPlaceholder}</p>
            )}
          </section>

          <section className="signalx-section">
            <h3>{labels.askTitle}</h3>
            <div className="signalx-chat-row">
              <input
                value={chatQuestion}
                onChange={(event) => setChatQuestion(event.target.value)}
                placeholder={labels.askPlaceholder}
              />
              <button onClick={askQuestion} disabled={chatLoading}>{chatLoading ? labels.thinking : labels.ask}</button>
            </div>
            {chatAnswer ? <p className="signalx-chat-answer">{chatAnswer}</p> : null}
          </section>
        </article>
      ) : null}

      {showVideoModal ? (
        <div className="signalx-modal-backdrop" role="presentation" onClick={() => setShowVideoModal(false)}>
          <div className="signalx-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <div className="panel-head">
              <h3>{labels.videoTitle}</h3>
              <button onClick={() => setShowVideoModal(false)}>{labels.close}</button>
            </div>
            {videoResult?.video_url ? (
              <video controls preload="metadata" width="100%" src={`${API_BASE}${videoResult.video_url}`} />
            ) : (
              <p>{labels.videoUnavailable}</p>
            )}
            <p className="tiny">{videoResult?.render_engine ? `${labels.engine}: ${videoResult.render_engine}` : ""}</p>
          </div>
        </div>
      ) : null}
    </section>
  );
}
