import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import "react-native-url-polyfill/auto";

// Go to https://supabase.com → your project → Settings → API
// and paste your values here:
const SUPABASE_URL = "https://ltmhowjwrrvjpidclhrb.supabase.co";
const SUPABASE_ANON =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imx0bWhvd2p3cnJ2anBpZGNsaHJiIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODExNzc2MjUsImV4cCI6MjA5Njc1MzYyNX0.G6iJRyUKWnHCMMr6tPpZRRKzYbGtLp2lwNhHpAxKb8g"; // paste the eyJ... key here

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});
