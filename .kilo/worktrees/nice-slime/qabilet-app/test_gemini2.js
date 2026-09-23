const { GoogleGenerativeAI } = require('@google/generative-ai');
const genAI = new GoogleGenerativeAI('AQ.Ab8RN6Jv9AcERCpQ_egiz3MVyztqC823xPsQt94nP4wtb4hpBA');
async function test() {
  try {
    const models = fetch('https://generativelanguage.googleapis.com/v1beta/models?key=AQ.Ab8RN6Jv9AcERCpQ_egiz3MVyztqC823xPsQt94nP4wtb4hpBA')
      .then(res => res.json())
      .then(data => console.log(data.models.map(m => m.name).join('\n')));
  } catch(e) {}
}
test();
