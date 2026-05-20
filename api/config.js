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

  const groqApiKey = process.env.GROQ_API_KEY;

  if (!groqApiKey) {
    console.error('❌ GROQ_API_KEY não configurada na Vercel!');
    return res.status(400).json({ 
      error: 'GROQ_API_KEY não configurada nas Environment Variables da Vercel',
      hint: 'Configure em: Vercel Dashboard → Project Settings → Environment Variables'
    });
  }

  console.log('✅ GROQ_API_KEY lida com sucesso da Vercel');
  return res.status(200).json({
    groqApiKey: groqApiKey,
    message: 'Chave carregada da Vercel com sucesso'
  });
}
