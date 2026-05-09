export const config = { runtime: 'edge' };

const KEYS = process.env.MISTRAL_KEYS?.split(',') || [];
let keyIndex = 0;
const getKey = () => { const k = KEYS[keyIndex % KEYS.length]; keyIndex++; return k; };

export default async function handler(req) {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const { prompt, mode, idea } = await req.json();
  if (!prompt && !idea) return new Response('Missing input', { status: 400 });

  const systemPrompt = mode === 'improve'
    ? 'Geef ALLEEN een verbeterd JSON object terug zonder markdown. Formaat: {"title":"...","summary":"...","tasks":["...","...","...","...","..."],"tags":["...","..."]}'
    : 'Geef ALLEEN een JSON object terug zonder markdown. Formaat: {"title":"...","summary":"...","tasks":["...","...","..."],"tags":["...","..."]}';

  const userPrompt = mode === 'improve'
    ? `Verbeter en verdiep dit idee: ${JSON.stringify(idea)}`
    : `Genereer een gestructureerd idee voor: ${prompt}`;

  const r = await fetch('https://api.mistral.ai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${getKey()}` },
    body: JSON.stringify({ model: 'mistral-small-latest', messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt }
    ]})
  });

  const data = await r.json();
  if (!r.ok) return new Response(JSON.stringify({ error: data.message }), { status: r.status });

  return new Response(data.choices[0].message.content, {
    headers: { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }
  });
}
