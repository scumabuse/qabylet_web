const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jtubizlrigutrhwcdmqd.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_secret_cm8cHWAy5Nk3IDyY5HJ35g_eqj3e4tO';

const supabase = createClient(supabaseUrl.replace(/\/rest\/v1\/?$/, ''), supabaseKey);

async function createBucket() {
  const { data, error } = await supabase.storage.createBucket('user_courses', {
    public: true,
    fileSizeLimit: 52428800 // 50MB
  });

  if (error) {
    console.error("Error creating bucket:", error);
    if (error.message.includes('already exists') || error.message.includes('Duplicate')) {
      const { data: updateData, error: updateError } = await supabase.storage.updateBucket('user_courses', {
        public: true,
        fileSizeLimit: 52428800
      });
      console.log("Update existing bucket:", updateError ? updateError : "Success");
    }
  } else {
    console.log("Successfully created bucket:", data);
  }
}

createBucket();
