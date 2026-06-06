export default function handler(req, res) {
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

  const openRouterKey = process.env.OPENROUTER_API_KEY;

  if (!openRouterKey) {
    console.error('❌ Nenhuma OPENROUTER_API_KEY configurada na Vercel!');
    return res.status(400).json({
      error: 'Nenhuma OPENROUTER_API_KEY configurada nas Environment Variables da Vercel',
      hint: 'Configure em: Vercel Dashboard → Project Settings → Environment Variables'
    });
  }

  console.log('✅ OPENROUTER_API_KEY carregada com sucesso');
  return res.status(200).json({
    openRouterApiKey: openRouterKey,
    message: 'Chave carregada da Vercel com sucesso'
  });
}
