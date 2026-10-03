/**
 * Environment Variables Validator & Config Provider
 * Ensures critical secrets are present and safe before server boots up.
 */

const dotenv = require('dotenv');
dotenv.config();

const NODE_ENV = process.env.NODE_ENV || 'production';
const PORT = parseInt(process.env.PORT || '8847', 10);
const JWT_SECRET = process.env.JWT_SECRET || 'claimit_dev_secret_key_super_secure_2026';
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';
const UPLOAD_DIR = process.env.UPLOAD_DIR || 'storage/evidence';
const RESEND_API_KEY = process.env.RESEND_API_KEY || '';
const RESEND_FROM = process.env.RESEND_FROM || 'onboarding@resend.dev';
const MAX_FILE_SIZE_MB = parseInt(process.env.MAX_FILE_SIZE_MB || '10', 10);
const MAX_CLAIM_ASSETS = parseInt(process.env.MAX_CLAIM_ASSETS || '5', 10);
const HOST = process.env.HOST || '0.0.0.0';
const SECRET_PORTAL_PATH = process.env.SECRET_PORTAL_PATH || '';
const VENDOR_WEBHOOK_KEY = process.env.VENDOR_WEBHOOK_KEY || 'claimit_vendor_webhook_secret_2026';

// AI API Keys with built-in fallbacks (allows running without .env)
const GROQ_API_KEY = process.env.GROQ_API_KEY || '';
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const GEMINI_API_KEY = process.env.GEMINI_API_KEY || '';
const FEEDBACK_WEBHOOK_URL = process.env.FEEDBACK_WEBHOOK_URL || '';

if (JWT_SECRET && JWT_SECRET.length < 16 && NODE_ENV === 'production') {
  console.error('FATAL: JWT_SECRET is too short for production (minimum 16 characters required).');
  process.exit(1);
}

// Validation of Vendor Webhook Key in production
if (NODE_ENV === 'production' && process.env.NODE_ENV !== 'test' && process.env.SUPPRESS_DEV_WARNINGS !== 'true') {
  if (!VENDOR_WEBHOOK_KEY || VENDOR_WEBHOOK_KEY === 'claimit_vendor_webhook_secret_2026') {
    console.warn('[Security Warning]: VENDOR_WEBHOOK_KEY is using default development secret. Please rotate to a random 32+ char secret in production.');
  }
}

module.exports = {
  NODE_ENV,
  PORT,
  JWT_SECRET,
  CORS_ORIGIN,
  UPLOAD_DIR,
  RESEND_API_KEY,
  RESEND_FROM,
  MAX_FILE_SIZE_MB,
  MAX_CLAIM_ASSETS,
  HOST,
  SECRET_PORTAL_PATH,
  VENDOR_WEBHOOK_KEY,
  GROQ_API_KEY,
  OPENROUTER_API_KEY,
  GEMINI_API_KEY,
  FEEDBACK_WEBHOOK_URL
};
