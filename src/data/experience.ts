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
    title: "Software Engineer Intern",
    role: "Software Engineer Intern",
    org: "Bimi",
    location: "Remote",
    period: "July 2025 - Present",
    bullets: [
      "Enhancing mobile app onboarding experience for the numi AI therapy platform using React Native/Expo, improving user retention rates and reducing therapy session setup time through streamlined UI/UX design",
      "Developing and optimizing web platform features with React/Next.js to support seamless user acquisition / engagement",
    ],
    category: "SWE",
    link: "https://joinnumi.com/"
  },
  {
    title: 'Software Engineer',
    role: 'Software Engineer',
    org: 'Stanford Graduate Workers Union',
    location: 'Stanford, CA',
    period: 'May 2025 – Present',
    bullets: [
      'Architecting a React/Node.js carpool-coordination web app.',
      'Implemented custom AWS services enabling auth & GitHub Actions pipelines, boosting redirect throughput for 5,000+ monthly requests.',
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
      'Building a CNN for math problem classification, for insights on the brain\'s math-learning process.',
      'Redesigned the SMARTE math assessment platform (React, TypeScript, Node.js/Express, jsPsych).',
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
]; 