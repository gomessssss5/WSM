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
  const openRouterKey2 = process.env.OPENROUTER_API_KEY_2;

  if (!openRouterKey) {
    console.error('❌ Nenhuma OPENROUTER_API_KEY configurada na Vercel!');
    return res.status(400).json({
      error: 'Nenhuma OPENROUTER_API_KEY configurada nas Environment Variables da Vercel',
      hint: 'Configure em: Vercel Dashboard → Project Settings → Environment Variables'
    });
  }

  console.log(`✅ OPENROUTER_API_KEY carregada${openRouterKey2 ? ' + chave 2 de fallback' : ' (sem fallback)'}`);
  return res.status(200).json({
    openRouterApiKey: openRouterKey,
    openRouterApiKey2: openRouterKey2 || null,
    message: 'Chaves carregadas da Vercel com sucesso'
  });
}
