#!/usr/bin/env node
const key = process.env.GOOGLE_GEMINI_API_KEY;
const body = {contents: [{parts: [{text: 'Say OK'}]}]};

const models = [
  'gemini-flash-latest',
  'gemini-2.5-flash-lite', 
  'gemini-2.0-flash',
  'gemini-2.0-flash-lite',
  'gemini-3-flash',
  'gemini-3.1-flash-lite',
];

async function test(model) {
  const r = await fetch('https://generativelanguage.googleapis.com/v1beta/models/'+model+':generateContent', {
    method: 'POST',
    headers: {'Content-Type': 'application/json', 'X-goog-api-key': key},
    body: JSON.stringify(body)
  });
  const t = await r.text();
  const limitMatch = t.match(/limit:\s*(\d+)/);
  const limit = limitMatch ? limitMatch[1] : (r.ok ? 'OK' : 'N/A');
  const msgMatch = t.match(/"message":"([^"]+)"/);
  const msg = msgMatch ? msgMatch[1].substring(0,60) : '';
  console.log(model + ': HTTP ' + r.status + ' limit=' + limit + ' ' + msg);
}

(async () => {
  for (const m of models) await test(m);
})();
