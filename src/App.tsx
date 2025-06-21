import { useEffect, useState } from "react";
import { Routes, Route } from "react-router-dom";
import { AnimatePresence, LayoutGroup } from "framer-motion";
import Home from "./pages/Home";
import ProjectDetails from "./pages/ProjectDetails";
import IntroOverlay from "./components/IntroOverlay";

function App() {
  const [showIntro, setShowIntro] = useState(true);

  useEffect(() => {
    // Skip intro on subsequent navigations within same session
    const hasSeenIntro = sessionStorage.getItem("intro-done");
    if (hasSeenIntro) {
      setShowIntro(false);
    }
  }, []);

  const handleIntroComplete = () => {
    sessionStorage.setItem("intro-done", "true");
    setShowIntro(false);
  };

  return (
    <LayoutGroup>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/project/:slug" element={<ProjectDetails />} />
        {/* Catch-all redirect to home */}
        <Route path="*" element={<Home />} />
      </Routes>

      <AnimatePresence>
        {showIntro && <IntroOverlay onComplete={handleIntroComplete} />}
      </AnimatePresence>
    </LayoutGroup>
  );
}

export default App;
