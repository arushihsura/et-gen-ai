import { Link } from "react-router-dom";

const features = [
  {
    title: "AI Personalized Newsroom",
    subtitle: "My ET",
    description: "Adaptive feed based on your profile, risk, sectors, and portfolio signals.",
    to: "/home",
    badge: "Core"
  },
  {
    title: "AI Decision Dashboard",
    subtitle: "Article",
    description: "Convert any story into action, risk, time horizon, and clear next steps.",
    to: "/article",
    badge: "Action"
  },
  {
    title: "Intelligence Assistant",
    subtitle: "Chat",
    description: "Ask practical follow-up questions and get fast context-aware answers.",
    to: "/chat",
    badge: "Interactive"
  },
  {
    title: "Deep Briefing Mode",
    subtitle: "Navigator",
    description: "Synthesize many articles into one explorable AI briefing.",
    to: "/navigator",
    badge: "Synthesis"
  },
  {
    title: "Story Arc Tracker",
    subtitle: "Timeline",
    description: "Track key players, sentiment shifts, contrarian takes, and what comes next.",
    to: "/story-arc",
    badge: "Narrative"
  },
  {
    title: "AI News Video Studio",
    subtitle: "Video",
    description: "Generate 60-120 second voiceover and visual scripts from business news.",
    to: "/video-studio",
    badge: "Multiformat"
  },
  {
    title: "Vernacular Engine",
    subtitle: "Localization",
    description: "Context-aware business explainers in Hindi, Tamil, Telugu, and Bengali.",
    to: "/vernacular",
    badge: "India-first"
  },
  {
    title: "Profile & Memory",
    subtitle: "Personalization",
    description: "Set your investor signals and revisit summary/chat history anytime.",
    to: "/profile",
    badge: "Persistent"
  }
];

export default function LandingPage() {
  return (
    <section className="landing">
      <article className="landing-hero panel panel-span">
        <p className="eyebrow">NEXT-GEN BUSINESS INTELLIGENCE</p>
        <h2 className="landing-title">Stop Reading Headlines. Start Making Decisions.</h2>
        <p className="landing-sub">
          SignalX turns static business news into personalized, interactive, multi-format intelligence.
        </p>
        <div className="landing-cta-row">
          <Link className="cta-link" to="/home">Open Personalized Newsroom</Link>
          <Link className="cta-link ghost" to="/navigator">Try AI Briefing</Link>
        </div>
      </article>

      <div className="feature-grid">
        {features.map((feature) => (
          <Link className="feature-card" to={feature.to} key={feature.title}>
            <span className="feature-badge">{feature.badge}</span>
            <p className="feature-subtitle">{feature.subtitle}</p>
            <h3>{feature.title}</h3>
            <p>{feature.description}</p>
            <span className="feature-link">Open</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
