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
    title: 'Undergraduate Software Engineer',
    role: 'Software Engineer',
    org: 'Stanford Graduate Workers Union',
    location: 'Stanford, CA',
    period: 'May 2025 – Present',
    bullets: [
      'Implemented custom AWS services enabling auth & GitHub Actions pipelines, boosting redirect throughput for 5,000+ monthly requests.',
      'Architecting a React/Node.js carpool-coordination web app.'
    ],
    category: 'SWE',
    link: 'https://sgwu.us/',
  },
  {
    title: 'Research Assistant',
    role: 'Research Assistant',
    org: 'Stanford Educational Neuroscience Lab',
    location: 'Stanford, CA',
    period: 'Oct 2024 – Present',
    bullets: [
      'Redesigned the SMARTE math assessment platform (React, TypeScript, Node.js/Express, jsPsych).',
      'Implemented REST APIs with FastAPI, adopting component-based architecture to cut dev cycle time.'
    ],
    category: 'SWE',
  },
  {
    title: 'Program Administrator',
    role: 'Program Administrator',
    org: 'Stanford Department of Medicine',
    location: 'Hybrid',
    period: 'Apr 2025 – June 2025',
    bullets: [
      'Collaborated with Stanford Center for Asian Health Research and Education faculty to develop a summer curriculum for high-school students focused on statistical data analysis and AI tools for health datasets.'
    ],
    category: 'Data',
  },
  {
    title: 'Course Assistant – Principles of Data Science',
    role: 'Course Assistant',
    org: 'Stanford University',
    location: 'Stanford, CA',
    period: 'Jan 2025 – Jun 2025',
    bullets: [
      'Supported 100+ students in data analysis, ML, NLP, and web scraping.',
      'Partnered with instructor to refine course materials.'
    ],
    category: 'Data',
  },
  {
    title: 'Data Analyst',
    role: 'Data Analyst',
    org: 'CO/AI',
    location: 'Remote',
    period: 'Mar 2024 – May 2024',
    bullets: [
      'Aggregated 20k+ AI articles via BeautifulSoup/REST pipeline to surface industry trends.',
      'Built a scikit-learn classifier (92% accuracy) reducing manual analysis by 80%.'
    ],
    category: 'Data',
  }
]; 