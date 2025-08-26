// Server-only Supabase Admin client
// Never import this file in client bundles
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY;

if (process.env.NODE_ENV === 'production') {
  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Supabase admin configuration required in production');
  }
}

export const supabaseAdmin = supabaseUrl && supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
      db: { schema: 'public' },
    })
  : null;

export default supabaseAdmin;

