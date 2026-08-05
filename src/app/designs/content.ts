/**
 * Static content for the /designs preview pages, captured from
 * matthew-wind.com. These pages are design explorations — the winning
 * design gets reimplemented against live DB data on the homepage.
 */

export interface DesignExperience {
  logo: string;
  title: string;
  company: string;
  dates: string;
  location: string;
  bullets: string[];
  skills: string[];
}

export interface DesignProject {
  name: string;
  org: string;
  dates: string;
  bullets: string[];
  repoUrl: string | null;
}

export const profile = {
  name: "Matthew Wind",
  headline: "Software Engineering | Finance",
  about:
    "Software engineer studying at Purdue University, minoring in Finance and German. Recent work spans an enterprise testing platform at Capital One, product engineering at a London startup, and quantitative trading projects that refuse to stay small. See my work below and please reach out!",
  beyondWork:
    "Chelsea FC ⚽ · Poker & Catan strategist · studied abroad in London, visited 10+ countries · Habitat for Humanity volunteer",
  experiences: [
    {
      logo: "C1",
      title: "Software Engineer Intern",
      company: "Capital One",
      dates: "Jun 2025 – Aug 2025",
      location: "Richmond, VA",
      bullets: [
        "Developing an internal enterprise-wide testing tool to automate unit testing, component testing, and live dependency testing to achieve 100% coverage.",
      ],
      skills: ["Testing", "Automation"],
    },
    {
      logo: "S",
      title: "Software Engineering Intern",
      company: "Shopwave",
      dates: "Jan 2025 – Apr 2025",
      location: "London, UK",
      bullets: [
        "Built client-focused reporting and analytics features for Shopwave's point-of-sale and inventory management systems with React, Next.js, and TypeScript.",
        "Developed a “Where to Next” tool that queries internal and external APIs so potential customers can analyze areas of expansion, powered by Amazon Bedrock AI models.",
      ],
      skills: ["React", "Next.js", "TypeScript", "Bedrock"],
    },
    {
      logo: "P",
      title: "Teaching Assistant — CS 307 Software Engineering",
      company: "Purdue Computer Science",
      dates: "Aug 2024 – Dec 2024",
      location: "West Lafayette, IN",
      bullets: [
        "Acted as product owner and technical advisor, guiding teams on framework selection, database management, and design patterns while promoting Agile principles.",
        "Provided product management feedback on design documents, backlogs, charters, and sprint plans.",
      ],
      skills: ["Agile", "Mentorship"],
    },
    {
      logo: "F",
      title: "Software Engineering Intern",
      company: "Federal Home Loan Bank of Chicago",
      dates: "May 2024 – Aug 2024",
      location: "Chicago, IL",
      bullets: [
        "Developed and enhanced FinTech applications in .NET, C#, and Java with the bank's modern engineering team.",
        "Maintained DevSecOps infrastructure (Azure DevOps, Docker, Kubernetes), increasing deployment speed by up to 20%.",
        "Presented AI/ML adoption findings to bank executives and board members.",
      ],
      skills: ["C#", "Java", "Docker", "Kubernetes"],
    },
    {
      logo: "Sc",
      title: "Software Engineer — AI Consultant",
      company: "Scale AI",
      dates: "Jan 2024 – Dec 2024",
      location: "Remote",
      bullets: [
        "Enhanced ML model capabilities by developing software in Java, C/C++, Python, JavaScript, TypeScript, and C#, driving a 6% increase in model accuracy.",
        "Evaluated and maintained coworkers' software, ensuring models received accurate, well-documented, original code.",
      ],
      skills: ["Python", "C++", "TypeScript"],
    },
  ] satisfies DesignExperience[],
  projects: [
    {
      name: "Figgie Genius",
      org: "Personal Project",
      dates: "Jun 2025 – Present",
      bullets: [
        "Statistics-driven bot for Jane Street's Figgie trading game, built to out-think and out-compute any opponent.",
      ],
      repoUrl: "https://github.com/mtwind/figgie-genius",
    },
    {
      name: "Algorithmic Trading Strategy",
      org: "Boiler Quant Finance Group",
      dates: "Oct 2024",
      bullets: [
        "PSAR + RSI strategy achieving returns up to 70% and a 2.7 Sharpe Ratio, backtested on AMZN, TSLA, and GOOGL over 2020–2024 in Python.",
      ],
      repoUrl: "https://github.com/mtwind/Analyst-Assignment",
    },
    {
      name: "Online Trading: Adaptive Algorithms",
      org: "Boiler Quant Finance Group",
      dates: "Oct 2024 – Dec 2024",
      bullets: [
        "Evolving ML/DL trading algorithm that learns on-the-go via the Vowpal Wabbit online-learning library, applied to volatile Texas energy markets.",
      ],
      repoUrl: "https://github.com/Boiler-Quant/bqfg-online-learning/tree/main",
    },
    {
      name: "Explorio",
      org: "Purdue CS",
      dates: "Jan 2024 – May 2024",
      bullets: [
        "Led a full-stack team delivering a mobile + web travel app generating detailed itineraries from user preferences with Flutter and Firebase.",
      ],
      repoUrl: null,
    },
  ] satisfies DesignProject[],
  contact: {
    linkedin: "https://www.linkedin.com/in/matthewtwind/",
    github: "https://github.com/mtwind",
    email: "mtwind2003@gmail.com",
  },
};
