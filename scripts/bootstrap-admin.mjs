import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://aibklzudikrwhmnipchj.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpYmtsenVkaWtyd2htbmlwY2hqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkwMTc1MzgsImV4cCI6MjEwNDU5MzUzOH0.iMKol8D4vaDxH0ZXB1HVE-SI6cFGTJyO4JvnTilp9EQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function bootstrap() {
  console.log('Signing up Super Admin E Maniraj...');
  const { data, error } = await supabase.auth.signUp({
    email: 'maniraj.e@ptffoundation.org',
    password: 'Vizhuthugal@2026',
    options: {
      data: {
        full_name: 'E Maniraj',
        role: 'SUPER_ADMIN',
      },
    },
  });

  if (error) {
    console.error('Sign up error:', error);
    process.exit(1);
  }

  console.log('Super admin created with user id:', data.user?.id);
}

bootstrap();
