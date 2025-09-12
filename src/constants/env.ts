export const ENV = {
  DATABASE_URL: process.env.DATABASE_URL as string,
  MAILGUN_API_KEY: process.env.MAILGUN_API_KEY as string,
  MAILGUN_DOMAIN: process.env.MAILGUN_DOMAIN as string,
  PORT: process.env.PORT ? parseInt(process.env.PORT, 10) : 3000,
};
