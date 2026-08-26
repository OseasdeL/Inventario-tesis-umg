import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://yokqrlseqripsprlmven.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inlva3FybHNlcXJpcHNwcmxtdmVuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODcyNzYzNjcsImV4cCI6MjEwMjg1MjM2N30.tiqESYTOD7OhyCDSwz3kCmogUh9uSH9zUl4nk5C-2OI';
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);