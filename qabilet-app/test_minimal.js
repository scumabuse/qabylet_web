const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://jtubizlrigutrhwcdmqd.supabase.co';
const supabaseKey = 'sb_secret_cm8cHWAy5Nk3IDyY5HJ35g_eqj3e4tO';
const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
  const entries = [
    {
      word: "привет_lang_test_2",
      lang: "ru"
    }
  ];

  console.log(`Trying insert with lang...`);
  const { data, error } = await supabase.from('gestures_library').upsert(entries);
  
  if (error) {
    console.error("Lang insert failed:", error);
  } else {
    console.log("Lang insert success!");
  }
}

seed();
