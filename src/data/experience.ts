export interface Experience {
  title: string;
  role: string;
  org: string;
  location: string;
  period: string;
  bullets: string[];
  link?: string;
  category: 'SWE' | 'Data';
}

export const experiences: Experience[] = [
{
  title: "Research Associate",
  role: "Research Associate", 
  org: "Sully.ai",
  location: "Mountain View, CA",
  period: "August 2025 - Present",
  bullets: [
    "Architecting agentic scribe systems with React visualizers for medical note generation",
    "Implementing open-source AI models with Langfuse tracing for cost-efficient deployment solutions",
  ],
  category: "SWE",
},
{
  title: "Software Engineer Intern",
  role: "Software Engineer Intern",
  org: "Bimi", 
  location: "San Francisco, CA",
  period: "July 2025 - September 2025",
  bullets: [
    "Leading development across two core products, building and deploying full-stack web and mobile applications from concept to launch",
    "Engineering comprehensive user assessment platform using React/Next.js with algorithmic user categorization and personalized content delivery",
    "Architecting TypeScript-based Firebase ecosystem with real-time Firestore synchronization across user and business databases, building mobile backend services and React/Next.js dashboard for restaurant reward program management",
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