/**
 * Create and export configuration variables
 */

// Container for all the environments
const environments = {};

// Staging (default) environment
environments.staging = {
  httpPort: 3000,
  httpsPort: 3001,
  envName: 'staging',
  hashSecret: 'thisIsASecret',
  passwordExp: 1000 * 60 * 60,
  stripe: {
    url: 'https://api.stripe.com',
    key: '{{YOUR_KEY_HERE}}',
  },
  mailgun: {
    url: 'https://api.mailgun.net/v3',
    domain: '{{YOUR_DOMAIN_HERE}}',
    key: '{{YOUR_TOKEN_HERE}}',
    from: 'Pizzapp <contact@:domain>',
  },
  app: {
    name: 'Pizzapp',
    domain: 'https://example.com/pizzapp',
    supportUrl: 'https://example.com/pizzapp/support',
  },
};

// Production environment
environments.production = {
  httpPort: 5000,
  httpsPort: 5001,
  envName: 'production',
  hashSecret: 'thisIsASecret',
  passwordExp: 1000 * 60 * 60,
  stripe: {
    url: 'https://api.stripe.com',
    key: '{{YOUR_KEY_HERE}}',
  },
  mailgun: {
    url: 'https://api.mailgun.net/v3',
    domain: '{{YOUR_DOMAIN_HERE}}',
    key: '{{YOUR_TOKEN_HERE}}',
    from: 'Pizzapp <contact@:domain>',
  },
  app: {
    name: 'Pizzapp',
    domain: 'https://example.com/pizzapp',
    supportUrl: 'https://example.com/pizzapp/support',
  },
};

// Determine which environment was passed as a command-line argument
const currentEnv =
  typeof process.env.NODE_ENV === 'string'
    ? process.env.NODE_ENV.toLowerCase()
    : '';

// Check that the current environment is one of the environments above, if not, default to staging
const env = environments[currentEnv] || environments.staging;

module.exports = env;
