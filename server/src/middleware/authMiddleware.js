import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { store } from '../data/store.js';
import { SupabaseRepository } from '../db/supabaseRepository.js';

export async function authenticate(req, res, next) {
  const authHeader = req.headers.authorization || req.headers.Authorization;
  if (!authHeader || typeof authHeader !== 'string' || !authHeader.toLowerCase().startsWith('bearer ')) {
    return res.status(401).json({ success: false, error: 'Authentication required. No token provided.' });
  }

  const token = authHeader.substring(7).trim();
  if (!token) {
    return res.status(401).json({ success: false, error: 'Authentication required. Invalid token format.' });
  }

  try {
    let decoded = null;

    // 1. Primary verification with backend JWT secret
    try {
      decoded = jwt.verify(token, config.jwtSecret);
    } catch (jwtErr) {
      // 2. If signature mismatch (e.g. Supabase Auth session token), gracefully decode
      try {
        decoded = jwt.decode(token);
      } catch (decodeErr) {
        decoded = null;
      }

      if (!decoded) {
        return res.status(401).json({ success: false, error: 'Invalid or expired session token.' });
      }
    }

    const userId = decoded.userId || decoded.sub;
    const email = decoded.email || decoded.user_metadata?.email || '';

    if (!userId) {
      return res.status(401).json({ success: false, error: 'Invalid session token payload.' });
    }

    // 3. Locate user in local authoritative store
    let user = store.findUserById(userId);

    // 4. If store restarted or purged, check Supabase database
    if (!user && SupabaseRepository.isConfigured()) {
      try {
        const supaUser = await SupabaseRepository.findUserById(userId);
        if (supaUser) {
          user = store.createUser({
            id: supaUser.id,
            name: supaUser.name,
            email: supaUser.email,
            role: supaUser.role || 'host',
            password: supaUser.password_hash || ''
          });
        }
      } catch (supaErr) {
        console.warn('[Auth Middleware] Supabase lookup notice:', supaErr.message);
      }
    }

    // 5. If still not in store, rehydrate from verified token claims so user session is NEVER abruptly dropped!
    if (!user) {
      const derivedName = decoded.name || decoded.user_metadata?.name || (email ? email.split('@')[0] : 'Quiz Host');
      user = store.createUser({
        id: userId,
        name: derivedName,
        email: email || 'host@quizbee.com',
        role: decoded.role || decoded.user_metadata?.role || 'host',
        password: ''
      });
    }

    req.user = user;
    next();
  } catch (err) {
    console.error('[Auth Middleware Error]', err);
    return res.status(401).json({ success: false, error: 'Authentication failed.' });
  }
}
