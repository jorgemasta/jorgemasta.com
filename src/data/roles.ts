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
    impact: "Modernising the customer portal.",
    url: "https://www.nexcess.net",
  },
  {
    company: "Liquid Web",
    title: "Senior Software Engineer",
    start: "Mar 2024",
    end: "Jun 2026",
    impact: "Connected the company's products to each other and worked on the checkout.",
    url: "https://www.liquidweb.com",
  },
  {
    // No link: its site still carries the old "replace your SaaS" message.
    company: "AIOS",
    title: "Co-founder",
    start: "2025",
    end: "Aug 2026",
    impact:
      "Built an organisational OS that puts AI at the centre of how a company works, and helped many companies become AI-native.",
  },
  {
    company: "Modern Tribe",
    title: "Senior UI Developer",
    start: "Mar 2020",
    end: "Mar 2024",
    impact: "Agency work: products and sites for Harvard, Vimeo, BigCommerce and Steelcase.",
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
