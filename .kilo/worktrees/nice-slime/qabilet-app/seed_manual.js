const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://jtubizlrigutrhwcdmqd.supabase.co';
const supabaseKey = 'sb_secret_cm8cHWAy5Nk3IDyY5HJ35g_eqj3e4tO';
const supabase = createClient(supabaseUrl, supabaseKey);

async function seed() {
  const coreWords = [
    { ru: "Привет", kk: "Сәлем", cat: "Базовые фразы" },
    { ru: "Спасибо", kk: "Рақмет", cat: "Базовые фразы" },
    { ru: "Помощь", kk: "Көмек", cat: "Базовые фразы" },
    { ru: "Мама", kk: "Ана", cat: "Семья" },
    { ru: "Папа", kk: "Әке", cat: "Семья" },
    { ru: "Я тебя люблю", kk: "Мен сені жақсы көремін", cat: "Эмоции" },
    { ru: "Вода", kk: "Су", cat: "Еда и напитки" },
    { ru: "Еда", kk: "Тамақ", cat: "Еда и напитки" },
    { ru: "Да", kk: "Иә", cat: "Базовые фразы" },
    { ru: "Нет", kk: "Жоқ", cat: "Базовые фразы" },
  ];

  const kazakhDactyl = [
    { letter: "Ә", slug: "ae" }, { letter: "Ғ", slug: "gh" }, 
    { letter: "Қ", slug: "q" }, { letter: "Ң", slug: "ng" }, 
    { letter: "Ө", slug: "oe" }, { letter: "Ұ", slug: "u_short" }, 
    { letter: "Ү", slug: "u_long" }, { letter: "Һ", slug: "h" }, { letter: "І", slug: "i_short" }
  ];

  const entries = [];

  for (const item of coreWords) {
    entries.push({
      word: item.ru.toLowerCase(),
      language: 'ru',
      category: item.cat,
      video_url: `https://qabilet-storage.s3.amazonaws.com/gestures/ru/${encodeURIComponent(item.ru.toLowerCase())}.mp4`,
    });
    entries.push({
      word: item.kk.toLowerCase(),
      language: 'kk',
      category: item.cat,
      video_url: `https://qabilet-storage.s3.amazonaws.com/gestures/kk/${encodeURIComponent(item.kk.toLowerCase())}.mp4`,
    });
  }

  for (const item of kazakhDactyl) {
    entries.push({
      word: item.letter,
      language: 'kk',
      category: 'Алфавит',
      video_url: `https://qabilet-storage.s3.amazonaws.com/gestures/kk/dactyl/${item.slug}.mp4`,
    });
  }

  console.log(`Prepared ${entries.length} entries. Inserting to Supabase...`);
  
  const { data, error } = await supabase.from('gestures_library').upsert(entries, { onConflict: 'word,language' });
  
  if (error) {
    console.error("Error seeding database:", error);
  } else {
    console.log("Database seeded successfully!");
  }
}

seed();
