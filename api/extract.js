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

  const { url } = req.body;

  if (!url) {
    return res.status(400).json({ error: 'url é obrigatório' });
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
    console.log(`📖 Extraindo conteúdo de: "${url}"`);
    
    const tavilyResponse = await fetch('https://api.tavily.com/extract', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        api_key: tavilyApiKey,
        urls: [url],
        extract_depth: 'basic'
      })
    });

    if (!tavilyResponse.ok) {
      const errorData = await tavilyResponse.json();
      console.error('❌ Erro Tavily Extract:', errorData);
      return res.status(400).json({ 
        error: 'Erro ao chamar Tavily Extract API',
        details: errorData
      });
    }

    const tavilyData = await tavilyResponse.json();
    console.log(`✅ Tavily extraiu conteúdo com sucesso de ${url}`);

    // Retorna os resultados brutos da extração
    return res.status(200).json({
      results: tavilyData.results || [],
      failed_results: tavilyData.failed_results || [],
      message: 'Extração realizada com sucesso'
    });

  } catch (error) {
    console.error('❌ Erro no handler de extração:', error);
    return res.status(500).json({ 
      error: 'Erro interno ao processar extração',
      message: error.message
    });
  }
}
