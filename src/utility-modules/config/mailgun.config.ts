import { registerAs } from '@nestjs/config';

// Simple interface for type safety (no decorators needed)
export interface MailgunConfigInterface {
  apiKey: string;
  domain: string;
  publicKey?: string;
  timeout: number;
  apiUrl: string;
  fromEmail: string;
  fromName: string;
}

// Validation function
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export const validateMailgunConfig = (config: any): MailgunConfigInterface => {
  if (!config.apiKey) {
    throw new Error('MAILGUN_API_KEY is required');
  }
  if (!config.domain) {
    throw new Error('MAILGUN_DOMAIN is required');
  }
  return config;
};

export default registerAs('mailgun', (): MailgunConfigInterface => {
  const config = {
    apiKey: process.env.MAILGUN_API_KEY,
    domain: process.env.MAILGUN_DOMAIN,
    publicKey: process.env.MAILGUN_PUBLIC_KEY,
    timeout: parseInt(process.env.MAILGUN_TIMEOUT || '10000', 10),
    apiUrl: process.env.MAILGUN_API_URL || 'https://api.mailgun.net',
    fromEmail: process.env.MAILGUN_FROM_EMAIL || `noreply@${process.env.MAILGUN_DOMAIN}`,
    fromName: process.env.MAILGUN_FROM_NAME || 'Your App',
  };

  return validateMailgunConfig(config);
});