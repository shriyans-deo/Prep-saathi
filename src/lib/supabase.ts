import { createClient } from '@supabase/supabase-js';

const supabaseUrl =
  import.meta.env.VITE_SUPABASE_URL ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_URL ||
  import.meta.env.SUPABASE_URL ||
  'https://erlubucdmvntadedemqh.supabase.co';

const supabaseAnonKey =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  import.meta.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
  import.meta.env.SUPABASE_ANON_KEY ||
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVybHVidWNkbXZudGFkZWRlbXFoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTMyOTk0MjcsImV4cCI6MjEwODg3NTQyN30.NMoKTZUMbTXfT1sgst4NHCpcdBSI_puICBJduWaHEcY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
