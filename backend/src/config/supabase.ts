import "dotenv/config";
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Missing Supabase environment variables");
}

<<<<<<< HEAD
export const supabase = createClient(supabaseUrl, supabaseAnonKey);
=======
export const createSupabaseClient = (accessToken?: string) => {
  const headers = accessToken ? { Authorization: `Bearer ${accessToken}` } : undefined;
  const globalOptions = headers ? { headers } : {};

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: globalOptions,
    auth: {
      persistSession: false,
      autoRefreshToken: false
    }
  });
};

export const supabase = createSupabaseClient();
>>>>>>> 818a8a456e958650dbb3043c0854c9bd7c3e1d32
