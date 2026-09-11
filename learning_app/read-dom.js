const fs = require('fs');
const path = require('path');

const logPath = 'C:\\Users\\vivek\\.gemini\\antigravity-ide\\brain\\84d67f71-53ed-4c38-8b4d-33856c5932a6\\.system_generated\\logs\\transcript.jsonl';
const content = fs.readFileSync(logPath, 'utf8');
const lines = content.split('\n');

for (const line of lines) {
  if (!line) continue;
  try {
    const data = JSON.parse(line);
    if (data.step_index === 78 && data.content) {
      console.log('--- Step 78 DOM ---');
      console.log(data.content.substring(0, 5000));
    }
    if (data.step_index === 44 && data.content) {
      console.log('--- Step 44 DOM ---');
      console.log(data.content.substring(0, 5000));
    }
  } catch (e) {
  }
}
