import { useState } from "react";
import { experiences } from "../data/experience";
import "./ExperienceGrid.css";

const categories: ("All" | "SWE" | "Data")[] = ["All", "SWE", "Data"];

const ExperienceGrid = () => {
  const [selected, setSelected] = useState<(typeof categories)[number]>("SWE");

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
          const Card = (
            <div className="exp-card">
              <div className="exp-card-header">
                <h4>{exp.title}</h4>
                <span className="period">{exp.period}</span>
              </div>
              <div className="org">{exp.org}</div>
              <ul>
                {exp.bullets.slice(0, 2).map((b) => {
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
                    const escaped = k.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
                    const regex = new RegExp(`\\b${escaped}\\b`, "gi");
                    text = text.replace(
                      regex,
                      `<span class=\\"kw\\">${k}</span>`
                    );
                  });
                  return (
                    <li key={b} dangerouslySetInnerHTML={{ __html: text }} />
                  );
                })}
              </ul>
            </div>
          );
          return exp.link ? (
            <a
              key={exp.title}
              href={exp.link}
              target="_blank"
              rel="noopener noreferrer"
            >
              {Card}
            </a>
          ) : (
            <div key={exp.title}>{Card}</div>
          );
        })}
      </div>
    </div>
  );
};

export default ExperienceGrid;
