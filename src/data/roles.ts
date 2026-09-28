/** A Role is where Jorge worked, as an employee or a co-founder. */
export type Role = {
  /**
   * Stable id, used as a Focus stop and in shared links, so never rename it.
   * Usually the company, but unique across Projects too (see `woonivers-role`).
   */
  id: string;
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
    id: "nexcess",
    company: "Nexcess",
    title: "Engineer III",
    start: "Jun 2026",
    impact: "Modernising the customer portal.",
    url: "https://www.nexcess.net",
  },
  {
    id: "liquid-web",
    company: "Liquid Web",
    title: "Senior Software Engineer",
    start: "Mar 2024",
    end: "Jun 2026",
    impact: "Built integrations between projects and worked on the checkout experience.",
    url: "https://www.liquidweb.com",
  },
  {
    // No link: its site still carries the old "replace your SaaS" message.
    id: "aios",
    company: "AIOS",
    title: "Co-founder",
    start: "2025",
    end: "Aug 2026",
    impact:
      "Built an organisational OS that put AI at the centre of how a company works, and helped many companies become AI-native.",
  },
  {
    id: "modern-tribe",
    company: "Modern Tribe",
    title: "Senior UI Developer",
    start: "Mar 2020",
    end: "Mar 2024",
    impact: "Agency work: products and sites for Harvard, Vimeo, BigCommerce and Steelcase.",
    url: "https://moderntribe.com",
  },
  {
    id: "woonivers-role",
    company: "Woonivers",
    title: "React Native Developer",
    start: "Oct 2018",
    end: "Mar 2020",
    impact:
      "Joined the original team at one of Madrid's top startups and co-built the app that digitised tax-free shopping in Spain.",
    url: "https://woonivers.com",
  },
  {
    id: "secret-source",
    company: "Secret Source",
    title: "Software Developer",
    start: "Jun 2017",
    end: "Oct 2018",
    impact: "My first job, where I started with React and React Native.",
  },
];
