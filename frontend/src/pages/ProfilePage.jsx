import { useState } from "react";
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

export default function ProfilePage() {
  const { userId } = useOutletContext();
  const [profile, setProfile] = useState(defaultProfile);
  const [status, setStatus] = useState("");

  const setField = (key, value) => setProfile((prev) => ({ ...prev, [key]: value }));

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
    } catch (err) {
      setStatus(err.message);
    }
  };

  return (
    <section className="panel-grid">
      <article className="panel panel-span profile-panel">
        <h2>Your Profile</h2>
        <p className="sub">Use this to personalize feed and tune AI responses.</p>

        <div className="signal-list">
          <div className="signal-pill">You are: {profile.persona || "Investor"}</div>
          <div className="signal-pill">Interested in: {profile.sectors || "Stocks, IPOs"}</div>
          <div className="signal-pill">Risk tolerance: {profile.riskAppetite}</div>
          <div className="signal-pill">Focus: {profile.horizon}</div>
        </div>

        <div className="fields">
          <label>
            Persona
            <input value={profile.persona} onChange={(e) => setField("persona", e.target.value)} />
          </label>
          <label>
            Interests
            <input value={profile.interests} onChange={(e) => setField("interests", e.target.value)} />
          </label>
          <label>
            Sectors
            <input value={profile.sectors} onChange={(e) => setField("sectors", e.target.value)} />
          </label>
          <label>
            Portfolio Symbols
            <input
              value={profile.portfolioSymbols}
              onChange={(e) => setField("portfolioSymbols", e.target.value)}
            />
          </label>
          <label>
            Risk Appetite
            <select value={profile.riskAppetite} onChange={(e) => setField("riskAppetite", e.target.value)}>
              <option value="low">low</option>
              <option value="medium">medium</option>
              <option value="high">high</option>
            </select>
          </label>
          <label>
            Horizon
            <select value={profile.horizon} onChange={(e) => setField("horizon", e.target.value)}>
              <option value="short-term">short-term</option>
              <option value="long-term">long-term</option>
            </select>
          </label>
        </div>

        <button onClick={saveProfile} className="cta">Save Signals</button>
        <p className="status">{status}</p>
      </article>
    </section>
  );
}
