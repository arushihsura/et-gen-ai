import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import Shell from "./components/Shell";
import DashboardPage from "./pages/DashboardPage";
import NavigatorPage from "./pages/NavigatorPage";
import BriefingPage from "./pages/BriefingPage";
import VideoStudioPage from "./pages/VideoStudioPage";
import ProfilePage from "./pages/ProfilePage";
import StoryArcPage from "./pages/StoryArcPage";
import VernacularPage from "./pages/VernacularPage";
import NotFoundPage from "./pages/NotFoundPage";
import "./App.css";

function App() {
  const [userId, setUserId] = useState(() => localStorage.getItem("my-et-user-id") || "u1");
  const [language, setLanguage] = useState(() => localStorage.getItem("signalx-language") || "English");
  const [theme, setTheme] = useState(() => localStorage.getItem("signalx-theme") || "dark");

  useEffect(() => {
    localStorage.setItem("my-et-user-id", userId);
  }, [userId]);

  useEffect(() => {
    localStorage.setItem("signalx-language", language);
  }, [language]);

  useEffect(() => {
    localStorage.setItem("signalx-theme", theme);
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  return (
    <Routes>
      <Route
        path="/"
        element={(
          <Shell
            userId={userId}
            setUserId={setUserId}
            language={language}
            setLanguage={setLanguage}
            theme={theme}
            setTheme={setTheme}
          />
        )}
      >
        <Route index element={<DashboardPage />} />
        <Route path="home" element={<Navigate to="/" replace />} />
        <Route path="briefings" element={<BriefingPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="story-arc" element={<StoryArcPage />} />
        <Route path="vernacular" element={<VernacularPage />} />
        
        {/* Backward compatibility routes */}
        <Route path="explore" element={<NavigatorPage />} />
        <Route path="videos" element={<VideoStudioPage />} />
        <Route path="article" element={<Navigate to="/briefings" replace />} />
        <Route path="navigator" element={<Navigate to="/explore" replace />} />
        <Route path="briefing" element={<BriefingPage />} />
        <Route path="video-studio" element={<Navigate to="/videos" replace />} />
        <Route path="language" element={<Navigate to="/vernacular" replace />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

export default App;
