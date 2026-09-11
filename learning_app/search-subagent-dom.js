const fs = require('fs');
const path = require('path');

const logPath = 'C:\\Users\\vivek\\.gemini\\antigravity-ide\\brain\\84d67f71-53ed-4c38-8b4d-33856c5932a6\\.system_generated\\logs\\transcript.jsonl';
const content = fs.readFileSync(logPath, 'utf8');
const lines = content.split('\n');

for (let idx = 0; idx < lines.length; idx++) {
  const line = lines[idx];
  if (line.includes('Which IDE') || line.includes('Knowledge Check')) {
    console.log('--- Match at Line', idx + 1, '---');
    console.log(line.substring(0, 1000));
  }
}
