const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://jtubizlrigutrhwcdmqd.supabase.co';
const supabaseKey = 'sb_secret_cm8cHWAy5Nk3IDyY5HJ35g_eqj3e4tO';

const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  console.log("Checking lessons...");
  let { data: l, error: le } = await supabase.from('lessons').select('*').limit(1);
  console.log("lessons:", l, le);
}

check();
