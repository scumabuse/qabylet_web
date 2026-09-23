const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI('AQ.Ab8RN6Jv9AcERCpQ_egiz3MVyztqC823xPsQt94nP4wtb4hpBA');
async function test() {
  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent("hello");
    console.log(result.response.text());
  } catch(e) {
    console.error("Gemini error:", e.message);
  }
}
test();
