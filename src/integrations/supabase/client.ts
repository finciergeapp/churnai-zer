// This file is automatically generated. Do not edit it directly.
import { createClient } from '@supabase/supabase-js';
import type { Database } from './types';

const SUPABASE_URL = "https://ntbkydpgjaswmwruegyl.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im50Ymt5ZHBnamFzd213cnVlZ3lsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQyODg1MTEsImV4cCI6MjA1OTg2NDUxMX0.09ZDj0fLWEEh3oi0Bwcen_xr2Gyw2aAyCerGfMsHNfE";

// Import the supabase client like this:
// import { supabase } from "@/integrations/supabase/client";

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
    storageKey: 'churnaizer-auth',
    flowType: 'pkce'
  }
});