import ProjectGrid from "../components/ProjectGrid";
import { motion } from "framer-motion";
import ExperienceGrid from "../components/ExperienceGrid";
import "./Home.css";

const Home = () => {
  return (
    <main className="home-container">
      <section className="bio">
        <motion.h1 layoutId="mainTitle">
          Hi, I'm <span className="highlight">Samih.</span>
        </motion.h1>
        <p>
          I'm a rising junior at Stanford, studying Computer Science! I enjoy
          coming up with ideas and building, and also really enjoy singing! 😄
        </p>
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
