const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://jtubizlrigutrhwcdmqd.supabase.co';
const supabaseKey = 'sb_secret_cm8cHWAy5Nk3IDyY5HJ35g_eqj3e4tO';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.from('gestures_library').select('*').eq('word', 'привет_test').single();
  if (error) {
    console.log("Error:", error);
  } else {
    console.log("Row columns:", Object.keys(data));
    console.log("Row data:", data);
  }
}
check();
