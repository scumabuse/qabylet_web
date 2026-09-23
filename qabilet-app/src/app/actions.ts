"use server";

import { createClient } from '@supabase/supabase-js';
import { GoogleGenerativeAI } from '@google/generative-ai';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://jtubizlrigutrhwcdmqd.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || 'sb_secret_cm8cHWAy5Nk3IDyY5HJ35g_eqj3e4tO';

const supabase = createClient(supabaseUrl.replace(/\/rest\/v1\/?$/, ''), supabaseKey);

export async function getCourses() {
  try {
    const { data, error } = await supabase.from('courses').select('*, lessons(*)');
    if (error) return { error: error.message };
    return { data };
  } catch (err: any) {
    return { error: err.message || "Unknown error" };
  }
}

export async function getLessons(courseId: string) {
  try {
    const { data, error } = await supabase
      .from('lessons')
      .select('*')
      .eq('course_id', courseId)
      .order('order_index');
    if (error) return { error: error.message };
    return { data };
  } catch (err: any) {
    return { error: err.message || "Unknown error" };
  }
}

export async function completeLesson(userId: string, lessonId: string, completed: boolean = true) {
  try {
    const { error } = await supabase
      .from('user_progress')
      .upsert({ 
        user_id: userId, 
        lesson_id: lessonId, 
        is_completed: completed,
        last_watched: new Date().toISOString()
      }, { onConflict: 'user_id,lesson_id' });
    if (error) return { error: error.message };
    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Unknown error" };
  }
}

export async function getUserProgress(userId: string) {
  try {
    const { data, error } = await supabase
      .from('user_progress')
      .select('lesson_id, is_completed')
      .eq('user_id', userId);
    if (error) return { error: error.message };
    return { data };
  } catch (err: any) {
    return { error: err.message || "Unknown error" };
  }
}

export async function checkLessonProgress(userId: string, lessonId: string) {
  try {
    const { data, error } = await supabase
      .from('user_progress')
      .select('*')
      .eq('user_id', userId)
      .eq('lesson_id', lessonId)
      .maybeSingle();
    if (error) return { error: error.message };
    return { data };
  } catch (err: any) {
    return { error: err.message || "Unknown error" };
  }
}

export async function getProfile(id: string) {
  try {
    const { data, error } = await supabase.from('profiles').select('*').eq('id', id).single();
    if (error) return { error: error.message };
    return { data };
  } catch (err: any) {
    return { error: err.message || "Unknown error" };
  }
}

export async function updateProfile(id: string, updates: any) {
  try {
    // Map our state to the actual Supabase DB columns
    const dbPayload: any = { id, updated_at: new Date().toISOString() };
    
    if (updates.high_contrast !== undefined) dbPayload.high_contrast = updates.high_contrast;
    if (updates.dyslexia_font !== undefined) dbPayload.dyslexic_font = updates.dyslexia_font;
    if (updates.large_font !== undefined) dbPayload.font_size = updates.large_font ? 'large' : 'normal';

    const { error } = await supabase.from('profiles').upsert(dbPayload);
    if (error) return { error: error.message };
    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Unknown error" };
  }
}

export async function logChatMessage(content: string, role: string, moduleType: string, userId?: string) {
  try {
    const { error } = await supabase.from('chat_history').insert({
      content,
      role,
      module_type: moduleType,
      user_id: userId
    });
    if (error) return { error: error.message };
    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Unknown error" };
  }
}

export async function getChatHistory(userId: string) {
  try {
    const { data, error } = await supabase
      .from('chat_history')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: true });
    if (error) return { error: error.message };
    return { data };
  } catch (err: any) {
    return { error: err.message || "Unknown error" };
  }
}

export async function getAIActivityCount(userId: string) {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const { count, error } = await supabase
      .from('chat_history')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('created_at', today.toISOString());
      
    if (error) return { error: error.message };
    return { count: count || 0 };
  } catch (err: any) {
    return { error: err.message || "Unknown error" };
  }
}

export async function getLastStudiedLesson(userId: string) {
  try {
    const { data, error } = await supabase
      .from('user_progress')
      .select('lesson_id, lessons(title, course_id)')
      .eq('user_id', userId)
      .eq('is_completed', true)
      .order('last_watched', { ascending: false })
      .limit(1)
      .single();
      
    if (error && error.message?.includes('JSON object')) return { data: null }; // No data found
    if (error) return { error: error.message };
    return { data };
  } catch (err: any) {
    return { error: err.message || "Unknown error" };
  }
}
export async function getGesturesLibrary() {
  try {
    const { data, error } = await supabase.from('gestures_library').select('*');
    if (error) return { error: error.message };
    return { data };
  } catch (err: any) {
    return { error: err.message || "Unknown error" };
  }
}

