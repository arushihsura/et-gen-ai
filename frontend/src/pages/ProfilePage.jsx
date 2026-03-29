import { useEffect, useMemo, useState } from "react";
import { ArrowRight, UserRound } from "lucide-react";
import { useOutletContext } from "react-router-dom";
import { apiFetch } from "../api/client";

const defaultProfile = {
  persona: "Investor",
  sectors: "Stocks, IPOs",
  interests: "markets, valuation",
  portfolioSymbols: "HDFC,TCS",
  riskAppetite: "high",
  horizon: "long-term"
};

const presetProfiles = {
  Investor: {
    persona: "Investor",
    sectors: "Stocks, IPOs, Markets",
    interests: "value investing, fundamentals",
    portfolioSymbols: "HDFC,TCS",
    riskAppetite: "high",
    horizon: "long-term"
  },
  Student: {
    persona: "Student",
    sectors: "Education, Startups, Technology",
    interests: "learning, career, market basics",
    portfolioSymbols: "NIFTYBEES",
    riskAppetite: "medium",
    horizon: "long-term"
  },
  Founder: {
    persona: "Founder",
    sectors: "Startups, AI, Policy",
    interests: "fundraising, competition, regulations",
    portfolioSymbols: "INFY,RELIANCE",
    riskAppetite: "high",
    horizon: "short-term"
  }
};

const formatLabel = (value = "") => {
  return String(value)
    .split("-")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
};

const toChips = (value = "") => {
  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
};

