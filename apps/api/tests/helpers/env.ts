import 'dotenv/config';

const baseUrl = process.env.DATABASE_URL;
if (!baseUrl) {
  throw new Error(
    'DATABASE_URL not set — copy .env.example to .env and run `docker compose up -d` before tests',
  );
}

const u = new URL(baseUrl);
const baseName = u.pathname.replace(/^\//, '') || 'orvexa';
const testName = baseName.endsWith('_test') ? baseName : `${baseName}_test`;
u.pathname = `/${testName}`;

export const TEST_DATABASE_URL = u.toString();
export const ADMIN_DATABASE_URL = (() => {
  const a = new URL(baseUrl);
  a.pathname = '/postgres';
  return a.toString();
})();
export const TEST_DATABASE_NAME = testName;

process.env.DATABASE_URL = TEST_DATABASE_URL;
process.env.NODE_ENV = process.env.NODE_ENV ?? 'test';
process.env.JWT_SECRET = process.env.JWT_SECRET_TEST ?? 'test-jwt-secret';
process.env.SESSION_JWT_SECRET = process.env.SESSION_JWT_SECRET_TEST ?? 'test-session-secret';
