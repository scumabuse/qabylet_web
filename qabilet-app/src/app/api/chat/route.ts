import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

const apiKey = process.env.GEMINI_KEY || process.env.GEMINI_API_KEY;
if (!apiKey) {
  console.error("CRITICAL: GEMINI_KEY or GEMINI_API_KEY is not defined in environment variables.");
}
const genAI = new GoogleGenerativeAI(apiKey || '');

const groqApiKey = process.env.GROQ_API_KEY || process.env.GROC_API_KEY;

const SYSTEM_PROMPT = `Ты — инклюзивный голосовой помощник платформы Qabilet. 
ВАЖНО: Твои ответы будут озвучиваться голосом. 
1. НЕ используй символы разметки (звездочки, решетки, тире в начале строк). 
2. Пиши только чистым текстом, полными предложениями. 
3. НЕ используй смайлики и эмодзи. 
4. Твой стиль: дружелюбный, простой и понятный. 
5. Ограничивай длину ответа (не более 3-4 предложений), чтобы пользователю было комфортно слушать.`;

async function callGroqFallback(message: string, history: any[]) {
  if (!groqApiKey) {
    throw new Error("GROQ_API_KEY is not defined for fallback");
  }

  const messages = [
    { role: "system", content: "Системная инструкция (обязательна к исполнению во всех ответах): " + SYSTEM_PROMPT },
    { role: "assistant", content: "Понял. Я буду следовать этой инструкции и помогать пользователям Qabilet как инклюзивный помощник." }
  ];

  if (history && history.length > 0) {
    history.forEach((msg: any) => {
      messages.push({
        role: msg.isUser ? "user" : "assistant",
        content: msg.text
      });
    });
  }

  messages.push({ role: "user", content: message });

  const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${groqApiKey}`
    },
    body: JSON.stringify({
      model: "openai/gpt-oss-20b",
      messages: messages,
      temperature: 0.7,
      max_tokens: 500,
    })
  });

  if (!response.ok) {
    const errorData = await response.text();
    throw new Error(`Groq API Error: ${response.status} ${errorData}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

export async function POST(req: NextRequest) {
  try {
    const { message, history } = await req.json();

    try {
      const model = genAI.getGenerativeModel({ model: "gemini-3.8-flash" });

      // Format history for Gemini
      const formattedHistory = history?.map((msg: any) => ({
        role: msg.isUser ? "user" : "model",
        parts: [{ text: msg.text }],
      })) || [];

      const chat = model.startChat({
        history: [
          { role: "user", parts: [{ text: "Системная инструкция (обязательна к исполнению во всех ответах): " + SYSTEM_PROMPT }] },
          { role: "model", parts: [{ text: "Понял. Я буду следовать этой инструкции и помогать пользователям Qabilet как инклюзивный помощник." }] },
          ...formattedHistory
        ],
      });

      const result = await chat.sendMessage(message);
      const responseText = result.response.text();

      return NextResponse.json({ text: responseText });
    } catch (geminiError: any) {
      console.error("Gemini API Error, falling back to Groq:", geminiError);
      
      const groqResponseText = await callGroqFallback(message, history);
      return NextResponse.json({ text: groqResponseText });
    }
  } catch (error: any) {
    console.error("API Error (Both Gemini and Groq failed):", error);
    return NextResponse.json({ error: "Failed to generate response: " + error.message }, { status: 500 });
  }
}
