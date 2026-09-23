const url = 'https://jtubizlrigutrhwcdmqd.supabase.co/rest/v1/?apikey=sb_secret_cm8cHWAy5Nk3IDyY5HJ35g_eqj3e4tO';

fetch(url)
  .then(res => res.json())
  .then(data => {
    const profiles = data.definitions.profiles;
    console.log("Profiles columns:", Object.keys(profiles.properties));
  })
  .catch(err => console.error(err));
