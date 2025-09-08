import { createClient } from "@supabase/supabase-js";

// Use Service Role Key for server-side inserts (safe because this API is private)
export const supabase = createClient(
  process.env.SUPABASE_URL as string,
  process.env.SUPABASE_SERVICE_ROLE_KEY as string
);
