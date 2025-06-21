import { useParams, Link } from "react-router-dom";
import { projects } from "../data/projects";
import "./ProjectDetails.css";

const ProjectDetails = () => {
  const { slug } = useParams();
  const project = projects.find((p) => p.slug === slug);

  if (!project) {
    return (
      <main className="project-details">
        <p>Project not found.</p>
        <Link to="/">Back to main</Link>
      </main>
    );
  }

  return (
    <main className="project-details">
      <Link to="/" className="back-link">
        &larr; back to main
      </Link>
      <h2>{project.title}</h2>
      <p className="category">[{project.category}]</p>
      <p>{project.description}</p>
      {project.demo && (
        <p>
          Live demo:{" "}
          <a href={project.demo} target="_blank" rel="noopener noreferrer">
            {project.demo}
          </a>
        </p>
      )}
      {project.link && (
        <p>
          GitHub:{" "}
          <a href={project.link} target="_blank" rel="noopener noreferrer">
            {project.link}
          </a>
        </p>
      )}
      {project.images?.length && (
        <div className="gallery">
          {project.images!.map((img) => (
            <img key={img} src={img} alt="project screenshot" />
          ))}
        </div>
      )}
    </main>
  );
};

export default ProjectDetails;
