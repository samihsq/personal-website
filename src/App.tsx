import { Suspense, lazy, useEffect, useState } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence, LayoutGroup } from "framer-motion";
import Home from "./pages/Home";
import ProjectDetails from "./pages/ProjectDetails";
import IntroOverlay from "./components/IntroOverlay";

// The CRT terminal pulls in three.js + WebGL shaders, so load it on demand.
const CrtTerminal = lazy(() => import("./terminal/CrtTerminal"));

function App() {
  const [showIntro, setShowIntro] = useState(true);
  const location = useLocation();
  const onTerminal = location.pathname === "/";

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
        <Route
          path="/"
          element={
            <Suspense fallback={<div style={{ position: "fixed", inset: 0, background: "#000" }} />}>
              <CrtTerminal />
            </Suspense>
          }
        />
        <Route path="/classic" element={<Home />} />
        <Route path="/project/:slug" element={<ProjectDetails />} />
        {/* Catch-all redirect to the classic home */}
        <Route path="*" element={<Home />} />
      </Routes>

      <AnimatePresence>
        {showIntro && !onTerminal && <IntroOverlay onComplete={handleIntroComplete} />}
      </AnimatePresence>
    </LayoutGroup>
  );
}

export default App;
