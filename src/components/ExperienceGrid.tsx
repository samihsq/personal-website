import { useState } from "react";
import { experiences } from "../data/experience";
import { FiChevronDown } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import "./ExperienceGrid.css";

const categories: ("All" | "SWE" | "Data")[] = ["All", "SWE", "Data"];

const ExperienceGrid = () => {
  const [selected, setSelected] = useState<(typeof categories)[number]>("SWE");
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered =
    selected === "All"
      ? experiences
      : experiences.filter((e) => e.category === selected);

  return (
    <div className="experience-grid-wrapper">
      <div className="tabs">
        {categories.map((cat) => (
          <button
            key={cat}
            className={cat === selected ? "active" : ""}
            onClick={() => setSelected(cat)}
          >
            {cat}
          </button>
        ))}
      </div>
      <div className="exp-grid">
        {filtered.map((exp) => {
          const isExpanded = expanded === exp.title;

          return (
            <motion.div layout key={exp.title} className="exp-card-wrapper">
              <button
                className={`exp-card ${isExpanded ? "expanded" : ""}`}
                onClick={() => setExpanded(isExpanded ? null : exp.title)}
              >
                <div className="exp-card-header">
                  <h4>{exp.title}</h4>
                  <div className="header-right">
                    <span className="period">{exp.period}</span>
                    <FiChevronDown
                      className={`chevron ${isExpanded ? "expanded" : ""}`}
                    />
                  </div>
                </div>
                <div className="org">{exp.org}</div>
              </button>
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    key="content"
                    initial={{ height: 0 }}
                    animate={{ height: "auto" }}
                    exit={{ height: 0 }}
                    transition={{
                      height: {
                        duration: 0.7,
                        ease: [0.22, 0.8, 0, 1],
                      },
                    }}
                    style={{ overflow: "hidden" }}
                    className="exp-card-content"
                  >
                    <div className="exp-card-inner">
                      <ul>
                        {exp.bullets.map((b) => {
                          const keywords = [
                            "AWS",
                            "React",
                            "Node.js",
                            "Python",
                            "Raspberry Pi",
                            "LoRa",
                            "Machine Learning",
                            "FastAPI",
                            "Docker",
                            "Flask",
                            "C++",
                            "SQL",
                          ];
                          let text = b;
                          keywords.forEach((k) => {
                            const escaped = k.replace(
                              /[.*+?^${}()|[\]\\]/g,
                              "\\$&"
                            );
                            const regex = new RegExp(`\\b${escaped}\\b`, "gi");
                            text = text.replace(
                              regex,
                              `<span class="kw">${k}</span>`
                            );
                          });
                          return (
                            <li
                              key={b}
                              dangerouslySetInnerHTML={{ __html: text }}
                            />
                          );
                        })}
                      </ul>
                      {exp.link && (
                        <a
                          href={exp.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="exp-link"
                        >
                          View Project
                        </a>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default ExperienceGrid;
