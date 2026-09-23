const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://jtubizlrigutrhwcdmqd.supabase.co';
const supabaseKey = 'sb_secret_cm8cHWAy5Nk3IDyY5HJ35g_eqj3e4tO';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.from('gestures_library').select('*').limit(1);
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Columns:', Object.keys(data[0] || {}));
  }
}
check();
