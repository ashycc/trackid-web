import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.PUBLIC_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY;
const supabaseServiceKey = import.meta.env.SUPABASE_SERVICE_ROLE_KEY;

// Public client — respects RLS, safe for client-facing operations
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

// Admin client — bypasses RLS, for server-side admin operations only
export const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
