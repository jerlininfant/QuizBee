import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from '../config/env.js';
import { AIService } from '../services/aiService.js';
import { SupabaseRepository } from '../db/supabaseRepository.js';
import { initSupabase } from '../config/supabase.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const envPath = path.resolve(__dirname, '../../.env');

export const getSystemStatus = async (req, res) => {
  try {
    const aiConfigured = AIService.isConfigured();
    const dbTest = await SupabaseRepository.testConnection();

    return res.json({
      success: true,
      ai: {
        provider: 'OpenAI',
        model: 'gpt-4o-mini',
        configured: aiConfigured,
        fallbackActive: !aiConfigured,
        status: aiConfigured ? 'Live OpenAI API Connected' : 'Smart Domain-Aware Heuristic Generator Active'
      },
      database: {
        provider: 'Supabase PostgreSQL',
        configured: SupabaseRepository.isConfigured(),
        connected: dbTest.connected,
        status: dbTest.connected
          ? 'Live Supabase PostgreSQL Connected'
          : SupabaseRepository.isConfigured()
          ? `Configured (Connection check: ${dbTest.error || 'Pending schema setup'})`
          : 'Local Authoritative Persistence Store Active',
        mode: dbTest.connected ? 'supabase_postgres' : 'authoritative_local'
      },
      environment: config.nodeEnv,
      version: '1.0.0'
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};

export const updateSystemConfig = async (req, res) => {
  try {
    const { openaiApiKey, supabaseUrl, supabaseKey } = req.body;

    let envContent = '';
    if (fs.existsSync(envPath)) {
      envContent = fs.readFileSync(envPath, 'utf-8');
    }

    // Helper to replace or append env line
    const setEnvVal = (key, val) => {
      if (val === undefined || val === null) return;
      const regex = new RegExp(`^${key}=.*$`, 'm');
      if (regex.test(envContent)) {
        envContent = envContent.replace(regex, `${key}=${val}`);
      } else {
        envContent += `\n${key}=${val}`;
      }
      process.env[key] = val;
    };

    if (openaiApiKey !== undefined) {
      setEnvVal('OPENAI_API_KEY', openaiApiKey.trim());
      config.openaiApiKey = openaiApiKey.trim();
    }

    if (supabaseUrl !== undefined) {
      setEnvVal('SUPABASE_URL', supabaseUrl.trim());
      config.supabaseUrl = supabaseUrl.trim();
    }

    if (supabaseKey !== undefined) {
      setEnvVal('SUPABASE_SERVICE_ROLE_KEY', supabaseKey.trim());
      config.supabaseKey = supabaseKey.trim();
    }

    fs.writeFileSync(envPath, envContent.trim() + '\n', 'utf-8');

    // Re-init Supabase if updated
    if (supabaseUrl || supabaseKey) {
      initSupabase(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
    }

    // Test connectivity
    const aiConfigured = AIService.isConfigured();
    const dbTest = await SupabaseRepository.testConnection();

    return res.json({
      success: true,
      message: 'System configuration saved successfully',
      aiConfigured,
      dbStatus: dbTest
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: err.message });
  }
};
