import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { store } from '../data/store.js';
import { config } from '../config/env.js';
import { supabase } from '../config/supabase.js';

export const register = async (req, res) => {
  try {
    const { name, email, password, role = 'host' } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ success: false, error: 'Please provide name, email, and password.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ success: false, error: 'Password must be at least 6 characters long.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();

    // Check store first
    const existingUser = store.findUserByEmail(cleanEmail);
    if (existingUser) {
      return res.status(400).json({ success: false, error: 'An account with this email already exists.' });
    }

    let supabaseUserId = null;

    // Supabase Auth Integration
    if (supabase) {
      try {
        const { data: supaData, error: supaError } = await supabase.auth.signUp({
          email: cleanEmail,
          password,
          options: {
            data: {
              name: cleanName,
              role
            }
          }
        });

        if (supaError) {
          console.warn('[Supabase Auth] SignUp warning:', supaError.message);
          // If user already exists in Supabase
          if (supaError.message?.toLowerCase().includes('already registered')) {
            return res.status(400).json({ success: false, error: 'An account with this email already exists.' });
          }
        } else if (supaData && supaData.user) {
          supabaseUserId = supaData.user.id;
        }
      } catch (authErr) {
        console.warn('[Supabase Auth] Failed during signUp:', authErr.message);
      }
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const user = store.createUser({
      id: supabaseUserId || undefined,
      name: cleanName,
      email: cleanEmail,
      password: passwordHash,
      role
    });

    const token = jwt.sign({ userId: user.id, email: user.email, role: user.role }, config.jwtSecret, {
      expiresIn: '7d'
    });

    return res.status(201).json({
      success: true,
      message: 'Account registered successfully',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    console.error('Register error:', err);
    return res.status(500).json({ success: false, error: 'Server error during registration.' });
  }
};

export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Please provide both email and password.' });
    }

    const cleanEmail = email.trim().toLowerCase();

    // 1. If Supabase is configured, attempt Supabase Auth first
    if (supabase) {
      try {
        const { data: supaAuth, error: supaErr } = await supabase.auth.signInWithPassword({
          email: cleanEmail,
          password
        });

        if (!supaErr && supaAuth?.user) {
          let user = store.findUserByEmail(cleanEmail);
          if (!user) {
            // Re-sync user into store
            user = store.createUser({
              id: supaAuth.user.id,
              name: supaAuth.user.user_metadata?.name || cleanEmail.split('@')[0],
              email: cleanEmail,
              password: '',
              role: supaAuth.user.user_metadata?.role || 'host'
            });
          }

          const token = jwt.sign(
            { userId: user.id, email: user.email, role: user.role },
            config.jwtSecret,
            { expiresIn: '7d' }
          );

          return res.json({
            success: true,
            message: 'Logged in successfully via Supabase Auth',
            token: supaAuth.session?.access_token || token,
            user: {
              id: user.id,
              name: user.name,
              email: user.email,
              role: user.role
            }
          });
        }
      } catch (authErr) {
        console.warn('[Supabase Auth] Fallback to authoritative password verification:', authErr.message);
      }
    }

    // 2. Authoritative local credential validation
    const user = store.findUserByEmail(cleanEmail);
    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid email or password.' });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, error: 'Invalid email or password.' });
    }

    const token = jwt.sign(
      { userId: user.id, email: user.email, role: user.role },
      config.jwtSecret,
      { expiresIn: '7d' }
    );

    return res.json({
      success: true,
      message: 'Logged in successfully',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ success: false, error: 'Server error during login.' });
  }
};

export const getMe = async (req, res) => {
  try {
    const user = req.user;
    return res.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    return res.status(500).json({ success: false, error: 'Failed to retrieve profile.' });
  }
};
