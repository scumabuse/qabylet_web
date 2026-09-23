const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://jtubizlrigutrhwcdmqd.supabase.co';
const supabaseKey = 'sb_secret_cm8cHWAy5Nk3IDyY5HJ35g_eqj3e4tO';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log("Checking courses...");
  let { data, error } = await supabase.from('courses').select('*').limit(1);
  console.log("courses:", data, error);

  console.log("Checking profiles...");
  let { data: p, error: pe } = await supabase.from('profiles').select('*').limit(1);
  console.log("profiles:", p, pe);

  console.log("Checking chat_history...");
  let { data: c, error: ce } = await supabase.from('chat_history').select('*').limit(1);
  console.log("chat_history:", c, ce);
}

check();
