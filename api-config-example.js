// /api/config.js
// Exemplo de endpoint Vercel (Node.js) para servir as chaves de API de forma segura

export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({
      error: 'Method not allowed. Use GET.'
    });
  }

  const openRouterApiKey = process.env.OPENROUTER_API_KEY || '';
  const groqApiKey = process.env.GROQ_API_KEY || '';

  if (!openRouterApiKey) {
    return res.status(400).json({
      error: 'OPENROUTER_API_KEY não configurada nas Environment Variables da Vercel'
    });
  }

  res.status(200).json({
    openRouterApiKey: openRouterApiKey,
    groqApiKey: groqApiKey || null,
    provider: 'vercel_env',
    timestamp: new Date().toISOString()
  });
}

/*
CONFIGURAÇÃO NA VERCEL:

1. Crie este arquivo em: /api/config.js
2. Vá para Vercel Dashboard → Seu Projeto → Settings → Environment Variables
3. Adicione duas variáveis:
   - Name: OPENROUTER_API_KEY
     Value: sk-or-v1-sua_chave_real_aqui
   - Name: GROQ_API_KEY
     Value: gsk_sua_chave_groq_aqui   (usada para análise de imagens via llama-4-scout)
4. Deploy: `vercel deploy --prod`
5. Teste: https://seu-projeto.vercel.app/api/config
*/
