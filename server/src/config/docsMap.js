/**
 * Official Documentation Registry
 * Maps core technologies, frameworks, libraries, and tools directly to verified official doc domains.
 */
export const DOCS_MAP = {
  // Frontend
  react: 'https://react.dev',
  nextjs: 'https://nextjs.org/docs',
  vue: 'https://vuejs.org/guide/introduction.html',
  angular: 'https://angular.dev',
  svelte: 'https://svelte.dev/docs',
  tailwind: 'https://tailwindcss.com/docs',
  tailwindcss: 'https://tailwindcss.com/docs',
  redux: 'https://redux.js.org',
  typescript: 'https://www.typescriptlang.org/docs',
  javascript: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript',
  html: 'https://developer.mozilla.org/en-US/docs/Web/HTML',
  css: 'https://developer.mozilla.org/en-US/docs/Web/CSS',

  // Backend & Runtime
  node: 'https://nodejs.org/en/docs',
  nodejs: 'https://nodejs.org/en/docs',
  express: 'https://expressjs.com',
  fastify: 'https://fastify.dev/docs/latest',
  nest: 'https://docs.nestjs.com',
  nestjs: 'https://docs.nestjs.com',
  python: 'https://docs.python.org/3',
  django: 'https://docs.djangoproject.com',
  fastapi: 'https://fastapi.tiangolo.com',
  golang: 'https://go.dev/doc',
  rust: 'https://doc.rust-lang.org/book',

  // Databases & ORMs
  mongodb: 'https://www.mongodb.com/docs',
  mongoose: 'https://mongoosejs.com/docs',
  postgresql: 'https://www.postgresql.org/docs',
  postgres: 'https://www.postgresql.org/docs',
  mysql: 'https://dev.mysql.com/doc',
  redis: 'https://redis.io/docs',
  prisma: 'https://www.prisma.io/docs',
  drizzle: 'https://orm.drizzle.team/docs/overview',

  // DevOps & Cloud
  docker: 'https://docs.docker.com',
  kubernetes: 'https://kubernetes.io/docs',
  git: 'https://git-scm.com/doc',
  github: 'https://docs.github.com',
  aws: 'https://docs.aws.amazon.com',
  azure: 'https://learn.microsoft.com/en-us/azure',
  gcp: 'https://cloud.google.com/docs',
  vercel: 'https://vercel.com/docs',

  // Testing & Tooling
  jest: 'https://jestjs.io/docs/getting-started',
  vitest: 'https://vitest.dev/guide',
  cypress: 'https://docs.cypress.io',
  playwright: 'https://playwright.dev/docs/intro',
  graphql: 'https://graphql.org/learn',
  zod: 'https://zod.dev'
};

/**
 * Normalizes input key and looks up URL in DOCS_MAP
 * @param {string} name
 * @returns {string|null}
 */
export const getDocsUrl = (name = '') => {
  if (!name) return null;
  const normalized = name.toLowerCase().replace(/[^a-z0-9]/g, '');
  return DOCS_MAP[normalized] || null;
};
