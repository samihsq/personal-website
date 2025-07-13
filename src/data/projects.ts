export type ProjectCategory = "Web" | "ML" | "Robotics" | "Data";

export interface Project {
  slug: string; // used in URL
  title: string;
  category: ProjectCategory;
  summary: string;
  description: string;
  thumbnail: string; // path to image asset (or URL)
  images?: string[]; // optional gallery images
  link?: string; // optional GitHub link
  demo?: string; // optional live demo link
  tech: string[]; // new tech array
  comingSoon?: boolean;
}

export const projects: Project[] = [
  {
    "slug": "cardipool",
    "title": "cardipool",
    "category": "Web",
    "summary": "A carpooling platform for the Stanford community",
    "description": "A full-stack carpooling app built for the Stanford community. The platform uses a React front-end, a Node.js/Express back-end, and a PostgreSQL database to help students and staff find or offer rides. It integrates with Stanford's central SSO for secure authentication and is deployed on Vercel.",
    "thumbnail": "lightblue",
    "tech": [
      "react",
      "nodejs",
      "express",
      "postgres",
      "vite",
      "saml",
      "vercel"
    ],
    "comingSoon": false,
    "link": "https://github.com/samihsq/cardipool",
    "demo": "https://cardipool.app"
  },
  {
    slug: "re-search",
    title: "re-search",
    category: "Web",
    summary:
      "Find research opportunities at Stanford",
    description:
      "re-search is a web application designed to help Stanford students find and explore research opportunities on campus. A web scraper automatically gathers opportunity data, a Python backend using Flask serves the collected data through an AWS-hosted REST API, and a React frontend provides a searchable and filterable user interface for browsing the opportunities.",
    thumbnail: "red",
    tech: [
      "react",
      "flask",
      // "web-scraping",
      "docker",
      "aws",
      "postgres",
      "typescript",
      "python",
    ],
    link: "https://github.com/samihsq/re-search",
    demo: "https://samihsq.github.io/re-search/",
  },
  {
    slug: "fastboard",
    title: "fastboard",
    category: "Web",
    summary: "Generate interactive dashboards from plain-language prompts",
    description:
      'Fastboard lets anyone type a simple sentence—"Show me Tesla stock over time"—and instantly get an interactive, shareable dashboard. I built the Next.js + Tailwind front-end and a Flask API that turns Perplexity-AI responses into Recharts widgets.',
    thumbnail: "gradient",
    tech: ["nextjs", "react", "flask", "python"],
    link: "https://github.com/samihsq/fastboard",
    demo: "https://fastboard-frontend.onrender.com/",
  },
  {
    slug: "abandoned-bicycle-detection",
    title: "Abandoned Bicycle Detection System",
    category: "Robotics",
    summary: "Autonomous robot for campus bike cleanup",
    description:
      "A Raspberry Pi–powered robot that cruises Stanford paths, spots neglected bikes with a 97% accurate OpenCV/TensorFlow model, and drops the GPS locations into a Postgres DB so facilities can scoop them up.",
    thumbnail: "images/bicycle_robot.png",
    tech: ["opencv", "tensorflow", "python", "raspberrypi"],
  },
  {
    slug: "open-trap-network",
    title: "oPen & Trap Network System",
    category: "Robotics",
    summary: "IoT livestock management + mesh traps",
    description:
      "Solar-powered Raspberry Pi opens or locks livestock pens on command. Farmers tap a simple web UI, Python moves the linear actuator, and predators stay out—already field-tested at Sonoma Wildlife Rescue.",
    thumbnail: "images/open_system.jpg",
    tech: ["python", "raspberrypi", "html"],
    link: "https://github.com/samihsq/oPen",
    // demo: "https://o-pen.org/open/",
  },
  {
    slug: "env-health-risk",
    title: "Environmental Health Risk Prediction",
    category: "Data",
    summary:
      "Machine-learning model predicting nationwide pollution-related health risk",
    description:
      "Led a research project leveraging California's environmental datasets to build a ridge-regression model that surfaces pollution-demographics correlations nationwide, exposing hotspots in the Cotton Belt and Southwest for environmental-justice policy.",
    thumbnail: "images/datasci_proj.png",
    tech: ["python", 
      // "pandas", "scikit", "matplotlib"
    ],
    link: "https://github.com/samihsq/DataSci-112-Final",
  },
  {
    slug: "orbis",
    title: "orbis",
    category: "Data",
    summary: "Real-time Twitter sentiment map",
    description:
      "Built a pipeline using Tweepy + TextBlob that streams tweets and visualises continental mood in real-time (pre-LLM era!).",
    thumbnail: "images/orbis.png",
    tech: ["python"
      // , "tweepy", "textblob"
    ],
    link: "https://github.com/samihsq/orbis",
  },

  {
    slug: "the-stanford-bubble",
    title: "the stanford bubble",
    category: "Web",
    summary: "Dashboard for Stanford-built web apps",
    description: "",
    thumbnail: "images/stanford_bubble.png",
    tech: [],
    comingSoon: true,
  },
];
