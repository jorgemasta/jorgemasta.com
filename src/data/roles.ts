/** A Role is where Jorge worked, as an employee or a co-founder. */
export type Role = {
  company: string;
  title: string;
  start: string;
  /** Omitted while the role is current. */
  end?: string;
  impact: string;
  url?: string;
};

/** Most recent first. */
export const ROLES: Role[] = [
  {
    company: "Nexcess",
    title: "Engineer III",
    start: "Jun 2026",
    impact:
      "Moving the customer portal from legacy code to a modern UI. I also help the team get up to speed with programming with AI.",
    url: "https://www.nexcess.net",
  },
  {
    company: "Liquid Web",
    title: "Senior Software Engineer",
    start: "Mar 2024",
    end: "Jun 2026",
    impact:
      "Integrated Salesforce into the customer portal and the checkout, and built a new checkout in React that back-office and marketing teams can configure.",
    url: "https://www.liquidweb.com",
  },
  {
    // No link: its site still carries the old "replace your SaaS" message.
    company: "AIOS",
    title: "Co-founder",
    start: "2025",
    end: "Aug 2026",
    impact:
      "Built an organisational OS that reshapes how a company is organised to put AI at the centre, and helped more than 10 companies become AI-native.",
  },
  {
    company: "Code at Light Speed",
    title: "Instructor",
    start: "Feb 2025",
    end: "Jun 2025",
    impact:
      "Taught live courses on programming with AI to engineering teams, such as XRF's, working in their own codebases.",
    url: "https://codeatlightspeed.com/en",
  },
  {
    company: "Modern Tribe",
    title: "Senior UI Developer",
    start: "Mar 2020",
    end: "Mar 2024",
    impact:
      "Agency work: products and sites for Harvard, Vimeo, BigCommerce and Steelcase. I built the program brochure on Harvard.edu, where students discover what to study, a WordPress plugin for Vimeo, and React hooks alongside BigCommerce's engineers.",
    url: "https://moderntribe.com",
  },
  {
    company: "Woonivers",
    title: "React Native Developer",
    start: "Oct 2018",
    end: "Mar 2020",
    impact:
      "Joined the original team at one of Madrid's top startups and co-built the app that digitised tax-free shopping in Spain.",
    url: "https://woonivers.com",
  },
  {
    company: "Secret Source",
    title: "Software Developer",
    start: "Jun 2017",
    end: "Oct 2018",
    impact: "My first job, where I started with React and React Native.",
  },
];
