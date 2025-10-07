import { themes as prismThemes } from "prism-react-renderer"
import type { Config } from "@docusaurus/types"
import type * as Preset from "@docusaurus/preset-classic"

// This runs in Node.js - Don't use client-side code here (browser APIs, JSX...)

const config: Config = {
  title: "docker-staticmaps",
  tagline: "A static map rendering API service built with Node.js & Docker",

  favicon: "img/favicon.ico",

  // Future flags, see https://docusaurus.io/docs/api/docusaurus-config#future
  future: {
    v4: true, // Improve compatibility with the upcoming Docusaurus v4
  },

  // Set the production url of your site here
  url: "https://dietrichmax.github.io",
  // Set the /<baseUrl>/ pathname under which your site is served
  // For GitHub pages deployment, it is often '/<projectName>/'
  baseUrl: "/docker-staticmaps/",

  // GitHub pages deployment config.
  // If you aren't using GitHub pages, you don't need these.
  organizationName: "dietrichmax",
  projectName: "docker-staticmaps",

  deploymentBranch: "gh-pages",

  onBrokenLinks: "warn",

  trailingSlash: false,
  // Even if you don't use internationalization, you can use this field to set
  // useful metadata like html lang. For example, if your site is Chinese, you
  // may want to replace "en" with "zh-Hans".
  i18n: {
    defaultLocale: "en",
    locales: ["en"],
  },

  presets: [
    [
      "classic",
      {
        docs: {
          sidebarPath: "./sidebars.ts",
          routeBasePath: "/", // Serve the docs at the site's root
          editUrl:
            "https://github.com/dietrichmax/docker-staticmaps/edit/main/docs/",
        },
        blog: false, // Optional: disable the blog plugin
        theme: {
          customCss: "./src/css/custom.css",
        },
      } satisfies Preset.Options,
    ],
  ],

  scripts: [
    {
      "src": "https://analytics.mxd.codes/js/script.js",
      "defer": true,
      "data-domain": "dietrichmax.github.io",
    },
  ],

  themeConfig: {
    // Replace with your project's social card
    //image: 'img/docusaurus-social-card.jpg',
    colorMode: {
      respectPrefersColorScheme: true,
    },
    navbar: {
      title: "docker-staticmaps",
      items: [
        {
          type: "docSidebar",
          sidebarId: "tutorialSidebar",
          position: "left",
          label: "Documentation",
        },
        {
          href: "https://github.com/dietrichmax/docker-staticmaps",
          label: "GitHub",
          position: "right",
        },
      ],
    },
    footer: {
      style: "dark",
      links: [
        {
          title: "Links",
          items: [
            {
              label: "Documentation",
              to: "/",
            },
            {
              label: "Github",
              to: "https://github.com/dietrichmax/docker-staticmaps",
            },
            {
              label: "Privacy Policy",
              to: "/privacy-policy",
            },
            {
              label: "Site Notice",
              to: "/site-notice",
            },
          ],
        },
      ],
      copyright: `docker-staticmaps is available as open source under the terms of the GPL-3.0 license `,
    },
    prism: {
      theme: prismThemes.github,
      darkTheme: prismThemes.github,
    },
  } satisfies Preset.ThemeConfig,
}

export default config