export async function seedGestures() {
  const apiKey = process.env.GEMINI_KEY || process.env.GEMINI_API_KEY;
  if (!apiKey) return { error: "GEMINI_KEY is not defined in environment variables" };
  
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  const coreWords = [
    { ru: "Привет", kk: "Сәлем", cat: "Базовые фразы" },
    { ru: "Спасибо", kk: "Рақмет", cat: "Базовые фразы" },
    { ru: "Помощь", kk: "Көмек", cat: "Базовые фразы" },
    { ru: "Мама", kk: "Ана", cat: "Семья" },
    { ru: "Папа", kk: "Әке", cat: "Семья" },
    { ru: "Я тебя люблю", kk: "Мен се canі жақсы көремін", cat: "Эмоции" },
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

  const entries: any[] = [];

  // Process core words
  for (const item of coreWords) {
    // RU version
    entries.push({
      word: item.ru.toLowerCase(),
      category: item.cat,
      video_url: `https://qabilet-storage.s3.amazonaws.com/gestures/ru/${item.ru.toLowerCase()}.mp4`,
    });
    // KK version
    entries.push({
      word: item.kk.toLowerCase(),
      category: item.cat,
      video_url: `https://qabilet-storage.s3.amazonaws.com/gestures/kk/${item.kk.toLowerCase()}.mp4`,
    });
  }

  // Process Kazakh Dactyl
  for (const item of kazakhDactyl) {
    entries.push({
      word: item.letter,
      category: 'Алфавит',
      video_url: `https://qabilet-storage.s3.amazonaws.com/gestures/kk/dactyl/${item.slug}.mp4`,
    });
  }

  try {
    const { error } = await supabase.from('gestures_library').upsert(entries, { onConflict: 'word' });
    if (error) throw error;
    return { success: true, count: entries.length };
  } catch (err: any) {
    console.error("Seeding error:", err);
    return { error: err.message };
  }
}

export async function saveGesturePattern(word: string, pattern: any) {
  try {
    console.log("Attempting to save gesture:", word);
    
    // Normalize pattern - ensure it's a clean array of coordinates
    const cleanPattern = Array.isArray(pattern) ? pattern.map(p => ({
      x: p.x,
      y: p.y,
      z: p.z || 0
    })) : pattern;

    const { data, error } = await supabase
      .from('gestures_library')
      .upsert({ 
        word: word.toLowerCase(), 
        pattern_json: JSON.stringify(cleanPattern),
        category: 'Пользовательские'
      }, { onConflict: 'word' })
      .select();

    if (error) {
      console.error("Supabase Save Error:", error);
      return { error: error.message };
    }
    
    console.log("Gesture saved successfully:", data);
    return { success: true };
  } catch (err: any) {
    console.error("Critical Save Error:", err);
    return { error: err.message || "Unknown error" };
  }
}

export async function publishUserCourse(title: string, description: string, targetAudience: string, videoUrl: string, userId: string) {
  try {
    const category = `Авторский: ${targetAudience} #creator:${userId}`;
    // Create course
    const { data: courseData, error: courseError } = await supabase
      .from('courses')
      .insert({
        title,
        description,
        category,
        image_url: null
      })
      .select()
      .single();

    if (courseError) throw courseError;

    // Create lesson
    const { error: lessonError } = await supabase
      .from('lessons')
      .insert({
        course_id: courseData.id,
        title: 'Урок 1: Видеоматериал',
        content: description,
        video_url: videoUrl,
        order_index: 1
      });

    if (lessonError) throw lessonError;

    return { success: true, course: courseData };
  } catch (err: any) {
    console.error("publishUserCourse error:", err);
    return { error: err.message || "Unknown error" };
  }
}

export async function getCommunityCourses() {
  try {
    const { data, error } = await supabase
      .from('courses')
      .select('*, lessons(id, video_url)')
      .ilike('category', 'Авторский:%')
      .order('created_at', { ascending: false });
      
    if (error) return { error: error.message };
    return { data };
  } catch (err: any) {
    return { error: err.message || "Unknown error" };
  }
}

export async function uploadCourseVideo(formData: FormData) {
  try {
    const file = formData.get('file') as File;
    if (!file) return { error: "No file provided" };

    const fileExt = file.name.split('.').pop() || 'mp4';
    const fileName = `${Math.random().toString(36).substring(2, 15)}_${Date.now()}.${fileExt}`;
    const filePath = `user_courses/${fileName}`;

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const { error: uploadError } = await supabase.storage
      .from('user_courses')
      .upload(filePath, buffer, {
        contentType: file.type,
      });

    if (uploadError) throw uploadError;

    const { data: publicUrlData } = supabase.storage
      .from('user_courses')
      .getPublicUrl(filePath);

    return { success: true, url: publicUrlData.publicUrl };
  } catch (err: any) {
    console.error("uploadCourseVideo error:", err);
    return { error: err.message || "Unknown error" };
  }
}

export async function deleteCourse(courseId: string, userId: string) {
  try {
    const { data: course, error: fetchError } = await supabase
      .from('courses')
      .select('category')
      .eq('id', courseId)
      .single();

    if (fetchError) throw fetchError;
    if (!course.category?.includes(`#creator:${userId}`)) {
      throw new Error("You are not the creator of this course");
    }

    // Delete lessons first
    await supabase.from('lessons').delete().eq('course_id', courseId);

    const { error: deleteError } = await supabase
      .from('courses')
      .delete()
      .eq('id', courseId);

    if (deleteError) throw deleteError;
    return { success: true };
  } catch (err: any) {
    console.error("deleteCourse error:", err);
    return { error: err.message || "Unknown error" };
  }
}

export async function removeLessonProgress(userId: string, lessonId: string) {
  try {
    const { error } = await supabase
      .from('user_progress')
      .delete()
      .eq('user_id', userId)
      .eq('lesson_id', lessonId);
    if (error) return { error: error.message };
    return { success: true };
  } catch (err: any) {
    return { error: err.message || "Unknown error" };
  }
}
