import { useEffect, useState } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import Shell from "./components/Shell";
import LandingPage from "./pages/LandingPage";
import DashboardPage from "./pages/DashboardPage";
import NavigatorPage from "./pages/NavigatorPage";
import BriefingPage from "./pages/BriefingPage";
import StoryArcPage from "./pages/StoryArcPage";
import VernacularPage from "./pages/VernacularPage";
import VideoStudioPage from "./pages/VideoStudioPage";
import ChatPage from "./pages/ChatPage";
import HistoryPage from "./pages/HistoryPage";
import ProfilePage from "./pages/ProfilePage";
import NotFoundPage from "./pages/NotFoundPage";
import "./App.css";

function App() {
  const [userId, setUserId] = useState(() => localStorage.getItem("my-et-user-id") || "u1");

  useEffect(() => {
    localStorage.setItem("my-et-user-id", userId);
  }, [userId]);

  return (
    <Routes>
      <Route path="/" element={<Shell userId={userId} setUserId={setUserId} />}>
        <Route index element={<LandingPage />} />
        <Route path="home" element={<DashboardPage />} />
        <Route path="article" element={<BriefingPage />} />
        <Route path="navigator" element={<NavigatorPage />} />
        <Route path="briefing" element={<BriefingPage />} />
        <Route path="story-arc" element={<StoryArcPage />} />
        <Route path="vernacular" element={<VernacularPage />} />
        <Route path="video-studio" element={<VideoStudioPage />} />
        <Route path="chat" element={<ChatPage />} />
        <Route path="history" element={<HistoryPage />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="*" element={<NotFoundPage />} />
      </Route>
    </Routes>
  );
}

export default App;
