/**
 * Environment Variables Validator & Config Provider
 * Ensures critical secrets are present and safe before server boots up.
 */

const dotenv = require('dotenv');
dotenv.config();

const NODE_ENV = process.env.NODE_ENV || 'development';
const PORT = parseInt(process.env.PORT || '8847', 10);
const JWT_SECRET = process.env.JWT_SECRET;
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';
const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads';
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || '';
const SENDGRID_FROM = process.env.SENDGRID_FROM || 'no-reply@claimit.local';
const MAX_FILE_SIZE_MB = parseInt(process.env.MAX_FILE_SIZE_MB || '10', 10);
const MAX_CLAIM_ASSETS = parseInt(process.env.MAX_CLAIM_ASSETS || '5', 10);

// Strict validation of JWT Secret
if (!JWT_SECRET) {
  if (NODE_ENV === 'production') {
    console.error('FATAL: JWT_SECRET environment variable is missing in production. Server startup aborted.');
    process.exit(1);
  } else {
    console.warn('WARNING: JWT_SECRET is not set in .env. Please set a secure random string.');
    // In dev, fail startup if missing to prevent insecure defaults
    console.error('FATAL: JWT_SECRET must be explicitly defined in .env or environment.');
    process.exit(1);
  }
}

if (JWT_SECRET.length < 16 && NODE_ENV === 'production') {
  console.error('FATAL: JWT_SECRET is too short for production (minimum 16 characters required).');
  process.exit(1);
}

module.exports = {
  NODE_ENV,
  PORT,
  JWT_SECRET,
  CORS_ORIGIN,
  UPLOAD_DIR,
  SENDGRID_API_KEY,
  SENDGRID_FROM,
  MAX_FILE_SIZE_MB,
  MAX_CLAIM_ASSETS
};
