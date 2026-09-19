const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');

const env = fs.readFileSync('.env.local', 'utf8');
env.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    const key = match[1];
    let value = match[2] || '';
    if (value.length > 0 && value.charAt(0) === '"' && value.charAt(value.length - 1) === '"') {
      value = value.replace(/\\n/gm, '\n');
    }
    value = value.replace(/(^['"]|['"]$)/g, '').trim();
    process.env[key] = value;
  }
});

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  console.log("Authenticating as SUPER_ADMIN...");
  
  const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
    email: 'demo@ptffoundation.org',
    password: 'Demo@2026',
  });
  
  if (authError) {
    console.error("Auth failed:", authError.message);
    return;
  }
  
  console.log("Authenticated. Fetching staff mentor ID...");
  
  const { data: mentor, error: mentorError } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', 'staff.mentor@ptffoundation.org')
    .single();
    
  if (mentorError || !mentor) {
    console.error("Could not find mentor ID", mentorError);
    return;
  }

  console.log("Re-inserting missing EXPIRED QA record for E2E tests...");
  
  // Date intentionally far in the past (more than 24h) to trigger 'EXPIRED' state.
  const expiredDate = new Date();
  expiredDate.setDate(expiredDate.getDate() - 5); 
  
  const { error: insertError } = await supabase
    .from('attendance')
    .insert({
      id: 'aaa12f16-e0bd-48c9-a2d1-2caef3c0a570',
      student_id: '0e2c88f1-a128-4ef8-a4ec-4f1efb49463b',
      attendance_date: '2026-10-01',
      session_type: 'MORNING',
      status: 'PRESENT',
      mentor_id: mentor.id,
      created_at: expiredDate.toISOString(),
      updated_at: expiredDate.toISOString(),
      is_locked: true
    });
    
  if (insertError) {
    if (insertError.code === '23505') {
       console.log("Record already exists.");
    } else {
       console.error("Failed to insert record:", insertError);
    }
  } else {
    console.log("Successfully inserted QA record aaa12f16-e0bd-48c9-a2d1-2caef3c0a570");
  }
  
  console.log("Done.");
}

run();
