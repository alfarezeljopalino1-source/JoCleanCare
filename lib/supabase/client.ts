import { createBrowserClient } from "@supabase/ssr";

import { getSupabaseConfig } from "./config";

export function createClient() {
  const config = getSupabaseConfig();
  if (!config) throw new Error("Supabase belum dikonfigurasi. Lengkapi environment variable terlebih dahulu.");
  return createBrowserClient(config.url, config.key);
}
