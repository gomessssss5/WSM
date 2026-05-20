export default async function handler(req, res) {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { searchQuery } = req.body;

  if (!searchQuery) {
    return res.status(400).json({ error: 'searchQuery é obrigatório' });
  }

  const tavilyApiKey = process.env.TAVILY_API_KEY;

  if (!tavilyApiKey) {
    console.error('❌ TAVILY_API_KEY não configurada na Vercel!');
    return res.status(400).json({ 
      error: 'TAVILY_API_KEY não configurada nas Environment Variables',
      hint: 'Configure em: Vercel Dashboard → Project Settings → Environment Variables'
    });
  }

  try {
    console.log(`🔍 Buscando: "${searchQuery}"`);
    
    const tavilyResponse = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        api_key: tavilyApiKey,
        query: searchQuery,
        max_results: 5,
        include_answer: true,
        include_images: false
      })
    });

    if (!tavilyResponse.ok) {
      const errorData = await tavilyResponse.json();
      console.error('❌ Erro Tavily:', errorData);
      return res.status(400).json({ 
        error: 'Erro ao chamar Tavily API',
        details: errorData
      });
    }

    const tavilyData = await tavilyResponse.json();
    console.log(`✅ Tavily retornou ${tavilyData.results.length} resultados`);

    return res.status(200).json({
      results: tavilyData.results,
      answer: tavilyData.answer,
      message: 'Busca realizada com sucesso'
    });

  } catch (error) {
    console.error('❌ Erro no handler:', error);
    return res.status(500).json({ 
      error: 'Erro interno ao processar busca',
      message: error.message
    });
  }
}
