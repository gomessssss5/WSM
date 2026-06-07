export default async function handler(req, res) {
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

  const { query } = req.body;

  if (!query) {
    return res.status(400).json({ error: 'query é obrigatório' });
  }

  const apiKey = process.env.UNSPLASH_API_KEY;

  if (!apiKey) {
    console.error('❌ UNSPLASH_API_KEY não configurada na Vercel!');
    return res.status(400).json({
      error: 'UNSPLASH_API_KEY não configurada nas Environment Variables',
      hint: 'Configure em: Vercel Dashboard → Project Settings → Environment Variables'
    });
  }

  try {
    console.log(`🖼️ Buscando imagens Unsplash: "${query}"`);

    const unsplashResponse = await fetch(
      `https://api.unsplash.com/search/photos?query=${encodeURIComponent(query)}&per_page=3&orientation=landscape`,
      {
        headers: {
          'Authorization': `Client-ID ${apiKey}`
        }
      }
    );

    if (!unsplashResponse.ok) {
      const errorData = await unsplashResponse.json().catch(() => ({}));
      console.error('❌ Erro Unsplash:', unsplashResponse.status, errorData);
      return res.status(400).json({
        error: 'Erro ao chamar Unsplash API',
        status: unsplashResponse.status,
        details: errorData
      });
    }

    const data = await unsplashResponse.json();
    console.log(`✅ Unsplash retornou ${data.results.length} imagens`);

    const images = data.results.map(photo => ({
      url: photo.urls.regular,
      alt: photo.alt_description || query,
      photographer: photo.user.name,
      photographerUrl: photo.user.links.html
    }));

    return res.status(200).json({
      images,
      message: 'Imagens buscadas com sucesso'
    });

  } catch (error) {
    console.error('❌ Erro no handler Unsplash:', error);
    return res.status(500).json({
      error: 'Erro interno ao buscar imagens',
      message: error.message
    });
  }
}
