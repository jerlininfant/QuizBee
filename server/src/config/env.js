import dotenv from 'dotenv';
dotenv.config();

export const config = {
  port: process.env.PORT || 5000,
  nodeEnv: process.env.NODE_ENV || 'development',
  jwtSecret: process.env.JWT_SECRET || 'quizbee_dev_secret_key_default',
  supabaseUrl: process.env.SUPABASE_URL || '',
  supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  openaiApiKey: process.env.OPENAI_API_KEY || '',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173'
};
