import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_KEY;

let supabase = null;
let supabaseAdmin = null;

if (!supabaseUrl || !supabaseKey || supabaseUrl === 'your-supabase-url' || supabaseKey === 'your-anon-key') {
  console.warn('⚠️  Supabase not configured. Database features will be disabled.');
} else {
  supabase = createClient(supabaseUrl, supabaseKey);
  supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
}

export { supabase, supabaseAdmin };