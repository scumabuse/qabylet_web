const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://jtubizlrigutrhwcdmqd.supabase.co';
const supabaseKey = 'sb_secret_cm8cHWAy5Nk3IDyY5HJ35g_eqj3e4tO';
const supabase = createClient(supabaseUrl, supabaseKey);

async function check() {
  const { data, error } = await supabase.from('gestures_library').select('word, pattern_json').not('pattern_json', 'is', null);
  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Records with patterns:', data.length);
    console.log('Samples:', data.slice(0, 3).map(d => ({ word: d.word, pattern_type: typeof d.pattern_json })));
  }
}
check();
