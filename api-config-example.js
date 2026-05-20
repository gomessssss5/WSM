// /api/config.js
// Exemplo de endpoint Vercel (Node.js) para servir a chave GROQ_API_KEY de forma segura

export default function handler(req, res) {
  // Apenas permitir requisições GET
  if (req.method !== 'GET') {
    return res.status(405).json({ 
      error: 'Method not allowed. Use GET.' 
    });
  }

  // Obter chave da variável de ambiente
  const groqApiKey = process.env.GROQ_API_KEY || '';

  // Verificar se existe
  if (!groqApiKey) {
    return res.status(400).json({ 
      error: 'GROQ_API_KEY não configurada nas Environment Variables da Vercel' 
    });
  }

  // Retornar de forma segura
  res.status(200).json({
    groqApiKey: groqApiKey,
    provider: 'vercel_env',
    timestamp: new Date().toISOString()
  });
}

/*
CONFIGURAÇÃO NA VERCEL:

1. Crie este arquivo em: /api/config.js (ou onde seu projeto Vercel espera as funções)
2. Vá para Vercel Dashboard → Seu Projeto → Settings → Environment Variables
3. Adicione uma nova variável:
   - Name: GROQ_API_KEY
   - Value: gsk_sua_chave_real_aqui
4. Deploy: `vercel deploy --prod`
5. Teste: https://seu-projeto.vercel.app/api/config

O seu HTML fará fetch automaticamente quando precisar da chave!
*/
