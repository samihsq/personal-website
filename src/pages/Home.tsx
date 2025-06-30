import ProjectGrid from "../components/ProjectGrid";
import { motion } from "framer-motion";
import ExperienceGrid from "../components/ExperienceGrid";
import { FaLinkedin, FaGithub } from "react-icons/fa";
import "./Home.css";

const Home = () => {
  return (
    <main className="home-container">
      <section className="bio">
        <motion.h1 layoutId="mainTitle">
          Hi, I'm <span className="highlight">Samih.</span>
        </motion.h1>
        <img src="/images/samih-line.png" alt="" className="samih-line" />
        <p>I'm a rising junior at Stanford, studying Computer Science.</p>
        <div className="social-icons">
          <a
            href="https://linkedin.com/in/samihsq"
            target="_blank"
            rel="noopener noreferrer"
            className="social-icon"
            aria-label="LinkedIn"
          >
            <FaLinkedin />
          </a>
          <a
            href="https://github.com/samihsq"
            target="_blank"
            rel="noopener noreferrer"
            className="social-icon"
            aria-label="GitHub"
          >
            <FaGithub />
          </a>
        </div>
      </section>
      <section className="projects-section">
        <h3>Recent work:</h3>
        <ProjectGrid />
        <h3 style={{ marginTop: "2rem" }}>Experience:</h3>
        <ExperienceGrid />
      </section>
    </main>
  );
};

export default Home;
