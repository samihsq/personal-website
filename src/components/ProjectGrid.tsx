import { useState } from "react";
import { projects, ProjectCategory } from "../data/projects";
import { useNavigate } from "react-router-dom";
import {
  SiNextdotjs,
  SiReact,
  SiFlask,
  SiPython,
  SiOpencv,
  SiTensorflow,
  SiRaspberrypi,
  SiCplusplus,
} from "react-icons/si";
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
  flask: <SiFlask title="Flask" />,
  python: <SiPython title="Python" />,
  opencv: <SiOpencv title="OpenCV" />,
  tensorflow: <SiTensorflow title="TensorFlow" />,
  raspberrypi: <SiRaspberrypi title="Raspberry Pi" />,
  cpp: <SiCplusplus title="C++" />,
  lora: <span className="tech-text">LoRa</span>,
};

const ProjectGrid = () => {
  const [selected, setSelected] = useState<(typeof categories)[number]>("All");
  const navigate = useNavigate();

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
        {filtered.map((proj) => (
          <div
            key={proj.slug}
            className="card"
            onClick={() => navigate(`/project/${proj.slug}`)}
            style={{ backgroundImage: `url(${proj.thumbnail})` }}
          >
            <div className="card-content">
              <h4>{proj.title}</h4>
              <p>{proj.summary}</p>
            </div>
            <div className="tech-icons">
              {proj.tech.map((t) => (
                <span key={t} className="icon-wrapper">
                  {techMap[t]}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default ProjectGrid;
