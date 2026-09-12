import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://aibklzudikrwhmnipchj.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpYmtsenVkaWtyd2htbmlwY2hqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkwMTc1MzgsImV4cCI6MjEwNDU5MzUzOH0.iMKol8D4vaDxH0ZXB1HVE-SI6cFGTJyO4JvnTilp9EQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function testLogin() {
  console.log('Testing sign-in with demo@ptffoundation.org / Demo@2026 ...');
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'demo@ptffoundation.org',
    password: 'Demo@2026',
  });

  if (error) {
    console.error('Sign-in failed:', error.message);
    process.exit(1);
  }

  console.log('Sign-in successful!');
  console.log('User ID:', data.user.id);
  console.log('Email:', data.user.email);

  // Check profile
  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', data.user.id)
    .single();

  if (profileErr) {
    console.error('Profile fetch failed:', profileErr.message);
    process.exit(1);
  }

  console.log('Profile loaded:', {
    name: profile.full_name,
    role: profile.role,
    must_change_password: profile.must_change_password,
    is_active: profile.is_active,
  });
}

testLogin();
