import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import fs from 'fs';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Function to load .env file
const loadEnvFile = () => {
  const envPath = join(__dirname, '..', '.env');
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
  } else {
    console.warn('.env file not found, using process.env variables');
    dotenv.config();
  }
};

// Load environment variables
loadEnvFile();

// Export environment variables
export const config = {
  PORT: process.env.PORT || 3000,
  ACCESS_TOKEN_SECRET: process.env.ACCESS_TOKEN_SECRET,
  REFRESH_TOKEN_SECRET: process.env.REFRESH_TOKEN_SECRET,
  ACCESS_TOKEN_EXPIRATION: process.env.ACCESS_TOKEN_EXPIRATION || '1d',
  REFRESH_TOKEN_EXPIRATION: process.env.REFRESH_TOKEN_EXPIRATION || '7d',
  DB_HOST: process.env.DB_HOST,
  DB_USER: process.env.DB_USER,
  DB_PASSWORD: process.env.DB_PASSWORD,
  DB_NAME: process.env.DB_NAME,
  DB_PORT: process.env.DB_PORT,
  EMAIL_HOST: process.env.EMAIL_HOST,
  EMAIL_HOST_PASSWORD: process.env.EMAIL_HOST_PASSWORD,
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
  SPACES_BUCKET: process.env.SPACES_BUCKET,
  META_ACCESS_TK: process.env.META_ACCESS_TK,
  META_PHONE_NB_ID: process.env.META_PHONE_NB_ID,
  META_VERIFY_TOKEN: process.env.META_VERIFY_TOKEN,
  ADMIN_SETUP_KEY: process.env.ADMIN_SETUP_KEY
};