import 'react-native-url-polyfill/auto';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabasePublishableKey = process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

let client: SupabaseClient | null = null;

export function getSupabaseConfigError() {
  if (!supabaseUrl || !supabasePublishableKey) {
    return 'Missing EXPO_PUBLIC_SUPABASE_URL or EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY.';
  }

  return null;
}

export function getSupabaseClient() {
  const configError = getSupabaseConfigError();
  const url = supabaseUrl;
  const publishableKey = supabasePublishableKey;

  if (configError || !url || !publishableKey) {
    throw new Error(configError ?? 'Missing Supabase configuration.');
  }

  if (!client) {
    client = createClient(url, publishableKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  }

  return client;
}
