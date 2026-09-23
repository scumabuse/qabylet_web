const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://jtubizlrigutrhwcdmqd.supabase.co';
const supabaseKey = 'sb_secret_cm8cHWAy5Nk3IDyY5HJ35g_eqj3e4tO';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check(table) {
  const { data, error } = await supabase.from(table).select('*').limit(1);
  if (error) {
    console.error(`Error checking ${table}:`, error);
    return;
  }
  console.log(`${table} columns:`, Object.keys(data[0] || {}));
}

async function run() {
  await check('courses');
  await check('user_progress');
  await check('lessons');
}

run();