export default function ProfilePage() {
  const { userId } = useOutletContext();
  const [profile, setProfile] = useState(defaultProfile);
  const [draftProfile, setDraftProfile] = useState(defaultProfile);
  const [isEditOpen, setIsEditOpen] = useState(false);
  const [status, setStatus] = useState("");

  const setField = (key, value) => setDraftProfile((prev) => ({ ...prev, [key]: value }));

  useEffect(() => {
    const loadProfile = async () => {
      if (!userId.trim()) {
        return;
      }

      try {
        const savedProfile = await apiFetch(`/profile/${encodeURIComponent(userId)}`);
        if (savedProfile && typeof savedProfile === "object") {
          const merged = {
            ...defaultProfile,
            ...savedProfile,
            sectors: Array.isArray(savedProfile.sectors) ? savedProfile.sectors.join(",") : (savedProfile.sectors || defaultProfile.sectors),
            interests: Array.isArray(savedProfile.interests) ? savedProfile.interests.join(",") : (savedProfile.interests || defaultProfile.interests),
            portfolioSymbols: Array.isArray(savedProfile.portfolioSymbols)
              ? savedProfile.portfolioSymbols.join(",")
              : (savedProfile.portfolioSymbols || defaultProfile.portfolioSymbols)
          };
          setProfile(merged);
          setDraftProfile(merged);
        }
      } catch (err) {
        // No saved profile yet; keep defaults.
      }
    };

    loadProfile();
  }, [userId]);

  const saveProfile = async (nextProfile = profile) => {
    if (!userId.trim()) {
      setStatus("User ID is required.");
      return;
    }

    try {
      setStatus("Saving profile...");
      await apiFetch("/profile", {
        method: "POST",
        body: JSON.stringify({ userId, ...nextProfile })
      });
      setStatus("Profile saved. Feed personalization updated.");
      window.dispatchEvent(new CustomEvent("profile-updated", {
        detail: { userId, persona: nextProfile.persona }
      }));
    } catch (err) {
      setStatus(err.message);
    }
  };

  const openEdit = () => {
    setDraftProfile(profile);
    setIsEditOpen(true);
  };

  const closeEdit = () => {
    setIsEditOpen(false);
  };

  const saveFromModal = async () => {
    setProfile(draftProfile);
    setIsEditOpen(false);
    await saveProfile(draftProfile);
  };

  const applyPreset = async (key) => {
    const nextProfile = presetProfiles[key];
    if (!nextProfile) {
      return;
    }

    setProfile(nextProfile);
    setDraftProfile(nextProfile);
    await saveProfile(nextProfile);
  };

  const interestsChips = useMemo(() => toChips(profile.sectors || profile.interests), [profile.interests, profile.sectors]);

  return (
    <section className="signalx-profile-page">
      <article className="panel panel-span signalx-profile-card">
        <div className="signalx-profile-header-row">
          <div>
            <p className="signalx-profile-icon"><UserRound size={14} style={{ marginRight: 6, verticalAlign: "text-bottom" }} />{profile.persona || "Investor"}</p>
            <h2>{profile.persona || "Investor"}</h2>
            <p className="signalx-profile-meta">
              {formatLabel(profile.riskAppetite)} Risk • {formatLabel(profile.horizon)}
            </p>
          </div>

          <button className="signalx-profile-edit" onClick={openEdit}>Edit Profile</button>
        </div>

        <div className="signalx-profile-quick-switches" role="group" aria-label="Profile quick switches">
          {Object.keys(presetProfiles).map((preset) => (
            <button
              key={preset}
              className={`chip ${profile.persona === preset ? "chip-active" : ""}`}
              onClick={() => applyPreset(preset)}
            >
              {preset}
            </button>
          ))}
        </div>

        <p className="signalx-profile-interest-line">Interested in:</p>
        <div className="signalx-profile-chip-row">
          {interestsChips.map((chip) => (
            <span key={chip} className="signalx-profile-chip">{chip}</span>
          ))}
        </div>

        <p className="signalx-profile-portfolio">
          Portfolio: {(profile.portfolioSymbols || "").split(",").map((item) => item.trim()).filter(Boolean).join(" • ") || "Not set"}
        </p>

        <p className="signalx-profile-ai-understanding">
          We tailor news based on your profile:
          <ArrowRight size={13} style={{ margin: "0 6px", verticalAlign: "text-bottom" }} />
          Focus: {formatLabel(profile.interests || "value investing")}
          <ArrowRight size={13} style={{ margin: "0 6px", verticalAlign: "text-bottom" }} />
          Risk: {formatLabel(profile.riskAppetite || "high")}
        </p>

        <p className="status">{status}</p>
      </article>

      {isEditOpen ? (
        <div className="signalx-modal-backdrop" role="presentation" onClick={closeEdit}>
          <div className="signalx-modal signalx-profile-modal" role="dialog" aria-modal="true" onClick={(event) => event.stopPropagation()}>
            <div className="panel-head">
              <h3>Edit Your Profile</h3>
              <button onClick={closeEdit}>Close</button>
            </div>

            <div className="fields">
              <label>
                Persona
                <select value={draftProfile.persona} onChange={(e) => setField("persona", e.target.value)}>
                  <option value="Investor">Investor</option>
                  <option value="Student">Student</option>
                  <option value="Founder">Founder</option>
                </select>
              </label>

              <label>
                Risk
                <select value={draftProfile.riskAppetite} onChange={(e) => setField("riskAppetite", e.target.value)}>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                </select>
              </label>

              <label>
                Horizon
                <select value={draftProfile.horizon} onChange={(e) => setField("horizon", e.target.value)}>
                  <option value="short-term">Short-term</option>
                  <option value="long-term">Long-term</option>
                </select>
              </label>

              <label>
                Interests
                <input value={draftProfile.interests} onChange={(e) => setField("interests", e.target.value)} placeholder="value investing, growth, macro" />
              </label>

              <label>
                Sectors (comma separated)
                <input value={draftProfile.sectors} onChange={(e) => setField("sectors", e.target.value)} placeholder="Stocks, IPOs, Markets" />
              </label>

              <label>
                Portfolio
                <input value={draftProfile.portfolioSymbols} onChange={(e) => setField("portfolioSymbols", e.target.value)} placeholder="HDFC,TCS" />
              </label>
            </div>

            <button className="cta" onClick={saveFromModal}>Save</button>
          </div>
        </div>
      ) : null}
    </section>
  );
}
