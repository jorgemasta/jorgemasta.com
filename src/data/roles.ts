/** A Role is a job Jorge held as an employee. Co-founded companies are Projects, not Roles. */
export type Role = {
  company: string;
  title: string;
  start: string;
  /** Omitted while the role is current. */
  end?: string;
  impact: string;
  url?: string;
};

/** Most recent first: one continuous timeline, no overlaps. */
export const ROLES: Role[] = [
  {
    // Liquid Web was absorbed into Nexcess in a rebrand: one Role, not two.
    company: "Nexcess (formerly Liquid Web)",
    title: "Engineer III",
    start: "Mar 2024",
    impact:
      "Second-largest contributor to the customer portal, in a team of 4–6 engineers where I lead some of the projects. I defined the spec and tooling for moving the portal from MUI to our internal design system, led the move from GitLab to GitHub Actions, and built the React checkout that replaced the old one, which back-office and marketing teams can configure themselves. I also integrated Salesforce into the portal and the checkout, built the back-office support uses to manage customer chat, and helped about 25 engineers adopt AI-assisted development: shared agent context in AGENTS.md, reusable Claude skills, and a spec-driven workflow with OpenSpec.",
    url: "https://www.nexcess.net",
  },
  {
    company: "Modern Tribe",
    title: "Senior UI Developer",
    start: "Mar 2020",
    end: "Mar 2024",
    impact:
      "Agency work, where Harvard gave me the most ownership: I built the explorer of the programs and degrees Harvard offers, which helps prospective students find what to study. I also built a WordPress plugin for Vimeo, and React hooks alongside BigCommerce's engineers.",
    url: "https://moderntribe.com",
  },
  {
    company: "Woonivers",
    title: "React Native Developer",
    start: "Oct 2018",
    end: "Mar 2020",
    impact:
      "Joined the original team at one of Madrid's top startups and co-built the app that digitised tax-free shopping in Spain, from scratch, for Android and iOS.",
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
