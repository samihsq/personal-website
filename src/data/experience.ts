export interface Experience {
  title: string;
  role: string;
  org: string;
  location: string;
  period: string;
  bullets: string[];
  link?: string;
  category: 'Research' | 'SWE' | 'Data';
}

export const experiences: Experience[] = [
  {
    title: "Incoming Platform Architecture Intern",
    role: "Incoming Platform Architecture Intern",
    org: "Apple",
    location: "Cupertino, CA",
    period: "Summer 2026",
    bullets: [
      "Incoming intern on Apple's Platform Architecture team, working on software tools and services for internal customers",
      "Expected to support cloud, embedded-device, and next-generation product workflows through systems-focused engineering",
    ],
    category: "SWE",
  },
  {
    title: "Independent Researcher",
    role: "Independent Researcher",
    org: "Stanford Department of Computer Science",
    location: "Stanford, CA",
    period: "January 2026 - Present",
    bullets: [
      "Researching how component-level skills in small language models predict performance inside multi-agent systems",
      "Designed benchmarks across tool calling, reasoning, instruction following, and summarization, evaluating 100+ SLM configurations with CrewAI",
      "Studying how small models fail inside larger agentic systems, and how their skill profiles can guide orchestration and deployment choices",
    ],
    category: "Research",
  },
  {
    title: "Research Associate",
    role: "Research Associate",
    org: "Sully.ai",
    location: "Mountain View, CA",
    period: "August 2025 - March 2026",
    bullets: [
      "Built and evaluated agentic medical AI systems for clinical workflows, including scribe note generation, diagnosis coding, and provider-feedback analysis",
      "Developed evaluation frameworks, logging, and visualizers to debug multi-agent pipelines and understand failure modes beyond aggregate metrics",
      "Used Langfuse tracing and open-source LLMs to test cost-efficient deployment paths for production AI systems",
    ],
    category: "Research",
    link: "https://www.sully.ai/scribe"
  },
{
  title: "Software Engineer Intern",
  role: "Software Engineer Intern",
  org: "Bimi", 
  location: "San Francisco, CA",
  period: "July 2025 - September 2025",
  bullets: [
    "Lead development across two core products, building and deploying full-stack web and mobile applications from concept to launch",
    "Engineered comprehensive user assessment platform using React/Next.js with algorithmic user categorization and personalized content delivery",
    "Architected TypeScript-based Firebase ecosystem with real-time Firestore synchronization across user and business databases, building mobile backend services and React/Next.js dashboard for restaurant reward program management",
  ],
  category: "SWE",
  link: "https://joinnumi.com"
},
{
  title: 'Software Engineer',
  role: 'Software Engineer', 
  org: 'Stanford Graduate Workers Union',
  location: 'Stanford, CA',
  period: 'May 2025 – August 2025',
  bullets: [
    'Built full-stack carpool platform using React/Node.js/PostgreSQL, implementing secure SAML 2.0 SSO and scalable REST API for user and ride management',
    'Implemented AWS SES email notifications for ride requests and status updates',
  ],
  category: 'SWE',
  link: 'https://sgwu.us/',
},
{
  title: 'Research Assistant',
  role: 'Research Assistant',
  org: 'Stanford Educational Neuroscience Lab', 
  location: 'Stanford, CA',
  period: 'October 2024 – August 2025',
  bullets: [
    'Engineered CNN+LSTM classifiers with PyTorch to validate math equations, determining EEG-model activation correlations for insights on brain processes',
    'Redesigned the SMARTE math assessment platform using React, Node.js/Express and jsPsych, coordinating data collection with international research institutions',
  ],
  category: 'SWE',
},
{
  title: 'Course Assistant – Principles of Data Science',
  role: 'Course Assistant',
  org: 'Stanford University',
  location: 'Stanford, CA', 
  period: 'January 2025 – June 2025',
  bullets: [
    'Facilitated weekly sections for students, coached project teams from ideation through final presentation',
    'Selected as one of 8 CAs for exceptional communication, empathy, and mentoring ability'
  ],
  category: 'Data',
},
{
  title: 'Program Administrator',
  role: 'Program Administrator',
  org: 'Stanford School of Medicine: CARE',
  location: 'Stanford, CA',
  period: 'April 2025 – June 2025', 
  bullets: [
    'Co-designed and launched a two-week AI/Data Analytics for Health curriculum for high-school students, organizing educators, researchers, and administrators across three departments'
  ],
  category: 'Data',
},
{
  title: 'IoT Engineer',
  role: 'IoT Engineer',
  org: 'True Wild',
  location: 'Petaluma, CA',
  period: 'March 2022 – June 2023',
  bullets: [
    "Engineered full-stack software architecture for patent-pending livestock management system (US 63/415,411), developing RESTful API for asynchronous communication between HTML/CSS/JavaScript frontend and Raspberry Pi hardware",
    "Developed Python backend processing RFID readings daily, integrating live camera feeds, motor controls, and real-time tracking for remote pen monitoring"
  ],
  category: 'SWE',
},

]; 