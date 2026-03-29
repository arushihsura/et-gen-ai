import { Moon, Sun } from "lucide-react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import Grainient from "./Grainient";

const navTranslations = {
  English: {
    eyebrow: "Economic Times",
    title: "ET Intelligence Desk",
    links: ["Explore", "My ET", "Story Arc Tracker", "Vernacular"],
    languages: ["English", "Hindi", "Tamil", "Telugu", "Bengali"]
  },
  Hindi: {
    eyebrow: "इकनॉमिक टाइम्स",
    title: "ईटी इंटेलिजेंस डेस्क",
    links: ["एक्सप्लोर", "माय ईटी", "स्टोरी आर्क ट्रैकर", "वर्नाक्युलर"],
    languages: ["अंग्रेज़ी", "हिंदी", "तमिल", "तेलुगु", "बंगाली"]
  },
  Tamil: {
    eyebrow: "எகனாமிக் டைம்ஸ்",
    title: "ET இன்டெலிஜென்ஸ் டெஸ்க்",
    links: ["ஆராய்", "என் ET", "ஸ்டோரி ஆர்க் டிராக்கர்", "வெர்னாகுலர்"],
    languages: ["ஆங்கிலம்", "ஹிந்தி", "தமிழ்", "தெலுங்கு", "பெங்காலி"]
  },
  Telugu: {
    eyebrow: "ఎకనామిక్ టైమ్స్",
    title: "ET ఇంటెలిజెన్స్ డెస్క్",
    links: ["ఎక్స్‌ప్లోర్", "మై ET", "స్టోరీ ఆర్క్ ట్రాకర్", "వెర్నాక్యులర్"],
    languages: ["ఇంగ్లీష్", "హిందీ", "తమిళం", "తెలుగు", "బెంగాలీ"]
  },
  Bengali: {
    eyebrow: "ইকোনমিক টাইমস",
    title: "ET ইন্টেলিজেন্স ডেস্ক",
    links: ["এক্সপ্লোর", "মাই ET", "স্টোরি আর্ক ট্র্যাকার", "ভার্নাকুলার"],
    languages: ["ইংরেজি", "হিন্দি", "তামিল", "তেলুগু", "বাংলা"]
  }
};

const links = [
  { to: "/", key: "explore" },
  { to: "/profile", key: "my-et" }
];

export default function Shell({ userId, setUserId, language, setLanguage, theme, setTheme }) {
  const navigate = useNavigate();
  const activeTranslations = navTranslations[language] || navTranslations.English;
  const baseLanguages = navTranslations.English.languages;

  const isLightTheme = theme === "light";
  const grainientColors = isLightTheme
    ? {
      color1: "#f6c6ff",
      color2: "#b7c7ff",
      color3: "#dcd3ff"
    }
    : {
      color1: "#6e126b",
      color2: "#6e58c6",
      color3: "#B19EEF"
    };

  const toggleTheme = () => {
    setTheme((current) => (current === "dark" ? "light" : "dark"));
  };

  return (
    <div className="signalx-shell">
      <div className="signalx-bg-layer" aria-hidden="true">
        <Grainient
          color1={grainientColors.color1}
          color2={grainientColors.color2}
          color3={grainientColors.color3}
          timeSpeed={0.25}
          colorBalance={0}
          warpStrength={1}
          warpFrequency={5}
          warpSpeed={2}
          warpAmplitude={50}
          blendAngle={0}
          blendSoftness={0.05}
          rotationAmount={500}
          noiseScale={2}
          grainAmount={0.1}
          grainScale={2}
          grainAnimated={false}
          contrast={1.5}
          gamma={1}
          saturation={1}
          centerX={0}
          centerY={0}
          zoom={0.9}
        />
      </div>
      <header className="signalx-navbar">
        <div className="signalx-brand" role="button" tabIndex={0} onClick={() => navigate("/")}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              navigate("/");
            }
          }}>
          <span className="signalx-logo-dot" />
          <div>
            <p className="signalx-brand-eyebrow">{activeTranslations.eyebrow}</p>
            <h1 className="signalx-brand-title">{activeTranslations.title}</h1>
          </div>
        </div>

        <nav className="signalx-nav-links">
          {links.map((link, index) => (
            <NavLink key={link.to} to={link.to} className="signalx-nav-link">
              {activeTranslations.links[index]}
            </NavLink>
          ))}
        </nav>

        <div className="signalx-nav-right">
          <select value={language} onChange={(event) => setLanguage(event.target.value)} className="signalx-lang">
            {baseLanguages.map((value, index) => (
              <option key={value} value={value}>{activeTranslations.languages[index]}</option>
            ))}
          </select>
          <button type="button" className="signalx-theme-btn" onClick={toggleTheme}>
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </button>
        </div>
      </header>

      <main className="signalx-page-wrap">
        <Outlet context={{ userId, setUserId, language, theme }} />
      </main>
    </div>
  );
}
