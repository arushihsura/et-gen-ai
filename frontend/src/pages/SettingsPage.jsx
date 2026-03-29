import { useState } from "react";
import { useOutletContext } from "react-router-dom";
import { apiFetch } from "../api/client";

const initialProfile = {
  persona: "Mutual fund investor",
  sectors: "banking,it,energy",
  interests: "budget,earnings,valuation",
  portfolioSymbols: "HDFC,TCS",
  riskAppetite: "medium",
  horizon: "long-term"
};

export default function SettingsPage() {
  const { userId } = useOutletContext();
  const [profile, setProfile] = useState(initialProfile);
  const [status, setStatus] = useState("");

  const onProfileChange = (key, value) => {
    setProfile((prev) => ({ ...prev, [key]: value }));
  };

  const saveProfile = async () => {
    if (!userId.trim()) {
      setStatus("User ID is required.");
      return;
    }

    try {
      setStatus("Saving profile...");
      await apiFetch("/profile", {
        method: "POST",
        body: JSON.stringify({ userId, ...profile })
      });
      setStatus("Profile saved successfully.");
      setTimeout(() => setStatus(""), 3000);
    } catch (error) {
      setStatus(error.message);
    }
  };

  return (
    <section className="panel-grid">
      <article className="panel panel-span">
        <h2>Investor Profile</h2>
        <p className="subtitle">Customize your signals and preferences</p>
      </article>

      <article className="panel">
        <div className="panel-head">
          <h3>Profile Settings</h3>
        </div>
        <div className="fields">
          <label>
            Investor Persona
            <input
              value={profile.persona}
              onChange={(e) => onProfileChange("persona", e.target.value)}
              placeholder="e.g., Mutual fund investor"
            />
          </label>
          <label>
            Sectors of Interest
            <input
              value={profile.sectors}
              onChange={(e) => onProfileChange("sectors", e.target.value)}
              placeholder="e.g., banking,it,energy"
            />
          </label>
          <label>
            Key Interests
            <input
              value={profile.interests}
              onChange={(e) => onProfileChange("interests", e.target.value)}
              placeholder="e.g., budget,earnings,valuation"
            />
          </label>
          <label>
            Portfolio Symbols
            <input
              value={profile.portfolioSymbols}
              onChange={(e) => onProfileChange("portfolioSymbols", e.target.value)}
              placeholder="e.g., HDFC,TCS"
            />
          </label>
          <label>
            Risk Appetite
            <select
              value={profile.riskAppetite}
              onChange={(e) => onProfileChange("riskAppetite", e.target.value)}
            >
              <option value="low">Low - Conservative</option>
              <option value="medium">Medium - Balanced</option>
              <option value="high">High - Aggressive</option>
            </select>
          </label>
          <label>
            Investment Horizon
            <select
              value={profile.horizon}
              onChange={(e) => onProfileChange("horizon", e.target.value)}
            >
              <option value="short-term">Short-term (0-6 months)</option>
              <option value="medium-term">Medium-term (6-24 months)</option>
              <option value="long-term">Long-term (2+ years)</option>
            </select>
          </label>
        </div>

        <div className="field-actions">
          <button onClick={saveProfile} className="btn-primary">
            Save Profile
          </button>
          {status && <span className="status-message">{status}</span>}
        </div>
      </article>

      <article className="panel">
        <h3>About SignalX</h3>
        <p>
          SignalX is your AI-powered business intelligence assistant. It transforms static news into
          personalized, interactive insights tailored to your investment profile and risk appetite.
        </p>
        <p>
          <strong>User ID:</strong> {userId}
        </p>
      </article>
    </section>
  );
}
