import { useState } from "react";
import { projects, ProjectCategory } from "../data/projects";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import {
  SiNextdotjs,
  SiReact,
  SiTypescript,
  SiFlask,
  SiPython,
  SiOpencv,
  SiTensorflow,
  SiRaspberrypi,
  SiCplusplus,
  SiDocker,
  SiAmazonaws,
  SiPostgresql,
  SiNodedotjs,
  SiExpress,
  SiVite,
  SiCss3,
  SiVercel,
} from "react-icons/si";
import { FaLock, FaCode, FaShieldAlt } from "react-icons/fa";
import ResearchLogo from "./ResearchLogo";
import CardipoolLogo from "./CardipoolLogo";
import FastboardLogo from "./FastboardLogo";
import CardipoolWave from "./CardipoolWave";
import "./ProjectGrid.css";

const categories: (ProjectCategory | "All")[] = [
  "All",
  "Web",
  "Robotics",
  "Data",
];

const techMap: Record<string, JSX.Element> = {
  nextjs: <SiNextdotjs title="Next.js" />,
  react: <SiReact title="React" />,
  typescript: <SiTypescript title="TypeScript" />,
  flask: <SiFlask title="Flask" />,
  python: <SiPython title="Python" />,
  "web-scraping": <FaCode title="Web Scraping" />,
  opencv: <SiOpencv title="OpenCV" />,
  tensorflow: <SiTensorflow title="TensorFlow" />,
  raspberrypi: <SiRaspberrypi title="Raspberry Pi" />,
  cpp: <SiCplusplus title="C++" />,
  lora: <span className="tech-text">LoRa</span>,
  docker: <SiDocker title="Docker" />,
  aws: <SiAmazonaws title="AWS" />,
  postgres: <SiPostgresql title="PostgreSQL" />,
  nodejs: <SiNodedotjs title="Node.js" />,
  express: <SiExpress title="Express" />,
  saml: <FaShieldAlt title="SAML SSO" />,
  vite: <SiVite title="Vite" />,
  css: <SiCss3 title="CSS3" />,
  vercel: <SiVercel title="Vercel" />,
};

const ProjectGrid = () => {
  const [selected, setSelected] = useState<(typeof categories)[number]>("All");
  const [expanded, setExpanded] = useState<string | null>(null);

  const filtered =
    selected === "All"
      ? projects
      : projects.filter((p) => p.category === selected);

  return (
    <div className="project-grid-wrapper">
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
      <div className="grid">
        {filtered.map((proj) => {
          const isExpanded = expanded === proj.slug;

          return (
            <motion.div layout key={proj.slug} className="card-wrapper">
              <button
                className={`card ${isExpanded ? "expanded" : ""} ${
                  proj.comingSoon ? "locked" : ""
                }${proj.slug === "fastboard" ? " fastboard" : ""}${
                  proj.thumbnail === "red" ? " red" : ""
                }${proj.thumbnail === "lightblue" ? " lightblue" : ""}`}
                onClick={() =>
                  !proj.comingSoon && setExpanded(isExpanded ? null : proj.slug)
                }
                style={{
                  ...(proj.thumbnail === "gradient"
                    ? {
                        background:
                          "linear-gradient(90deg, #8B5CF6 0%, #3B82F6 100%)",
                        backgroundImage: "none",
                      }
                    : {
                        backgroundImage:
                          proj.thumbnail === "red" ||
                          proj.thumbnail === "lightblue"
                            ? "none"
                            : `url(${proj.thumbnail})`,
                        backgroundColor:
                          proj.thumbnail === "red"
                            ? "#b82525"
                            : proj.thumbnail === "lightblue"
                            ? "#4a90a4"
                            : undefined,
                      }),
                }}
              >
                {proj.slug === "cardipool" && <CardipoolWave />}
                {proj.comingSoon && (
                  <div className="lock-overlay">
                    <FaLock className="lock-icon" />
                    <span className="coming-soon-text">Coming soon...</span>
                  </div>
                )}
                <div className="card-content">
                  <h4>
                    {proj.slug === "re-search" ? (
                      <ResearchLogo />
                    ) : proj.slug === "cardipool" ? (
                      <CardipoolLogo />
                    ) : proj.slug === "fastboard" ? (
                      <FastboardLogo />
                    ) : (
                      proj.title
                    )}
                  </h4>
                  <p>{proj.summary}</p>
                </div>
                <div className="tech-icons">
                  {(() => {
                    const techList = proj.tech;
                    const total = techList.length;
                    let firstRow: string[] = techList;
                    let secondRow: string[] = [];

                    if (total > 6) {
                      const firstRowCount = Math.ceil(total / 2);
                      firstRow = techList.slice(0, firstRowCount);
                      secondRow = techList.slice(firstRowCount);
                    }

                    return (
                      <>
                        <div className="tech-row">
                          {firstRow.map((t) => (
                            <span key={t} className="icon-wrapper">
                              {techMap[t]}
                            </span>
                          ))}
                        </div>
                        {secondRow.length > 0 && (
                          <div className="tech-row">
                            {secondRow.map((t) => (
                              <span key={t} className="icon-wrapper">
                                {techMap[t]}
                              </span>
                            ))}
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </button>
              <AnimatePresence>
                {isExpanded && !proj.comingSoon && (
                  <motion.div
                    key="content"
                    initial={{ height: 0 }}
                    animate={{ height: "auto" }}
                    exit={{ height: 0 }}
                    transition={{
                      height: { duration: 0.7, ease: [0.22, 0.8, 0, 1] },
                    }}
                    style={{ overflow: "hidden" }}
                    className="dropdown-content"
                  >
                    <div className="dropdown-inner">
                      <p>{proj.description}</p>
                      <div className="project-links">
                        {proj.link && (
                          <a
                            href={proj.link}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            GitHub
                          </a>
                        )}
                        {proj.demo && (
                          <a
                            href={proj.demo}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Live Demo
                          </a>
                        )}
                        {/* <Link to={`/project/${proj.slug}`}>Details</Link> */}
                      </div>
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

export default ProjectGrid;
