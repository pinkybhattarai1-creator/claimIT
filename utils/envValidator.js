/**
 * Environment Variables Validator & Config Provider
 * Ensures critical secrets are present and safe before server boots up.
 */

const dotenv = require('dotenv');
dotenv.config();

const NODE_ENV = process.env.NODE_ENV || 'development';
const PORT = parseInt(process.env.PORT || '8847', 10);
const JWT_SECRET = process.env.JWT_SECRET || (NODE_ENV !== 'production' ? 'claimit_default_secure_secret_key_2026_dev' : undefined);
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';
const UPLOAD_DIR = process.env.UPLOAD_DIR || 'uploads';
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const RESEND_FROM = process.env.RESEND_FROM || 'onboarding@resend.dev';
const SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || '';
const SENDGRID_FROM = process.env.SENDGRID_FROM || process.env.EMAIL_FROM || 'no-reply@claimit.local';
const MAX_FILE_SIZE_MB = parseInt(process.env.MAX_FILE_SIZE_MB || '10', 10);
const MAX_CLAIM_ASSETS = parseInt(process.env.MAX_CLAIM_ASSETS || '5', 10);
const HOST = process.env.HOST || '0.0.0.0';
const SECRET_PORTAL_PATH = process.env.SECRET_PORTAL_PATH || '';

// Strict validation of JWT Secret in production
if (!JWT_SECRET) {
  if (NODE_ENV === 'production') {
    console.error('FATAL: JWT_SECRET environment variable is missing in production. Server startup aborted.');
    process.exit(1);
  }
}

if (JWT_SECRET && JWT_SECRET.length < 16 && NODE_ENV === 'production') {
  console.error('FATAL: JWT_SECRET is too short for production (minimum 16 characters required).');
  process.exit(1);
}

module.exports = {
  NODE_ENV,
  PORT,
  JWT_SECRET,
  CORS_ORIGIN,
  UPLOAD_DIR,
  RESEND_API_KEY,
  RESEND_FROM,
  SENDGRID_API_KEY,
  SENDGRID_FROM,
  MAX_FILE_SIZE_MB,
  MAX_CLAIM_ASSETS,
  HOST,
  SECRET_PORTAL_PATH
};
