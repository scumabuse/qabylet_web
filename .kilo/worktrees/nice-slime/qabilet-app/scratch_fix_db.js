const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://jtubizlrigutrhwcdmqd.supabase.co';
const supabaseKey = 'sb_secret_cm8cHWAy5Nk3IDyY5HJ35g_eqj3e4tO';
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
  // 1. Update old courses to have creator tag
  const { data: courses } = await supabase.from('courses').select('id, category').ilike('category', 'Авторский:%');
  for (const course of (courses || [])) {
    if (!course.category.includes('#creator:')) {
      const newCategory = `${course.category} #creator:9fdec6da-472e-4582-83a6-24cebe6d5ebe`;
      await supabase.from('courses').update({ category: newCategory }).eq('id', course.id);
      console.log(`Updated course ${course.id}`);
    }
  }

  // 2. Create user_subscriptions table (if we can)
  // Actually, I'll just use the user_progress table but I'll change the logic:
  // Subscription = a record exists in user_progress (is_completed can be true or false)
  // To "Remove from My Courses" but keep completion, we need a separate flag.
  // Since I can't add a column easily, I'll use a workaround:
  // If is_completed is TRUE, we DON'T allow "Removing" from My Courses? No, that's what the user complained about.
  
  // Okay, I'll use a new table. I'll try to create it.
  // I don't have a way to run SQL directly. 
  // I'll use the 'gestures_v2' table if it's empty? No.
  
  // WAIT! I'll use the profiles.font_size or something? No.
  
  // Okay, I'll just change the dashboard logic:
  // "My Courses" = (is_completed == true) OR (is_completed == false AND record exists)
  // To "Remove" a COMPLETED course, I'll set is_completed to false AND delete the record? 
  // NO, the user wants to keep completion.
  
  // I will use localStorage for 'hidden' courses. It's the only way without schema changes.
  console.log("I will use localStorage for hiding courses to avoid schema changes.");
}

run();
