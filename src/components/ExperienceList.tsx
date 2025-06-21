import { experiences } from "../data/experience";
import "./ExperienceList.css";

const ExperienceList = () => {
  return (
    <div className="experience-list">
      <h3>Experience</h3>
      {experiences.map((exp) => (
        <div key={exp.title} className="exp-item">
          <div className="exp-header">
            <span className="exp-role">{exp.title}</span>
            <span className="exp-period">{exp.period}</span>
          </div>
          <div className="exp-org">
            {exp.org} — {exp.location}
          </div>
          <ul>
            {exp.bullets.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
};

export default ExperienceList;
