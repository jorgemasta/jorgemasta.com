import type { Prose } from "../lib/facts";

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
  /** May mark Facts, namespaced by the Role's id. */
  impact: Prose;
  url?: string;
};

/** Most recent first. */
export const ROLES: Role[] = [
  {
    id: "nexcess",
    company: "Nexcess",
    title: "Engineer III",
    start: "Jun 2026",
    impact: [
      { fact: "portal", text: "Moving the customer portal from legacy code to a modern UI" },
      ". I also ",
      { fact: "ai-coding", text: "help the team get up to speed with programming with AI" },
      ".",
    ],
    url: "https://www.nexcess.net",
  },
  {
    id: "liquid-web",
    company: "Liquid Web",
    title: "Senior Software Engineer",
    start: "Mar 2024",
    end: "Jun 2026",
    impact: [
      { fact: "salesforce", text: "Integrated Salesforce into the customer portal and the checkout" },
      ", and ",
      { fact: "checkout", text: "built a new checkout in React that back-office and marketing teams can configure" },
      ".",
    ],
    url: "https://www.liquidweb.com",
  },
  {
    // No link: its site still carries the old "replace your SaaS" message.
    id: "aios",
    company: "AIOS",
    title: "Co-founder",
    start: "2025",
    end: "Aug 2026",
    impact: [
      "Built ",
      { fact: "organisational-os", text: "an organisational OS that reshapes how a company is organised to put AI at the centre" },
      ", and ",
      { fact: "companies", text: "helped more than 10 companies become AI-native" },
      ".",
    ],
  },
  {
    id: "code-at-light-speed",
    company: "Code at Light Speed",
    title: "Instructor",
    start: "Feb 2025",
    end: "Jun 2025",
    impact: [
      { fact: "courses", text: "Taught live courses on programming with AI to engineering teams, such as XRF's" },
      ", working in their own codebases.",
    ],
    url: "https://codeatlightspeed.com/en",
  },
  {
    id: "modern-tribe",
    company: "Modern Tribe",
    title: "Senior UI Developer",
    start: "Mar 2020",
    end: "Mar 2024",
    impact: [
      "Agency work: ",
      { fact: "clients", text: "products and sites for Harvard, Vimeo, BigCommerce and Steelcase" },
      ". I built ",
      { fact: "harvard", text: "the program brochure on Harvard.edu, where students discover what to study" },
      ", ",
      { fact: "vimeo", text: "a WordPress plugin for Vimeo" },
      ", and ",
      { fact: "bigcommerce", text: "React hooks alongside BigCommerce's engineers" },
      ".",
    ],
    url: "https://moderntribe.com",
  },
  {
    id: "woonivers-role",
    company: "Woonivers",
    title: "React Native Developer",
    start: "Oct 2018",
    end: "Mar 2020",
    impact: [
      "Joined the original team at one of Madrid's top startups and ",
      { fact: "tax-free-app", text: "co-built the app that digitised tax-free shopping in Spain" },
      ".",
    ],
    url: "https://woonivers.com",
  },
  {
    id: "secret-source",
    company: "Secret Source",
    title: "Software Developer",
    start: "Jun 2017",
    end: "Oct 2018",
    impact: ["My first job, where I ", { fact: "react", text: "started with React and React Native" }, "."],
  },
];
