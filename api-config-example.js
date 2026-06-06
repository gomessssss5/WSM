// /api/config.js
// Exemplo de endpoint Vercel (Node.js) para servir a chave OPENROUTER_API_KEY de forma segura

export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      error: 'Method not allowed. Use GET.'
    });
  }

  const openRouterApiKey = process.env.OPENROUTER_API_KEY || '';
  const openRouterApiKey2 = process.env.OPENROUTER_API_KEY_2 || '';

  if (!openRouterApiKey) {
    return res.status(400).json({
      error: 'OPENROUTER_API_KEY não configurada nas Environment Variables da Vercel'
    });
  }

  res.status(200).json({
    openRouterApiKey: openRouterApiKey,
    openRouterApiKey2: openRouterApiKey2 || null,
    provider: 'vercel_env',
    timestamp: new Date().toISOString()
  });
}

/*
CONFIGURAÇÃO NA VERCEL:

1. Crie este arquivo em: /api/config.js
2. Vá para Vercel Dashboard → Seu Projeto → Settings → Environment Variables
3. Adicione uma ou duas variáveis (a 2ª é fallback automático em caso de 429/erro):
   - Name: OPENROUTER_API_KEY
     Value: sk-or-v1-sua_chave_real_aqui
   - Name: OPENROUTER_API_KEY_2   (opcional, usada como fallback)
     Value: sk-or-v1-sua_outra_chave
4. Deploy: `vercel deploy --prod`
5. Teste: https://seu-projeto.vercel.app/api/config
*/
