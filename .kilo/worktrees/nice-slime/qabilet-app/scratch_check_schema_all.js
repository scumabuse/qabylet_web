const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jtubizlrigutrhwcdmqd.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_secret_cm8cHWAy5Nk3IDyY5HJ35g_eqj3e4tO';

const supabase = createClient(supabaseUrl.replace(/\/rest\/v1\/?$/, ''), supabaseKey);

async function check() {
  const { data: coursesData, error: coursesError } = await supabase.from('courses').select('*').limit(1);
  console.log("Courses:", coursesError ? coursesError : Object.keys(coursesData[0] || {}));

  const { data: lessonsData, error: lessonsError } = await supabase.from('lessons').select('*').limit(1);
  console.log("Lessons:", lessonsError ? lessonsError : Object.keys(lessonsData[0] || {}));
}

check();
