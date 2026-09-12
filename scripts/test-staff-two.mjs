import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://aibklzudikrwhmnipchj.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFpYmtsenVkaWtyd2htbmlwY2hqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODkwMTc1MzgsImV4cCI6MjEwNDU5MzUzOH0.iMKol8D4vaDxH0ZXB1HVE-SI6cFGTJyO4JvnTilp9EQ'
);

async function main() {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'staff.two@ptffoundation.org',
    password: 'Staff@2026',
  });
  console.log('Result:', data?.user?.email, 'Error:', error);
}

main();
