import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://aibklzudikrwhmnipchj.supabase.co';
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpYmtsenVkaWtyd2htbmlwY2hqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkwMTc1MzgsImV4cCI6MjEwNDU5MzUzOH0.iMKol8D4vaDxH0ZXB1HVE-SI6cFGTJyO4JvnTilp9EQ';

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function createDemoStudent() {
  const email = 'student.demo@ptffoundation.org';
  const password = 'Student@2026';

  console.log(`Signing up ${email}...`);
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        full_name: 'Arun Kumar',
        role: 'STUDENT',
      },
    },
  });

  if (error) {
    console.error('Sign up error:', error.message);
    process.exit(1);
  }

  console.log('Student auth created successfully!');
  console.log('User ID:', data.user?.id);
  console.log('Email:', data.user?.email);
}

createDemoStudent();
