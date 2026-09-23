const fs = require('fs');
fetch('https://api.groq.com/openai/v1/models', {
  headers: {
    'Authorization': 'Bearer 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'
  }
})
.then(res => res.json())
.then(data => {
  if (data.data) {
    console.log(data.data.map(m => m.id).join('\n'));
  } else {
    console.log('Error:', data);
  }
})
.catch(console.error);
