export default function handler(req, res) {
  // Permitir requisições de qualquer origem (CORS)
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const keys = [
    process.env.GROQ_API_KEY,
    process.env.GROQ_API_KEY_2,
    process.env.GROQ_API_KEY_3
  ].filter(Boolean);

  if (keys.length === 0) {
    console.error('❌ Nenhuma GROQ_API_KEY configurada na Vercel!');
    return res.status(400).json({ 
      error: 'Nenhuma GROQ_API_KEY configurada nas Environment Variables da Vercel',
      hint: 'Configure em: Vercel Dashboard → Project Settings → Environment Variables'
    });
  }

  console.log(`✅ ${keys.length} GROQ_API_KEY(s) carregadas com sucesso`);
  return res.status(200).json({
    groqApiKeys: keys,
    groqApiKey: keys[0],
    openRouterApiKey: process.env.OPENROUTER_API_KEY || null,
    message: 'Chaves carregadas da Vercel com sucesso'
  });
}
