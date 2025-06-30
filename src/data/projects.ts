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
    slug: "fastboard",
    title: "fastboard",
    category: "Web",
    summary: "Generate interactive dashboards from plain-language prompts",
    description:
      'Fastboard lets anyone type a simple sentence—"Show me Tesla stock over time"—and instantly get an interactive, shareable dashboard. I built the Next.js + Tailwind front-end and a Flask API that turns Perplexity-AI responses into Recharts widgets.',
    thumbnail: "images/fastboard.png",
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
    tech: ["python", "pandas", "scikit", "matplotlib"],
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
    tech: ["python", "tweepy", "textblob"],
    link: "https://github.com/samihsq/orbis",
  },
  {
    slug: "cardipool",
    title: "cardipool",
    category: "Web",
    summary: "Carpool platform for Stanford students",
    description: "",
    thumbnail: "images/cardipool.png",
    tech: [],
    comingSoon: true,
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
