/* ==========================================================================
   WSM AI — agents.js
   Toda a lógica dos agentes (Mapas, Leitor de Web, Apresentação, Deep Research)
   e helpers relacionados. Carregado após o index.html.
   ========================================================================== */

  // ========== HELPERS DE PASSOS / ANIMAÇÃO ==========

  function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

  function setStepActive(num, agentId) {
    const step = document.getElementById(`step${num}_${agentId}`);
    if (step) step.className = "step active";
  }

  // Customizada para poder receber cor diferente (usada no mapa verde)
  function setStepCompleted(num, agentId, customColor = null) {
    const step = document.getElementById(`step${num}_${agentId}`);
    const icon = document.getElementById(`icon${num}_${agentId}`);
    if (step) step.className = "step completed";
    if (icon) {
        icon.innerHTML = '<i class="ti ti-check"></i>';
        if(customColor) {
            icon.style.backgroundColor = customColor + '1A';
            icon.style.color = customColor;
        }
    }
  }

  function toggleAgentThoughtBox(agentId, boxType = 'thoughtBox') {
    const boxId = `${boxType}_${agentId}`;
    const box = document.getElementById(boxId);
    if (box) {
        box.classList.toggle('collapsed');
        setTimeout(scrollToBottom, 450);
    }
  }

  // ========== ARTEFATOS / PAINEL LATERAL ==========

  // NOVA FUNÇÃO: Abrir o Painel Lateral no modo MAPA
  function openMapArtifact(places, searchKeywords) {
    const mainContent = document.getElementById('mainContent');
    const codePre = document.getElementById('artifactCodePre');
    const titleElement = document.getElementById('artifactTitle');
    const mapContainer = document.getElementById('mapContainer');
    const copyBtn = document.getElementById('copyArtifactBtn');

    // Ocultar código, exibir mapa
    if(codePre) codePre.style.display = 'none';
    if(copyBtn) copyBtn.style.display = 'none';
    if(mapContainer) mapContainer.style.display = 'block';

    titleElement.innerHTML = `<i class="ti ti-map-2" style="color:var(--agent-green)"></i><span>Mapa Interativo</span>`;
    mainContent.classList.add('artifact-open');
    mainContent.classList.add('artifact-map');

    // Se o mapa já existe, remove pra recriar sem bugar as tiles
    if (leafletMap !== null) {
        leafletMap.remove();
    }

    // Inicializa o mapa com um estado neutro imediatamente
    leafletMap = L.map('mapContainer').setView([0, 0], 2);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
    }).addTo(leafletMap);

    const bounds = [];
    // Se encontrou lugares, plotar marcadores
    if (places && places.length > 0) {
        places.forEach(place => {
            const lat = parseFloat(place.lat);
            const lon = parseFloat(place.lon);
            const marker = L.marker([lat, lon]).addTo(leafletMap);
            let name = place.name || '';
            if (!name) name = place.display_name.split(',')[0];
            marker.bindPopup(`<div style="font-family:'Inter', sans-serif"><b>${escapeHtml(name)}</b><br><span style="font-size:11px; color:#666;">${escapeHtml(place.display_name)}</span></div>`);
            bounds.push([lat, lon]);
        });
    }

    // AGUARDA A ANIMAÇÃO TERMINAR: Só centraliza o mapa quando o container tiver tamanho real
    setTimeout(() => {
        if(leafletMap) {
            leafletMap.invalidateSize(true);
            if (bounds.length > 0) {
                leafletMap.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
            } else {
                // Fallback Brasil
                leafletMap.setView([-14.235, -51.925], 4);
            }
        }
    }, 500);
  }

  function closeArtifact() {
    const mainContent = document.getElementById('mainContent');
    if (mainContent) {
        mainContent.classList.remove('artifact-open');
        mainContent.classList.remove('artifact-map');
    }
  }

  function copyArtifact() {
    const code = document.getElementById('artifactCodeContent').textContent;
    navigator.clipboard.writeText(code).then(() => {
        showToast("Código copiado!", "info");
    });
  }

  // ========== PAINEL DE FONTES (DEEP RESEARCH) ==========

  function openSourcesSidebar(agentId, results = []) {
    const sidebar = document.getElementById('sourcesSidebar');
    const body = document.getElementById('sourcesSidebarBody');
    if (!sidebar || !body) return;

    body.innerHTML = '';
    results.forEach((r, i) => {
      const item = document.createElement('div');
      item.className = 'sources-list-item';
      const domain = (() => { try { return new URL(r.url).hostname.replace('www.', ''); } catch(e){ return r.url; }})();
      const today = new Date().toLocaleDateString('pt-BR');

      item.innerHTML = `
        <div class="meta" style="font-size: 10px; color: #888;">[${i+1}] ${domain}</div>
        <div class="title" style="font-weight: 600; margin-bottom: 5px;">${escapeHtml(r.title || domain)}</div>
        <div class="abnt-citation" style="font-size: 12px; margin-bottom: 10px; font-family: monospace;">
          ${escapeHtml(r.title)}. Disponível em: <a href="${r.url}" target="_blank" rel="noopener noreferrer">${escapeHtml(r.url)}</a>. Acesso em: ${today}.
        </div>
      `;
      body.appendChild(item);
    });

    sidebar.setAttribute('aria-hidden', 'false');
    document.body.classList.add('sources-sidebar-open');

    const closeBtn = document.getElementById('sourcesCloseBtn');
    if (closeBtn) closeBtn.onclick = () => closeSourcesSidebar();

    setTimeout(() => { document.addEventListener('click', outsideClickHandler); }, 60);

    function outsideClickHandler(e) {
      const s = document.getElementById('sourcesSidebar');
      const clickedPill = e.target.closest && e.target.closest('.sources-pill');
      if (s && !s.contains(e.target) && !clickedPill) { closeSourcesSidebar(); }
    }

    function closeSourcesSidebar() {
      const s = document.getElementById('sourcesSidebar');
      if (s) s.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('sources-sidebar-open');
      document.removeEventListener('click', outsideClickHandler);
    }
  }

  window.openSourcesSidebarFromText = function(index) {
    const pill = document.querySelector('.sources-pill');
    if (pill) pill.click();
  };

  // ========== SEQUÊNCIA DE BUSCAS WEB (TOKEN {web: t1, t2}) ==========

  // Usado quando o modelo emite {web: "t1", "t2", ...} com vários termos.
  async function executeWebSearchSequence(queries, attachments = []) {
    for (let i = 0; i < queries.length; i++) {
      const q = queries[i];
      console.log(`[WebSequence] ${i + 1}/${queries.length}: ${q}`);
      await executeDeepResearch(q, attachments);
      if (i < queries.length - 1) {
        await new Promise(r => setTimeout(r, 5000));
      }
    }
  }

  // ========== AGENTE DE IA EM LOOP: DEEP RESEARCH ==========
  async function executeDeepResearch(userPrompt, attachedFilesData = [], autoSearchQuery = null) {

    activeAgentsCount++;
    const currentAgentId = activeAgentsCount;
    const messagesEl = document.getElementById('messages');
    if (!messagesEl) return;

    if (!currentSessionId) {
      currentSessionId = Date.now().toString();
      sessions.unshift({
        id: currentSessionId,
        title: userPrompt ? userPrompt.substring(0, 30) + "..." : "Deep Research",
        messages: []
      });
    }
    const currentSession = sessions.find(s => s.id === currentSessionId);

    const agentContainer = document.createElement('div');
    let imageAnalysisText = '';
    agentContainer.className = 'agent-response-container';
    agentContainer.innerHTML = `
      <div class="agent-pill">
        <i class="ti ti-world-search"></i>
        Agente Deep Research ativo
      </div>

      <div class="thought-box" id="thoughtBox_${currentAgentId}">
        <div class="thought-header" onclick="toggleAgentThoughtBox(${currentAgentId})">
          <div class="thought-status">
            <div class="spinner" id="mainSpinner_${currentAgentId}"></div>
            <i class="ti ti-circle-check-filled success-icon" id="mainCheck_${currentAgentId}"></i>
            <span class="thought-title" id="mainTitle_${currentAgentId}">Planejando pesquisa autônoma...</span>
          </div>
          <span class="thought-duration" id="timer_${currentAgentId}">0.0s</span>
          <i class="ti ti-chevron-down thought-toggle"></i>
        </div>

        <div class="thought-content">
          <div class="step" id="step1_${currentAgentId}">
            <div class="step-icon" id="icon1_${currentAgentId}">1</div>
            <div class="step-text">Mapeando plano de investigação...</div>
          </div>
          <div class="step" id="step2_${currentAgentId}">
            <div class="step-icon" id="icon2_${currentAgentId}">2</div>
            <div class="step-text">Vasculhando a web em busca de evidências...</div>
          </div>
          <div class="step" id="step3_${currentAgentId}">
            <div class="step-icon" id="icon3_${currentAgentId}">3</div>
            <div class="step-text">Validando consistência das fontes encontradas...</div>
          </div>
          <div class="step" id="step4_${currentAgentId}">
            <div class="step-icon" id="icon4_${currentAgentId}">4</div>
            <div class="step-text">Redigindo síntese factual final...</div>
          </div>
        </div>
      </div>

      <div id="tavilyImages_${currentAgentId}" class="tavily-images" style="margin-top:12px; display:none;"></div>

      <div class="output-card" id="outputCard_${currentAgentId}">
        <p id="outputContent_${currentAgentId}"></p>
        <div id="researchFollowups_${currentAgentId}" class="followups"></div>
      </div>

      <div class="sources-footer" id="sourcesFooter_${currentAgentId}" style="margin-top: 14px; display:none;"></div>
    `;

    messagesEl.appendChild(agentContainer);
    scrollToBottom();

    let startTime = Date.now();
    let timerInterval = setInterval(() => {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      const timerEl = document.getElementById(`timer_${currentAgentId}`);
      if (timerEl) timerEl.textContent = `${elapsed}s`;
    }, 100);

    try {
      // ETAPA 1
      setStepActive(1, currentAgentId);
      let openRouterApiKey = localStorage.getItem('OPENROUTER_API_KEY');
      if (!openRouterApiKey) {
        const configResponse = await fetch('/api/config');
        if (configResponse.ok) {
          const configData = await configResponse.json();
          openRouterApiKey = configData.openRouterApiKey;
        }
      }
      if (!openRouterApiKey) throw new Error('OPENROUTER_API_KEY não encontrada');

      let searchKeywords = autoSearchQuery;

      if (!searchKeywords) {
        const planResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${openRouterApiKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': window.location.origin,
            'X-Title': 'WSM AI'
          },
          body: JSON.stringify({
            model: 'nvidia/nemotron-3-super-120b-a12b:free',
            messages: [
              { role: 'system', content: 'Analise o prompt e retorne APENAS palavras-chave otimizadas (máximo 5) separadas por vírgula para busca web.' },
              { role: 'user', content: userPrompt }
            ],
            temperature: 0.3, max_tokens: 100
          })
        });

        if (!planResponse.ok) {
          const status = planResponse.status;
          const errData = await planResponse.json().catch(() => ({}));
          const detail = errData.error?.message || 'Erro no planejamento';
          console.error(`OpenRouter Error ${status}:`, detail);
          showErrorCard(status, detail, userPrompt, attachedFilesData);
          throw new Error(detail);
        }
        const planData = await planResponse.json();
        searchKeywords = planData.choices[0].message.content.trim();
        await sleep(800);
      } else {
        const titleEl1 = document.getElementById(`mainTitle_${currentAgentId}`);
        if (titleEl1) titleEl1.textContent = 'Interpretando necessidade de busca automática...';
        await sleep(600);
      }

      setStepCompleted(1, currentAgentId);

      // ETAPA 2
      setStepActive(2, currentAgentId);
      const titleEl2 = document.getElementById(`mainTitle_${currentAgentId}`);
      if (titleEl2) titleEl2.textContent = 'Varrendo canais da web em tempo real...';

      const searchResponse = await fetch('/api/search', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ searchQuery: searchKeywords })
      });

      if (!searchResponse.ok) {
        throw new Error('Erro ao chamar Tavily API');
      }

      const searchData = await searchResponse.json();
      await sleep(1500);
      setStepCompleted(2, currentAgentId);

      // (Lógica de visão mantida intacta)
      if (attachedFilesData && attachedFilesData.length > 0) {
        try {
          const imgsToAnalyze = attachedFilesData
            .filter(f => f.src && f.file)
            .map(f => ({ data: f.src.split(',')[1], type: f.file.type }));

          if (imgsToAnalyze.length > 0) {
            const messageContentForVision = [
              { type: 'text', text: 'Analise estas imagens detalhadamente em português. Descreva objetos, cores, texto visível, contexto e observações relevantes.' }
            ];

            imgsToAnalyze.forEach(img => {
              messageContentForVision.push({ type: 'image_url', image_url: { url: `data:${img.type};base64,${img.data}` } });
            });

            let visionAnalysis = null;
            let lastVisionErr = null;

            for (const [k, modelName] of Object.entries(VISION_MODELS)) {
              try {
                const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
                  method: 'POST',
                  headers: { 'Authorization': `Bearer ${openRouterApiKey}`, 'Content-Type': 'application/json', 'HTTP-Referer': window.location.origin, 'X-Title': 'WSM AI' },
                  body: JSON.stringify({
                    model: modelName,
                    messages: [ { role: 'user', content: messageContentForVision } ],
                    temperature: 0.3, max_tokens: 800
                  })
                });

                if (resp.ok) {
                  const j = await resp.json();
                  visionAnalysis = j.choices[0].message.content;
                  break;
                } else {
                  const er = await resp.json();
                  lastVisionErr = er.error?.message || JSON.stringify(er);
                }
              } catch (err) {
                lastVisionErr = err.message;
              }
            }

            if (visionAnalysis) {
              imageAnalysisText = visionAnalysis;
            } else {
              imageAnalysisText = `Erro na análise de imagens: ${lastVisionErr || 'Nenhuma resposta'}`;
            }
          }
        } catch (err) {
          imageAnalysisText = `Erro ao preparar análise de imagens: ${err.message}`;
        }
      }

      // ETAPA 3
      setStepActive(3, currentAgentId);
      const titleEl3 = document.getElementById(`mainTitle_${currentAgentId}`);
      if (titleEl3) titleEl3.textContent = 'Analisando referências de consistência...';

      const sourcesFooter = document.getElementById(`sourcesFooter_${currentAgentId}`);
        if (sourcesFooter && searchData.results.length > 0) {
          // Ocultar a seção de fontes padrão para não poluir a UI, já que agora usamos tags inline
          sourcesFooter.style.display = 'none';
        }

          const tavilyBox = document.getElementById(`tavilyImages_${currentAgentId}`);
          if (tavilyBox) {
            // Filtragem inteligente: remove URLs de redes sociais e garante apenas imagens válidas
            const imgs = (searchData.images && Array.isArray(searchData.images) ? searchData.images : [])
              .concat(searchData.results.map(r => r.image || r.thumbnail || null))
              .filter(Boolean)
              .filter(url => !url.includes('instagram.com') && !url.includes('youtube.com') && !url.includes('facebook.com') && !url.includes('twitter.com'))
              .slice(0, 5);

            if (imgs.length > 0) {
              tavilyBox.style.display = 'flex';
              tavilyBox.style.gap = '10px';
              tavilyBox.style.overflowX = 'auto';
              tavilyBox.innerHTML = '';

              imgs.forEach((imgUrl, i) => {
                const imgEl = document.createElement('div');
                imgEl.className = 'tavily-thumb';
                imgEl.innerHTML = `<img src="${imgUrl}" alt="Tavily image ${i+1}" onclick="openFullscreen(this.src)" style="cursor: pointer; object-fit: cover; width: 100%; height: 100%;" onerror="this.parentElement.style.display='none'"/>`;
                tavilyBox.appendChild(imgEl);
              });
            }
          }

      await sleep(1500);
      setStepCompleted(3, currentAgentId);

      // ETAPA 4
      setStepActive(4, currentAgentId);
      const titleEl4 = document.getElementById(`mainTitle_${currentAgentId}`);
      if (titleEl4) titleEl4.textContent = 'Sintetizando insights finais com dados reais...';

      const sourcesContext = (imageAnalysisText ? `Análise das imagens anexadas:\n${imageAnalysisText}\n\n` : '') + searchData.results
        .map((r, i) => `[${i + 1}] ${r.title}\nFonte: ${r.url}\nResumo: ${r.content}`)
        .join('\n\n');

      const synthesisResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${openRouterApiKey}`, 'Content-Type': 'application/json', 'HTTP-Referer': window.location.origin, 'X-Title': 'WSM AI' },
        body: JSON.stringify({
          model: 'nvidia/nemotron-3-super-120b-a12b:free',
          messages: [
            {
              role: 'system',
              content: `Você é um assistente de pesquisa premium.
              REGRAS DE CITAÇÃO (CRÍTICAS):
              1) OBRIGATÓRIO: Ao usar um fato, inclua a citação [n] (índice da fonte) ao final de CADA parágrafo.
              2) PROIBIDO: Nunca crie seções "Referências", "Fontes" ou "Bibliografia".
              3) PROIBIDO: Não listar URLs ou metadados de fontes no texto.
              4) Exemplo de resposta correta: "O céu é azul devido à dispersão de Rayleigh [1]."
              Se não seguir estas regras, a interface quebra.`
            },
            {
              role: 'user',
              content: `Com base nestes dados REAIS coletados da internet:\n\n${sourcesContext}\n\nResponda à pergunta original do usuário de forma premium e estruturada:\n\n${userPrompt}`
            }
          ],
          temperature: 0.7, max_tokens: 1500
        })
      });

      if (!synthesisResponse.ok) throw new Error('Erro ao sintetizar resposta final');

      const synthesisData = await synthesisResponse.json();
      const finalResponse = synthesisData.choices[0].message.content;

      currentSession.messages.push({ role: 'user', text: userPrompt || "[Pesquisa Web Iniciada]" });
      currentSession.messages.push({ role: 'bot', text: finalResponse });
      saveSessions();
      renderHistoryList();

      await sleep(800);
      setStepCompleted(4, currentAgentId);

      clearInterval(timerInterval);
      const thoughtBoxEl = document.getElementById(`thoughtBox_${currentAgentId}`);
      const titleElFinal = document.getElementById(`mainTitle_${currentAgentId}`);

      if (thoughtBoxEl) thoughtBoxEl.classList.add('completed');
      if (titleElFinal) titleElFinal.textContent = 'Raciocínio concluído com sucesso';

      setTimeout(() => { if (thoughtBoxEl) thoughtBoxEl.classList.add('collapsed'); }, 600);

      setTimeout(() => {
        const outputCard = document.getElementById(`outputCard_${currentAgentId}`);
        const outputContent = document.getElementById(`outputContent_${currentAgentId}`);
        const researchFollowups = document.getElementById(`researchFollowups_${currentAgentId}`);
        const sourcesFooter = document.getElementById(`sourcesFooter_${currentAgentId}`);

        if (outputCard && outputContent) {
          outputCard.style.display = 'block';

          // --- Cleanup: Remove list of URLs from the end of the response ---
          // Regex agressivo para remover seções de fontes/referências
          let cleanedResponse = finalResponse
            .replace(/(?:Referências|Fontes|Links):\s*(?:\n.*)+/gi, '')
            .replace(/(?:https?:\/\/)?(?:[\w-]+\.)+[a-z]{2,}(?:\S*)\s+.*(?:\n|$)/gi, '');
          let researchDisplay = cleanedResponse;
          let researchSuggestions = [];

          const suggestionsRegex = /(?:\[SUGESTOES\]|\*\*Sugestões\*\*|### Sugestões|Sugestões:|Sugestões para o usuário:)\s*\n([\s\S]*)$/i;
          const match = researchDisplay.match(suggestionsRegex);

          if (match) {
            researchDisplay = finalResponse.replace(suggestionsRegex, '').trim();
            researchSuggestions = match[1].trim().split('\n')
              .map(s => s.replace(/^[-*0-9.\s]+/, '').trim())
              .filter(s => s.length > 0)
              .slice(0, 3);
          }

          const botAvatarHTML = `<img src="oi.gif" class="bot-avatar" alt="AI"><span class="bot-name-tag">WSM 1.5 Flash</span>`;
          const researchMsgId = 'res_' + Date.now();
          outputCard.id = researchMsgId;
          outputCard.setAttribute('data-raw-content', researchDisplay);

          // --- Citation Injection (per paragraph) ---
          console.log("Research Display raw:", researchDisplay);
          let paragraphs = researchDisplay.split(/\n\n+/); // Split by double newline for paragraphs
let formattedParagraphs = paragraphs.map(p => {
               // Ensure we capture even variations like [ 1 ] or [fonte: 1]
               let contentWithPlaceholders = p.replace(/\[\s*(?:fonte:?\s*)?(\d+|[^\]]+)\s*\]/gi, '@@CIT_$1@@');
               console.log("Paragraph processed:", contentWithPlaceholders);
               let htmlContent = formatMarkdown(contentWithPlaceholders);

               // Replace placeholders with HTML *after* markdown rendering for this paragraph
               return htmlContent.replace(/@@CIT_(.*?)@@/g, (match, p1) => {
                  const idx = parseInt(p1) - 1;
                  if (!isNaN(idx) && idx >= 0 && idx < searchData.results.length) {
                      const result = searchData.results[idx];
                      const domain = (() => { try { return new URL(result.url).hostname.replace('www.', ''); } catch(e){ return result.url; }})();
                      const icon = `https://www.google.com/s2/favicons?domain=${result.url}`;
                      return `<span class="site-tag" onclick="openSourcesSidebar('${currentAgentId}', ${JSON.stringify(searchData.results).replace(/"/g, '&quot;')})"><img src="${icon}" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgMTQgMTQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTcgMS41QzcgMS41IDkuNSA0IDkuNSA3QzkuNSAxMCA3IDEyLjUgNyAxMi41QzcgMTIuNSA0LjUgMTAgNC41IDdDNC41IDQgNyAxLjUgNyAxLjVaIiBmaWxsPSIjMGFwYTBhIi8+PC9zdmc='" />${domain}</span>`;
                  }
                  const found = searchData.results.find(r => r.title.toLowerCase().includes(p1.toLowerCase()) || r.url.toLowerCase().includes(p1.toLowerCase()));
                  if (found) {
                      const icon = `https://www.google.com/s2/favicons?domain=${found.url}`;
                      return `<span class="site-tag" onclick="openSourcesSidebar('${currentAgentId}', ${JSON.stringify(searchData.results).replace(/"/g, '&quot;')})"><img src="${icon}" onerror="this.src='data:image/svg+xml;base64,PHN2ZyB2aWV3Qm94PSIwIDAgMTQgMTQiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHBhdGggZD0iTTcgMS41QzcgMS41IDkuNSA0IDkuNSA3QzkuNSAxMCA3IDEyLjUgNyAxMi41QzcgMTIuNSA0LjUgMTAgNC41IDdDNC41IDQgNyAxLjUgNyAxLjVa"/>${p1.substring(0,15)}</span>`;
                  }
                  return match;
               });
               }).join('\n\n'); // Rejoin paragraphs
// Detect ApexCharts JSON block in the AI response
let chartOptions = null;
const jsonBlockMatch = finalResponse.match(/```json\s*([\s\S]*?)```/);
if (jsonBlockMatch) {
  try {
    chartOptions = JSON.parse(jsonBlockMatch[1]);
  } catch (e) {
    console.warn('Failed to parse ApexCharts JSON block', e);
  }
}
outputContent.innerHTML = botAvatarHTML + formattedParagraphs;
if (chartOptions) {
  renderApexChart(chartOptions);
} else {
  hideChart();
}


          if (searchData.results.length > 0) {
              const sourcesBtn = document.createElement('button');
              sourcesBtn.className = 'action-btn';
              sourcesBtn.style.cssText = `
                margin-top: 15px;
                display: flex;
                align-items: center;
                gap: 10px;
                padding: 8px 16px;
                background: var(--pill-bg);
                border: 0.5px solid var(--border);
                border-radius: var(--radius-full);
                color: var(--text-secondary);
                cursor: pointer;
                transition: all 0.2s;
              `;

              // Favicons dos primeiros 3 sites
              const topSources = searchData.results.slice(0, 3);
              const avatarsHtml = topSources.map(s => {
                  const icon = `https://www.google.com/s2/favicons?domain=${s.url}`;
                  return `<img src="${icon}" style="width:18px; height:18px; border-radius:50%; margin-right:-8px; border:2px solid var(--bg-card);">`;
              }).join('');

              sourcesBtn.innerHTML = `
                <div style="display:flex; align-items:center; margin-right:4px;">${avatarsHtml}</div>
                <span style="font-weight:600;">Fontes</span>
              `;

              sourcesBtn.onmouseover = function() { this.style.background = 'var(--pill-hover)'; this.style.color = 'var(--text-primary)'; };
              sourcesBtn.onmouseout = function() { this.style.background = 'var(--pill-bg)'; this.style.color = 'var(--text-secondary)'; };
              sourcesBtn.onclick = () => openSourcesSidebar(currentAgentId, searchData.results);
              outputContent.appendChild(sourcesBtn);
          }

          const botActions = `<div class="message-actions"><button class="action-btn" onclick="copyMessageText('${researchMsgId}', this)" title="Copiar"><i data-lucide="copy"></i></button><button class="action-btn" onclick="regenerateAI()" title="Regenerar"><i data-lucide="refresh-cw"></i></button></div>`;
          outputCard.insertAdjacentHTML('afterend', botActions);

          if (window.lucide) lucide.createIcons();

          if (window.MathJax) MathJax.typesetPromise([outputContent]);

          if (researchFollowups && researchSuggestions.length > 0) {
            researchSuggestions.forEach(s => {
              const btn = document.createElement('button');
              btn.className = 'followup-pill';
              btn.textContent = s;
              btn.onclick = () => {
                const f = document.getElementById('inputField');
                if (f) { f.value = s; autoResize(f); f.focus(); }
              };
              researchFollowups.appendChild(btn);
            });
          }

          if (attachedFilesData && attachedFilesData.length > 0) {
            const pill = document.createElement('div');
            pill.className = 'attachment-summary-pill';
            pill.innerHTML = `
              <div class="pill-thumbs">
                ${attachedFilesData.slice(0,3).map(f => `<div class="pill-thumb"><img src="${f.src}" onclick="openFullscreen(this.src)"/></div>`).join('')}
              </div>
              <div class="pill-label">Imagens enviadas (${attachedFilesData.length})</div>
            `;
            outputCard.appendChild(pill);
            setTimeout(() => pill.classList.add('visible'), 80);
          }

          if (imageAnalysisText) {
            const analysisDiv = document.createElement('div');
            analysisDiv.className = 'image-analysis-card';
            analysisDiv.innerHTML = `
              <div class="analysis-title">Análise das imagens</div>
              <div class="analysis-content">${formatMarkdown(imageAnalysisText)}</div>
            `;
            outputCard.appendChild(analysisDiv);
            setTimeout(() => analysisDiv.classList.add('visible'), 90);
          }

          outputCard.offsetHeight;
          outputCard.classList.add('visible');
        }

        if (sourcesFooter && searchData.results.length > 0) {
          sourcesFooter.style.display = 'flex';
          sourcesFooter.style.opacity = '1';
          sourcesFooter.style.transform = 'translateY(0)';
          sourcesFooter.style.transition = 'none';
        }

          setTimeout(scrollToBottom, 50);
          deactivateSearchMode();
      }, 1100);

    } catch (error) {
      clearInterval(timerInterval);
      const outputCard = document.getElementById(`outputCard_${currentAgentId}`);
      const outputContent = document.getElementById(`outputContent_${currentAgentId}`);

      if (outputCard && outputContent) {
        outputCard.style.display = 'block';
        outputContent.innerHTML = `❌ <strong>Erro no Deep Research:</strong> ${error.message}`;
        outputCard.offsetHeight;
        outputCard.classList.add('visible');
      }
      scrollToBottom();
      deactivateSearchMode();
    }
  }

  // ========== AGENTE DE MAPAS (100% OPEN SOURCE / LEAFLET) ==========
  async function executeMapAgent(userPrompt, attachedFilesData = []) {
    // Agente temporariamente em manutenção — não ativa.
    showToast("Agente de Mapas em manutenção. Por favor, tente mais tarde.", "info");
    return;

    activeAgentsCount++;
    const currentAgentId = activeAgentsCount;
    const messagesEl = document.getElementById('messages');
    if (!messagesEl) return;

    if (!currentSessionId) {
      currentSessionId = Date.now().toString();
      sessions.unshift({
        id: currentSessionId,
        title: userPrompt ? userPrompt.substring(0, 30) + "..." : "Busca no Mapa",
        messages: []
      });
    }
    const currentSession = sessions.find(s => s.id === currentSessionId);

    const agentContainer = document.createElement('div');
    agentContainer.className = 'agent-response-container';
    agentContainer.innerHTML = `
      <div class="agent-pill" style="background: rgba(16, 185, 129, 0.1); border-color: rgba(16, 185, 129, 0.2); color: var(--agent-green);">
        <i class="ti ti-map-2" style="color: var(--agent-green);"></i>
        Agente de Mapas ativo
      </div>

      <div class="thought-box" id="thoughtBox_${currentAgentId}">
        <div class="thought-header" onclick="toggleAgentThoughtBox(${currentAgentId})">
          <div class="thought-status">
            <div class="spinner" id="mainSpinner_${currentAgentId}" style="border-top-color: var(--agent-green);"></div>
            <i class="ti ti-circle-check-filled success-icon" id="mainCheck_${currentAgentId}" style="color: var(--agent-green);"></i>
            <span class="thought-title" id="mainTitle_${currentAgentId}">Processando intenção geográfica...</span>
          </div>
          <span class="thought-duration" id="timer_${currentAgentId}">0.0s</span>
          <i class="ti ti-chevron-down thought-toggle"></i>
        </div>

        <div class="thought-content">
          <div class="step" id="step1_${currentAgentId}">
            <div class="step-icon" id="icon1_${currentAgentId}">1</div>
            <div class="step-text">Interpretando destino e contexto...</div>
          </div>
          <div class="step" id="step2_${currentAgentId}">
            <div class="step-icon" id="icon2_${currentAgentId}">2</div>
            <div class="step-text">Consultando banco de dados OpenStreetMap...</div>
          </div>
          <div class="step" id="step3_${currentAgentId}">
            <div class="step-icon" id="icon3_${currentAgentId}">3</div>
            <div class="step-text">Validando coordenadas e gerando mapa...</div>
          </div>
          <div class="step" id="step4_${currentAgentId}">
            <div class="step-icon" id="icon4_${currentAgentId}">4</div>
            <div class="step-text">Sintetizando detalhes para o chat...</div>
          </div>
        </div>
      </div>

      <div class="output-card" id="outputCard_${currentAgentId}">
        <p id="outputContent_${currentAgentId}"></p>
        <div id="researchFollowups_${currentAgentId}" class="followups"></div>
      </div>
    `;

    messagesEl.appendChild(agentContainer);
    scrollToBottom();

    let startTime = Date.now();
    let timerInterval = setInterval(() => {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      const timerEl = document.getElementById(`timer_${currentAgentId}`);
      if (timerEl) timerEl.textContent = `${elapsed}s`;
    }, 100);

    try {
      console.log("DEBUG: Research started. searchMode:", searchMode);
      // ETAPA 1: Planejamento via OpenRouter para OpenStreetMap Nominatim
      setStepActive(1, currentAgentId);
      let openRouterApiKey = localStorage.getItem('OPENROUTER_API_KEY');
      if (!openRouterApiKey) {
        const configResponse = await fetch('/api/config');
        if (configResponse.ok) {
          const configData = await configResponse.json();
          openRouterApiKey = configData.openRouterApiKey;
        }
      }
      if (!openRouterApiKey) throw new Error('OPENROUTER_API_KEY não encontrada');

      const planResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${openRouterApiKey}`, 'Content-Type': 'application/json', 'HTTP-Referer': window.location.origin, 'X-Title': 'WSM AI' },
        body: JSON.stringify({
          model: 'nvidia/nemotron-3-super-120b-a12b:free',
          messages: [
            { role: 'system', content: 'Você é um especialista em geolocalização. Transforme o pedido do usuário em uma busca otimizada para a API Nominatim (OpenStreetMap). Retorne APENAS a string de busca, sem aspas ou acréscimos. Se for um tipo de local em uma cidade, use o formato "local, cidade". Ex: "restaurantes em santos" -> "restaurante, santos". "praias de ubatuba" -> "praia, ubatuba".' },
            { role: 'user', content: userPrompt }
          ],
          temperature: 0.1, max_tokens: 50
        })
      });

      if (!planResponse.ok) throw new Error('Erro ao planejar busca no mapa');
      const planData = await planResponse.json();
      let searchKeywords = planData.choices[0].message.content.trim().replace(/['"]/g, '');
      await sleep(600);
      setStepCompleted(1, currentAgentId, '#10b981');

      // ETAPA 2: Consultando Nominatim (Totalmente gratuito)
      setStepActive(2, currentAgentId);
      const titleEl2 = document.getElementById(`mainTitle_${currentAgentId}`);
      if (titleEl2) titleEl2.textContent = `Consultando Mapa para: ${searchKeywords}...`;

      const nomRes = await fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchKeywords)}&limit=15`);
      if (!nomRes.ok) throw new Error('Erro ao consultar OpenStreetMap');
      const places = await nomRes.json();
      await sleep(1000);
      setStepCompleted(2, currentAgentId, '#10b981');

      // ETAPA 3: Renderizando mapa
      setStepActive(3, currentAgentId);
      const titleEl3 = document.getElementById(`mainTitle_${currentAgentId}`);
      if (titleEl3) titleEl3.textContent = 'Renderizando mapa interativo ao lado...';

      openMapArtifact(places, searchKeywords);
      await sleep(1200);
      setStepCompleted(3, currentAgentId, '#10b981');

      // ETAPA 4: Resposta Sintética no chat
      setStepActive(4, currentAgentId);
      const titleEl4 = document.getElementById(`mainTitle_${currentAgentId}`);
      if (titleEl4) titleEl4.textContent = 'Sintetizando detalhes para você...';

      let placeNames = places.slice(0, 5).map(p => p.name || p.display_name.split(',')[0]).join(', ');
      let promptMapContext = places.length > 0
        ? `Encontramos ${places.length} locais de destaque na região solicitada. Alguns deles: ${placeNames}.`
        : `Não encontramos as coordenadas exatas no OpenStreetMap para essa busca. O mapa foi centralizado numa visão padrão.`;

      const synthesisResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${openRouterApiKey}`, 'Content-Type': 'application/json', 'HTTP-Referer': window.location.origin, 'X-Title': 'WSM AI' },
        body: JSON.stringify({
          model: 'nvidia/nemotron-3-super-120b-a12b:free',
          messages: [
            {
              role: 'system',
                content: 'Você é um assistente de viagens e localização. Informe ao usuário de maneira super amigável que o mapa interativo foi aberto ao lado com os resultados que ele pediu. Mencione os locais se listados. OBRIGATÓRIO: No final, liste exatamente 3 sugestões curtas de acompanhamento para ele continuar, com o título "### Sugestões:"'
            },
            {
              role: 'user',
              content: `Pedido do usuário: "${userPrompt}".\n\nStatus da consulta no mapa: ${promptMapContext}`
            }
          ],
          temperature: 0.7, max_tokens: 800
        })
      });

      if (!synthesisResponse.ok) throw new Error('Erro ao sintetizar resposta do mapa');
      const synthesisData = await synthesisResponse.json();
      const finalResponse = synthesisData.choices[0].message.content;

      currentSession.messages.push({ role: 'user', text: userPrompt || "[Busca no Mapa Iniciada]" });
      currentSession.messages.push({ role: 'bot', text: finalResponse });
      saveSessions();
      renderHistoryList();

      await sleep(600);
      setStepCompleted(4, currentAgentId, '#10b981');

      clearInterval(timerInterval);
      const thoughtBoxEl = document.getElementById(`thoughtBox_${currentAgentId}`);
      const titleElFinal = document.getElementById(`mainTitle_${currentAgentId}`);

      if (thoughtBoxEl) thoughtBoxEl.classList.add('completed');
      if (titleElFinal) titleElFinal.textContent = 'Localização finalizada no mapa com sucesso!';

      setTimeout(() => { if (thoughtBoxEl) thoughtBoxEl.classList.add('collapsed'); }, 600);

      // Final Render da resposta
      setTimeout(() => {
        const outputCard = document.getElementById(`outputCard_${currentAgentId}`);
        const outputContent = document.getElementById(`outputContent_${currentAgentId}`);
        const researchFollowups = document.getElementById(`researchFollowups_${currentAgentId}`);

        if (outputCard && outputContent) {
          outputCard.style.display = 'block';

          let researchDisplay = finalResponse;
          let researchSuggestions = [];

          const suggestionsRegex = /(?:\[SUGESTOES\]|\*\*Sugestões\*\*|### Sugestões|Sugestões:|Sugestões para o usuário:)\s*\n([\s\S]*)$/i;
          const match = finalResponse.match(suggestionsRegex);

          if (match) {
            researchDisplay = finalResponse.replace(suggestionsRegex, '').trim();
            researchSuggestions = match[1].trim().split('\n')
              .map(s => s.replace(/^[-*0-9.\s]+/, '').trim())
              .filter(s => s.length > 0)
              .slice(0, 3);
          }

          const botAvatarHTML = `<img src="oi.gif" class="bot-avatar" alt="AI"><span class="bot-name-tag">WSM 1.5 Flash</span>`;
          const researchMsgId = 'res_' + Date.now();
          outputCard.id = researchMsgId;
          outputCard.setAttribute('data-raw-content', researchDisplay);
          const botActions = `<div class="message-actions"><button class="action-btn" onclick="copyMessageText('${researchMsgId}', this)" title="Copiar"><i data-lucide="copy"></i></button><button class="action-btn" onclick="regenerateAI()" title="Regenerar"><i data-lucide="refresh-cw"></i></button></div>`;
          outputContent.innerHTML = botAvatarHTML + formatMarkdown(researchDisplay);
          outputCard.insertAdjacentHTML('afterend', botActions);

          if (window.lucide) lucide.createIcons();

          if (researchFollowups && researchSuggestions.length > 0) {
            researchSuggestions.forEach(s => {
              const btn = document.createElement('button');
              btn.className = 'followup-pill';
              btn.textContent = s;
              btn.onclick = () => {
                const f = document.getElementById('inputField');
                if (f) { f.value = s; autoResize(f); f.focus(); }
              };
              researchFollowups.appendChild(btn);
            });
          }

          outputCard.offsetHeight;
          outputCard.classList.add('visible');
        }

        setTimeout(scrollToBottom, 50);
      }, 1100);

    } catch (error) {
      clearInterval(timerInterval);
      const outputCard = document.getElementById(`outputCard_${currentAgentId}`);
      const outputContent = document.getElementById(`outputContent_${currentAgentId}`);
      if (outputCard && outputContent) {
        outputCard.style.display = 'block';
        outputContent.innerHTML = `❌ <strong>Erro no Mapa:</strong> ${error.message}`;
        outputCard.offsetHeight;
        outputCard.classList.add('visible');
      }
      scrollToBottom();
    }
  }

  // ========== AGENTE LEITOR DE WEB (TAVILY EXTRACT + MICROLINK SCREENSHOT) ==========
  async function executeWebReader(userPrompt, detectedUrl = null, attachedFilesData = []) {
    // Agente temporariamente em manutenção — não ativa.
    showToast("Agente Leitor de Web em manutenção. Por favor, tente mais tarde.", "info");
    return;

    activeAgentsCount++;
    const currentAgentId = activeAgentsCount;
    const messagesEl = document.getElementById('messages');
    if (!messagesEl) return;

    if (!currentSessionId) {
      currentSessionId = Date.now().toString();
      sessions.unshift({
        id: currentSessionId,
        title: userPrompt ? userPrompt.substring(0, 30) + "..." : "Leitura de Link",
        messages: []
      });
    }
    const currentSession = sessions.find(s => s.id === currentSessionId);

    const agentContainer = document.createElement('div');
    agentContainer.className = 'agent-response-container';
    agentContainer.innerHTML = `
      <div class="agent-pill" style="background: rgba(2, 132, 199, 0.1); border-color: rgba(2, 132, 199, 0.2); color: var(--agent-blue);">
        <i class="ti ti-world-search" style="color: var(--agent-blue);"></i>
        Agente Leitor de Web ativo
      </div>

      <div class="thought-box" id="thoughtBox_${currentAgentId}">
        <div class="thought-header" onclick="toggleAgentThoughtBox(${currentAgentId})">
          <div class="thought-status">
            <div class="spinner" id="mainSpinner_${currentAgentId}" style="border-top-color: var(--agent-blue);"></div>
            <i class="ti ti-circle-check-filled success-icon" id="mainCheck_${currentAgentId}" style="color: var(--agent-blue);"></i>
            <span class="thought-title" id="mainTitle_${currentAgentId}">Planejando leitura da página...</span>
          </div>
          <span class="thought-duration" id="timer_${currentAgentId}">0.0s</span>
          <i class="ti ti-chevron-down thought-toggle"></i>
        </div>

        <div class="thought-content">
          <div class="step" id="step1_${currentAgentId}">
            <div class="step-icon" id="icon1_${currentAgentId}">1</div>
            <div class="step-text" id="stepText1_${currentAgentId}">Validando URL fornecida...</div>
          </div>
          <div class="step" id="step2_${currentAgentId}">
            <div class="step-icon" id="icon2_${currentAgentId}">2</div>
            <div class="step-text" id="stepText2_${currentAgentId}">Acessando o site e gerando miniatura...</div>
          </div>
          <div class="step" id="step3_${currentAgentId}">
            <div class="step-icon" id="icon3_${currentAgentId}">3</div>
            <div class="step-text" id="stepText3_${currentAgentId}">Extraindo conteúdo de texto principal...</div>
          </div>
          <div class="step" id="step4_${currentAgentId}">
            <div class="step-icon" id="icon4_${currentAgentId}">4</div>
            <div class="step-text" id="stepText4_${currentAgentId}">Sintetizando e gerando resposta no chat...</div>
          </div>
        </div>
      </div>

      <div class="output-card" id="outputCard_${currentAgentId}" style="display: none; margin-top: 28px; margin-left: 52px; position: relative;">
        <!-- Bot Header (Avatar + Name) -->
        <div id="botHeader_${currentAgentId}"></div>

        <!-- Screenshot Container -->
        <div class="web-screenshot-container" id="webScreenshotContainer_${currentAgentId}">
          <div class="web-screenshot-placeholder" id="webScreenshotPlaceholder_${currentAgentId}">
            <div class="spinner" style="border-top-color: var(--agent-blue); width: 20px; height: 20px; border-width: 2px;"></div>
            <span>Carregando site...</span>
          </div>
        </div>

        <div class="bot-response-content" id="outputContent_${currentAgentId}"></div>
        <div id="researchFollowups_${currentAgentId}" class="followups"></div>
      </div>
    `;

    messagesEl.appendChild(agentContainer);
    scrollToBottom();

    let startTime = Date.now();
    let timerInterval = setInterval(() => {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      const timerEl = document.getElementById(`timer_${currentAgentId}`);
      if (timerEl) timerEl.textContent = `${elapsed}s`;
    }, 100);

    try {
      // ETAPA 1: Identificar/Validar URL
      setStepActive(1, currentAgentId);
      let url = detectedUrl;

      // Se não foi passada URL detectada pelo regex do sendMessage, tenta encontrar no prompt completo
      if (!url) {
        const urlRegex = /(https?:\/\/[^\s]+)/gi;
        const matches = userPrompt.match(urlRegex);
        if (matches && matches.length > 0) {
          url = matches[0];
        }
      }

      await sleep(600);

      if (!url) {
        clearInterval(timerInterval);
        throw new Error("Não encontrei nenhuma URL válida na mensagem. Por favor, envie uma mensagem que contenha um link começando com http:// ou https://.");
      }

      const stepText1 = document.getElementById(`stepText1_${currentAgentId}`);
      if (stepText1) stepText1.textContent = `URL validada: ${url}`;
      setStepCompleted(1, currentAgentId, '#0284c7');

      // ETAPA 2: Acessando site e gerando miniatura (Microlink API)
      setStepActive(2, currentAgentId);
      const titleEl2 = document.getElementById(`mainTitle_${currentAgentId}`);
      if (titleEl2) titleEl2.textContent = `Acessando ${url}...`;

      // Tornar o card de output visível para exibir o placeholder do print
      const outputCard = document.getElementById(`outputCard_${currentAgentId}`);
      if (outputCard) {
        outputCard.style.display = 'block';
        outputCard.classList.add('visible');
      }

      // Iniciamos o carregamento da imagem do print
      const screenshotUrl = `https://api.microlink.io/?url=${encodeURIComponent(url)}&screenshot=true&embed=screenshot.url`;
      const imgPlaceholder = document.getElementById(`webScreenshotPlaceholder_${currentAgentId}`);
      const imgContainer = document.getElementById(`webScreenshotContainer_${currentAgentId}`);

      if (imgContainer) {
        const imgEl = document.createElement('img');
        imgEl.className = 'web-screenshot-image';
        imgEl.style.opacity = '0';
        imgEl.alt = `Print de ${url}`;
        imgEl.onclick = () => openFullscreen(screenshotUrl);

        imgEl.onload = () => {
          if (imgPlaceholder) imgPlaceholder.style.display = 'none';
          imgEl.style.opacity = '1';
          if (!imgContainer.querySelector('.screenshot-info')) {
            const infoSpan = document.createElement('span');
            infoSpan.className = 'screenshot-info';
            infoSpan.style.cssText = "font-size: 11px; color: var(--text-muted); padding: 8px 12px; display: block; border-top: 1px solid var(--border); width: 100%; box-sizing: border-box; font-family: 'Inter', sans-serif;";
            infoSpan.innerHTML = `<i class="ti ti-info-circle"></i> Clique na imagem para abrir em tela cheia`;
            imgContainer.appendChild(infoSpan);
          }
        };

        imgEl.onerror = () => {
          if (imgPlaceholder) {
            imgPlaceholder.innerHTML = `
              <i class="ti ti-camera-off" style="font-size: 24px; color: var(--text-muted);"></i>
              <span>Não foi possível carregar o print do site</span>
            `;
          }
        };

        imgContainer.insertBefore(imgEl, imgContainer.firstChild);
        imgEl.src = screenshotUrl;
      }

      await sleep(1000);
      setStepCompleted(2, currentAgentId, '#0284c7');

      // ETAPA 3: Extraindo texto (Tavily Extract API)
      setStepActive(3, currentAgentId);
      const titleEl3 = document.getElementById(`mainTitle_${currentAgentId}`);
      if (titleEl3) titleEl3.textContent = `Lendo conteúdo do site via Tavily Extract...`;

      const extractResponse = await fetch('/api/extract', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url })
      });

      if (!extractResponse.ok) {
        throw new Error('Falha ao extrair conteúdo da página. Verifique se o link está acessível publicamente.');
      }

      const extractData = await extractResponse.json();
      const extractedItem = extractData.results && extractData.results.length > 0 ? extractData.results[0] : null;
      let rawContent = extractedItem ? extractedItem.raw_content : "";

      if (!rawContent || rawContent.trim().length === 0) {
        throw new Error('Não foi possível extrair nenhum texto útil da URL fornecida.');
      }

      // Limita o tamanho do texto para enviar para a IA
      const textLimit = 4000;
      let truncatedContent = rawContent;
      if (rawContent.length > textLimit) {
        truncatedContent = rawContent.substring(0, textLimit) + "\n\n[Conteúdo truncado devido ao limite de tamanho...]";
      }

      await sleep(1200);
      setStepCompleted(3, currentAgentId, '#0284c7');

      // ETAPA 4: Chamada à Groq com o contexto do site
      setStepActive(4, currentAgentId);
      const titleEl4 = document.getElementById(`mainTitle_${currentAgentId}`);
      if (titleEl4) titleEl4.textContent = 'Analisando e sintetizando resposta final...';

      let openRouterApiKey = localStorage.getItem('OPENROUTER_API_KEY');
      if (!openRouterApiKey) {
        const configResponse = await fetch('/api/config');
        if (configResponse.ok) {
          const configData = await configResponse.json();
          openRouterApiKey = configData.openRouterApiKey;
        }
      }
      if (!openRouterApiKey) throw new Error('OPENROUTER_API_KEY não encontrada');

      const cleanedPrompt = userPrompt.replace(url, '').trim();
      const instructionToAI = cleanedPrompt.length > 0
        ? `Responda à seguinte pergunta/pedido do usuário com base no conteúdo lido da página: "${cleanedPrompt}"`
        : `Faça um resumo executivo bem estruturado e focado desta página web, destacando os pontos principais em português.`;

      const synthesisResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${openRouterApiKey}`, 'Content-Type': 'application/json', 'HTTP-Referer': window.location.origin, 'X-Title': 'WSM AI' },
        body: JSON.stringify({
          model: 'nvidia/nemotron-3-super-120b-a12b:free',
          messages: [
            {
              role: 'system',
              content: 'Você é o WSM AI 1.0 Omni, atuando como um Agente Leitor de Web premium. Analise o conteúdo do site fornecido e responda de forma estruturada. REGRAS: 1) Responda sempre em português. 2) Se baseie estritamente nas informações contidas na página lida. 3) Use títulos e listas para melhorar a legibilidade. 4) No final, liste exatamente 3 sugestões curtas de acompanhamento na primeira pessoa do singular (ex: "Gostaria de ver um resumo de...", "Explique o ponto X..."), sob o título "### Sugestões:"'
            },
            {
              role: 'user',
              content: `Site lido: ${url}\n\nConteúdo textual extraído da página:\n---\n${truncatedContent}\n---\n\nInstrução: ${instructionToAI}`
            }
          ],
          temperature: 0.5, max_tokens: 1200
        })
      });

      if (!synthesisResponse.ok) throw new Error('Erro ao gerar resposta final com a IA');
      const synthesisData = await synthesisResponse.json();
      const finalResponse = synthesisData.choices[0].message.content;

      currentSession.messages.push({ role: 'user', text: userPrompt || `Leitura de Link: ${url}` });
      currentSession.messages.push({
        role: 'bot',
        text: finalResponse,
        screenshotUrl: screenshotUrl,
        webReaderUrl: url,
        webReaderContent: rawContent
      });
      saveSessions();
      renderHistoryList();

      await sleep(800);
      setStepCompleted(4, currentAgentId, '#0284c7');

      clearInterval(timerInterval);
      const thoughtBoxEl = document.getElementById(`thoughtBox_${currentAgentId}`);
      const titleElFinal = document.getElementById(`mainTitle_${currentAgentId}`);

      if (thoughtBoxEl) thoughtBoxEl.classList.add('completed');
      if (titleElFinal) titleElFinal.textContent = 'Leitura concluída com sucesso!';

      setTimeout(() => { if (thoughtBoxEl) thoughtBoxEl.classList.add('collapsed'); }, 600);

      // Render da resposta final
      setTimeout(() => {
        const outputCard = document.getElementById(`outputCard_${currentAgentId}`);
        const outputContent = document.getElementById(`outputContent_${currentAgentId}`);
        const researchFollowups = document.getElementById(`researchFollowups_${currentAgentId}`);

        if (outputCard && outputContent) {
          let researchDisplay = finalResponse;
          let researchSuggestions = [];

          const suggestionsRegex = /(?:\[SUGESTOES\]|\*\*Sugestões\*\*|### Sugestões|Sugestões:|Sugestões para o usuário:)\s*\n([\s\S]*)$/i;
          const match = finalResponse.match(suggestionsRegex);

          if (match) {
            researchDisplay = finalResponse.replace(suggestionsRegex, '').trim();
            researchSuggestions = match[1].trim().split('\n')
              .map(s => s.replace(/^[-*0-9.\s]+/, '').trim())
              .filter(s => s.length > 0)
              .slice(0, 3);
          }

          const botAvatarHTML = `<img src="oi.gif" class="bot-avatar" alt="AI"><span class="bot-name-tag">WSM 1.5 Flash</span>`;
          const researchMsgId = 'res_' + Date.now();

          const botHeader = document.getElementById(`botHeader_${currentAgentId}`);
          if (botHeader) {
            botHeader.innerHTML = botAvatarHTML;
          }

          outputCard.id = researchMsgId;
          outputCard.setAttribute('data-raw-content', researchDisplay);
          const botActions = `<div class="message-actions"><button class="action-btn" onclick="copyMessageText('${researchMsgId}', this)" title="Copiar"><i data-lucide="copy"></i></button><button class="action-btn" onclick="regenerateAI()" title="Regenerar"><i data-lucide="refresh-cw"></i></button></div>`;
          outputContent.innerHTML = formatMarkdown(researchDisplay);
          outputCard.insertAdjacentHTML('afterend', botActions);

          if (window.lucide) lucide.createIcons();

          // Criar botão para visualizar o texto extraído no painel lateral de Artefatos
          const viewRawCard = document.createElement('div');
          viewRawCard.className = 'artifact-trigger-card';
          viewRawCard.style.maxWidth = '100%';
          viewRawCard.style.marginTop = '12px';
          viewRawCard.innerHTML = `
            <div class="artifact-card-icon"><i class="ti ti-file-text"></i></div>
            <div class="artifact-card-info">
              <span class="title">Visualizar Conteúdo Textual Lido</span>
              <span class="meta">Texto Bruto Extraído (${rawContent.length} caracteres)</span>
            </div>
            <button class="artifact-card-btn">Abrir Conteúdo</button>
          `;
          viewRawCard.addEventListener('click', () => {
            openArtifact(rawContent, 'txt');
            const artifactTitle = document.getElementById('artifactTitle');
            if (artifactTitle) {
              artifactTitle.innerHTML = `<i class="ti ti-file-text" style="color:var(--agent-blue)"></i><span>Texto lido de ${url.replace('https://', '').replace('http://', '').split('/')[0]}</span>`;
            }
          });
          outputCard.appendChild(viewRawCard);

          if (researchFollowups && researchSuggestions.length > 0) {
            researchSuggestions.forEach(s => {
              const btn = document.createElement('button');
              btn.className = 'followup-pill';
              btn.textContent = s;
              btn.onclick = () => {
                const f = document.getElementById('inputField');
                if (f) { f.value = s; autoResize(f); f.focus(); }
              };
              researchFollowups.appendChild(btn);
            });
          }

          outputCard.offsetHeight;
          outputCard.classList.add('visible');
        }

        setTimeout(scrollToBottom, 50);
      }, 1100);

    } catch (error) {
      clearInterval(timerInterval);
      const outputCard = document.getElementById(`outputCard_${currentAgentId}`);
      const outputContent = document.getElementById(`outputContent_${currentAgentId}`);

      if (outputCard && outputContent) {
        outputCard.style.display = 'block';
        outputContent.innerHTML = `❌ <strong>Erro no Leitor de Web:</strong> ${error.message}`;
        outputCard.offsetHeight;
        outputCard.classList.add('visible');
      }
      scrollToBottom();
    }
  }

  // ========== AGENTE DE SLIDES: APRESENTAÇÃO (HTML REVEAL.JS) ==========
  async function executeSlideAgent(userPrompt, attachedFilesData = []) {
    activeAgentsCount++;
    const currentAgentId = activeAgentsCount;
    const messagesEl = document.getElementById('messages');
    if (!messagesEl) return;

    if (!currentSessionId) {
      currentSessionId = Date.now().toString();
      sessions.unshift({
        id: currentSessionId,
        title: userPrompt ? userPrompt.substring(0, 30) + "..." : "Apresentação",
        messages: []
      });
    }
    const currentSession = sessions.find(s => s.id === currentSessionId);

    const agentContainer = document.createElement('div');
    agentContainer.className = 'agent-response-container';
    agentContainer.innerHTML = `
      <div class="agent-pill" style="background: rgba(147, 51, 234, 0.1); border-color: rgba(147, 51, 234, 0.2); color: var(--agent-purple, #9333ea);">
        <i class="ti ti-presentation" style="color: var(--agent-purple, #9333ea);"></i>
        Agente de Apresentação ativo
      </div>

      <div class="thought-box" id="thoughtBox_${currentAgentId}">
        <div class="thought-header" onclick="toggleAgentThoughtBox(${currentAgentId})">
          <div class="thought-status">
            <div class="spinner" id="mainSpinner_${currentAgentId}" style="border-top-color: var(--agent-purple, #9333ea);"></div>
            <i class="ti ti-circle-check-filled success-icon" id="mainCheck_${currentAgentId}" style="color: var(--agent-purple, #9333ea);"></i>
            <span class="thought-title" id="mainTitle_${currentAgentId}">Validando plano de apresentação...</span>
          </div>
          <span class="thought-duration" id="timer_${currentAgentId}">0.0s</span>
          <i class="ti ti-chevron-down thought-toggle"></i>
        </div>

        <div class="thought-content">
          <div class="step" id="step1_${currentAgentId}">
            <div class="step-icon" id="icon1_${currentAgentId}">1</div>
            <div class="step-text" id="stepText1_${currentAgentId}">Planejando termos de pesquisa factual na web...</div>
          </div>
          <div class="step" id="step2_${currentAgentId}">
            <div class="step-icon" id="icon2_${currentAgentId}">2</div>
            <div class="step-text" id="stepText2_${currentAgentId}">Pesquisando referências na web em tempo real...</div>
          </div>
          <div class="step" id="step3_${currentAgentId}">
            <div class="step-icon" id="icon3_${currentAgentId}">3</div>
            <div class="step-text" id="stepText3_${currentAgentId}">Compilando referências e design dos slides...</div>
          </div>
          <div class="step" id="step4_${currentAgentId}">
            <div class="step-icon" id="icon4_${currentAgentId}">4</div>
            <div class="step-text" id="stepText4_${currentAgentId}">Sintetizando e gerando slides didáticos (Llama 3.3 70B)...</div>
          </div>
        </div>
      </div>

      <div class="output-card" id="outputCard_${currentAgentId}" style="display: none; margin-top: 28px; margin-left: 52px; position: relative;">
        <!-- Bot Header (Avatar + Name) -->
        <div id="botHeader_${currentAgentId}"></div>

        <div class="bot-response-content" id="outputContent_${currentAgentId}"></div>
        <div id="researchFollowups_${currentAgentId}" class="followups"></div>
      </div>
    `;

    messagesEl.appendChild(agentContainer);
    scrollToBottom();

    let startTime = Date.now();
    let timerInterval = setInterval(() => {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      const timerEl = document.getElementById(`timer_${currentAgentId}`);
      if (timerEl) timerEl.textContent = `${elapsed}s`;
    }, 100);

    try {
      let openRouterApiKey = localStorage.getItem('OPENROUTER_API_KEY');
      if (!openRouterApiKey) {
        const configResponse = await fetch('/api/config');
        if (configResponse.ok) {
          const configData = await configResponse.json();
          openRouterApiKey = configData.openRouterApiKey;
        }
      }
      if (!openRouterApiKey) throw new Error('OPENROUTER_API_KEY não encontrada');

      // Verifica se já existe um slide gerado anteriormente na sessão ativa
      const previousSlideMsg = currentSession && currentSession.messages
        ? currentSession.messages.slice().reverse().find(m => m.role === 'bot' && m.isSlide && m.text)
        : null;
      const hasPreviousSlide = !!previousSlideMsg;

      let searchContextText = "";
      let matches = [];

      if (!hasPreviousSlide) {
        // ETAPA 1: Planejar termos de busca
        setStepActive(1, currentAgentId);
        const titleEl1 = document.getElementById(`mainTitle_${currentAgentId}`);
        if (titleEl1) titleEl1.textContent = 'Planejando termos de pesquisa factual na web...';

        const planResponse = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: { 'Authorization': `Bearer ${openRouterApiKey}`, 'Content-Type': 'application/json', 'HTTP-Referer': window.location.origin, 'X-Title': 'WSM AI' },
          body: JSON.stringify({
            model: 'nvidia/nemotron-3-super-120b-a12b:free',
            messages: [
              { role: 'system', content: 'Você é um assistente de planejamento para apresentações de slides focado em exatidão histórica, científica e conceitual. Analise a solicitação do usuário e retorne OBRIGATORIAMENTE de 1 a 3 termos específicos de busca na web para coletar fatos, dados e datas precisas sobre o tema. Você NUNCA deve retornar colchetes vazios ou decidir não pesquisar. Retorne os termos EXCLUSIVAMENTE entre colchetes separados por vírgula. Exemplo de retorno: "{revolução francesa}, {maria antonieta}, {reino do terror}".' },
              { role: 'user', content: userPrompt }
            ],
            temperature: 0.2, max_tokens: 100
          })
        });

        if (planResponse.ok) {
          const planData = await planResponse.json();
          const planText = planData.choices[0].message.content.trim();
          const bracketRegex = /\{([^}]+)\}/g;
          let match;
          while ((match = bracketRegex.exec(planText)) !== null) {
            matches.push(match[1].trim());
          }
        }

        // Fallback: se nenhum termo for retornado, usa o próprio prompt do usuário como termo de busca para garantir a pesquisa web
        if (matches.length === 0 && userPrompt) {
          matches.push(userPrompt.trim());
        }

        const stepText1 = document.getElementById(`stepText1_${currentAgentId}`);
        if (stepText1) {
          stepText1.textContent = matches.length > 0
            ? `Termos planejados: ${matches.map(m => `"${m}"`).join(', ')}`
            : 'Nenhuma busca web externa considerada necessária.';
        }
        setStepCompleted(1, currentAgentId, '#9333ea');

        // ETAPA 2: Realizar buscas na web (5 segundos de intervalo entre cada)
        setStepActive(2, currentAgentId);
        const titleEl2 = document.getElementById(`mainTitle_${currentAgentId}`);
        if (titleEl2) titleEl2.textContent = 'Pesquisando na web em tempo real (Tavily)...';

        const allSearchResults = [];
        const stepText2 = document.getElementById(`stepText2_${currentAgentId}`);

        if (matches.length > 0) {
          for (let i = 0; i < matches.length; i++) {
            const query = matches[i];
            if (stepText2) stepText2.textContent = `Buscando por: "${query}" (${i + 1}/${matches.length})...`;

            try {
              const searchResponse = await fetch('/api/search', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ searchQuery: query })
              });
              if (searchResponse.ok) {
                const searchData = await searchResponse.json();
                if (searchData && searchData.results) {
                  searchData.results.forEach(res => {
                    allSearchResults.push({
                      title: res.title || 'Busca Sem Título',
                      url: res.url || '',
                      content: res.content || ''
                    });
                  });
                }
              }
            } catch (err) {
              console.error(`Erro ao pesquisar por "${query}":`, err);
            }

            if (i < matches.length - 1) {
              await sleep(5000); // 5 segundos de intervalo entre chamadas
            }
          }
        }

        if (stepText2) {
          stepText2.textContent = allSearchResults.length > 0
            ? `Coletadas ${allSearchResults.length} fontes e referências da web.`
            : 'Busca na web concluída (sem novos dados adicionais).';
        }
        setStepCompleted(2, currentAgentId, '#9333ea');

        // ETAPA 3: Compilar referências e estruturar design
        setStepActive(3, currentAgentId);
        const titleEl3 = document.getElementById(`mainTitle_${currentAgentId}`);
        if (titleEl3) titleEl3.textContent = 'Compilando referências e design dos slides...';

        if (allSearchResults.length > 0) {
          searchContextText = "Aqui estão fatos históricos/científicos reais e atualizados extraídos da web para fundamentar sua apresentação e garantir precisão factual absoluta (utilize estritamente estes dados de nomes, anos, personagens e eventos ao gerar os slides):\n\n";
          allSearchResults.slice(0, 6).forEach((res, index) => {
            searchContextText += `--- FONTE [${index + 1}] ---\n`;
            searchContextText += `Título: ${res.title}\n`;
            searchContextText += `URL: ${res.url}\n`;
            searchContextText += `Conteúdo: ${res.content.substring(0, 400)}\n\n`;
          });
        }

        const stepText3 = document.getElementById(`stepText3_${currentAgentId}`);
        if (stepText3) {
          stepText3.textContent = allSearchResults.length > 0
            ? 'Referências compiladas e estruturadas com sucesso.'
            : 'Preparando prompt de estruturação dos slides.';
        }
        setStepCompleted(3, currentAgentId, '#9333ea');
      } else {
        // MODO EDIÇÃO: pular etapas de pesquisa e avisar nos logs
        setStepActive(1, currentAgentId);
        const stepText1 = document.getElementById(`stepText1_${currentAgentId}`);
        if (stepText1) stepText1.textContent = 'Edição solicitada. Pulando planejamento de busca.';
        setStepCompleted(1, currentAgentId, '#9333ea');

        setStepActive(2, currentAgentId);
        const stepText2 = document.getElementById(`stepText2_${currentAgentId}`);
        if (stepText2) stepText2.textContent = 'Pulando busca na web (modo edição).';
        setStepCompleted(2, currentAgentId, '#9333ea');

        setStepActive(3, currentAgentId);
        const stepText3 = document.getElementById(`stepText3_${currentAgentId}`);
        if (stepText3) stepText3.textContent = 'Carregando versão anterior do slide para modificação...';
        setStepCompleted(3, currentAgentId, '#9333ea');
      }

      // ETAPA 4: Gerar slides didáticos
      setStepActive(4, currentAgentId);
      const titleEl4 = document.getElementById(`mainTitle_${currentAgentId}`);
      if (titleEl4) titleEl4.textContent = 'Gerando slides didáticos com Llama 3.3 70B...';

      const systemInstruction = `Você é o Agent-slide (Agente de Apresentações premium de altíssimo nível).
Sua tarefa é criar apresentações de slides impressionantes, profissionais, didáticas e auto-contidas usando Reveal.js em formato HTML completo.
Regras críticas para evitar slides genéricos, amadores ou com erros:

1) PORTUGUÊS NATURAL, COESÃO E PRECISÃO HISTÓRICA/FATUAL:
   - Todo o conteúdo deve ser em português impecável, natural e fluído.
   - REVISÃO DE IDIOMA E GRAMÁTICA: Evite qualquer erro de tradução ou mistura de inglês e português nos títulos ou textos (use "Causas da Revolução" e nunca "Causes", use "Reino do Terror" e nunca "Reigno", use "Rei Luís XVI" e nunca "King Louis XVI").
   - PRECISÃO HISTÓRICA E SEMÂNTICA RIGOROSA (CRÍTICO): Utilize estritamente os fatos e dados do contexto de busca fornecido. Nunca alucine ou simplifique erroneamente eventos e nomes históricos:
     * Exemplo: Use "Maria Antonieta" (nunca "Maria Antônia"), "Terceiro Estado" (nunca "Terceiro Exílio"), "Tomada da Bastilha" (nunca "Toma da Bastilha").
     * Exemplo: A Queda/Tomada da Bastilha e a Declaração dos Direitos do Homem e do Cidadão ocorreram em 1789 (nunca em 1791).
     * Exemplo: A Execução do Rei Luís XVI ocorreu em 21 de janeiro de 1793 (nunca em 1792).
     * Exemplo: Maximilien Robespierre liderou a fase do Terror Jacobino, mas ele não foi o executor físico/carrasco do Rei.
     * Exemplo: Napoleão Bonaparte foi um líder militar que assumiu o poder em 1799 com o Golpe de 18 de Brumário (evite chamá-lo simplesmente de "ditador" de forma simplista).

2) ESTRUTURA TÉCNICA OBRIGATÓRIA DO REVEAL.JS:
   - Você DEVE obrigatoriamente incluir na <head> os arquivos CSS do Reveal.js:
     <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/reveal.js/4.3.1/reset.min.css">
     <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/reveal.js/4.3.1/reveal.min.css">
     <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/reveal.js/4.3.1/theme/black.min.css" id="theme">
   - E no final do <body>, logo antes de fechar a tag html, carregue o script e inicialize:
     <script src="https://cdnjs.cloudflare.com/ajax/libs/reveal.js/4.3.1/reveal.js"><\/script>
     <script>
       Reveal.initialize({ hash: false, history: false, controls: true, slideNumber: true, transition: "slide", center: true });
     <\/script>

3) DESIGN VISUAL PREMIUM & IMPORTAÇÃO DE FONTES:
   - IMPORTAÇÃO DE FONTES OBRIGATÓRIA: Adicione na primeira linha da sua tag <style> no <head> o import do Google Fonts:
     @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400..900;1,400..900&family=Outfit:wght@100..900&family=Plus+Jakarta+Sans:ital,wght@0,200..800;1,200..800&display=swap');
   - Use 'font-family: "Outfit", sans-serif;' para títulos normais/tecnologia e 'font-family: "Playfair Display", serif;' para temas históricos, literários ou humanísticos, gerando elegância.
   - NUNCA declare propriedades CSS soltas diretamente na tag <style> sem um seletor válido. Todas as declarações CSS devem obrigatoriamente estar envelopadas dentro de seletores válidos (exemplo correto: "body { font-family: 'Outfit', sans-serif; }" em vez de colocar a regra solta no topo).
   - Use fundos modernos com gradientes CSS refinados usando a propriedade "background" ou "background-image" (ex: background: linear-gradient(135deg, #0f172a, #1e1b4b) para temas escuros). NUNCA use a propriedade "background-color" para gradientes, pois ela será ignorada pelo navegador.

4) ORGANIZAÇÃO DOS LAYOUTS E HIERARQUIA VISUAL (MUITO IMPORTANTE):
   - NUNCA aplique a classe "fragment" em títulos principais do slide (como tags <h1> ou <h2> que dão nome ao slide). O título principal deve ficar visível imediatamente quando o slide carrega. Use "fragment" apenas em tópicos auxiliares (<li>) ou blocos de texto adicionais para que apareçam progressivamente.
   - NUNCA utilize tags <img> ou imagens nos slides. Focaremos o design 100% em layouts textuais e elementos visuais como grids, tabelas, destaques e linhas do tempo.
   - NUNCA utilize ícones ou símbolos gráficos (como FontAwesome) nos slides. O design deve ser limpo e focado puramente em tipografia, diagramação e destaques textuais.
   - Utilize a classe ".split-layout" para fazer comparações ou criar destaques numéricos ou textuais. Por exemplo, divida a tela em duas colunas:
     * Lado Esquerdo: Um número ou ano gigante com cor de destaque, ou um termo-chave.
     * Lado Direito: A explicação conceitual clara e detalhada.
   - Defina os estilos apropriados no <style> para o split-layout:
     .split-layout { display: grid; grid-template-columns: 1fr 1.2fr; gap: 30px; align-items: center; width: 100%; box-sizing: border-box; }

5) TEXTO PEDAGÓGICO, CONCISO E SEM OVERFLOW (CADA SLIDE DEVE CABER NA TELA 16:9):
   - Os textos devem ser extremamente didáticos e pedagógicos, mas muito concisos e objetivos, garantindo que caibam perfeitamente na proporção 16:9 sem rolagem vertical ou cortes.
   - NÃO remova informações essenciais, mas sintetize-as em frases compactas e curtas de alto impacto.
   - Parágrafos de explicação devem conter no máximo 1 ou 2 frases curtas, diretas e limpas.
   - Use tópicos (bullets) com moderação: no máximo 2 a 3 itens por slide, onde cada item deve conter uma explicação direta de no máximo 1 linha.
   - Caso utilize grids, caixas de destaque ou split-layouts, limite o texto interno para que cada coluna ou bloco não ultrapasse 2 a 3 linhas explicativas.

6) RECURSOS VISUAIS TEXTUAIS (TIMELINES E DESTAQUES):
   - TIMELINES: Crie cronologias usando estruturas de tabela ou blocos flex em CSS para ilustrar eventos cronológicos lado a lado de forma clara e visual.
   - CAIXAS DE DESTAQUE (CALLOUTS): Use blocos de destaque para chamar atenção para frases marcantes, citações importantes ou fatos curiosos (sem ícones, apenas formatação CSS):
     <div style="background: rgba(147, 51, 234, 0.05); border-left: 4px solid #9333ea; padding: 20px; border-radius: 8px; text-align: left;">
       <p style="font-style: italic; margin: 0;">"Liberdade, Igualdade, Fraternidade" — Lema de impacto global.</p>
     </div>

7) SLIDE DE FONTES DE PESQUISA (OBRIGATÓRIO):
   - O último slide da apresentação deve ser obrigatoriamente um slide de referências intitulado "Fontes de Pesquisa".
   - Nele, liste as fontes reais fornecidas no contexto da busca web como links clicáveis formatados em HTML, abrindo em nova guia:
     <a href="URL" target="_blank" style="color: #9333ea; text-decoration: underline;">Nome do Site/Título da Fonte</a>.
   - Liste apenas as fontes reais que foram fornecidas a você no contexto.

8) ENTREGA:
   - Retorne APENAS o código HTML completo dentro de um bloco de código markdown (\`\`\`html ... \`\`\`). Sem explicações antes ou depois.`;

      let messagesForGroq = [];
      if (hasPreviousSlide) {
        const editSystemInstruction = `${systemInstruction}

Você está no MODO DE EDIÇÃO de uma apresentação de slides Reveal.js já existente.
Você receberá o código HTML atual dos slides e a solicitação de alteração do usuário (ex: adicionar um slide, corrigir uma informação, mudar cores, alterar um título, etc.).
Sua tarefa é analisar o HTML anterior, aplicar as alterações solicitadas com precisão e retornar o código HTML completo e atualizado da apresentação.
Garanta que você mantém os outros slides intactos e coerentes, respeitando a estrutura do Reveal.js.
NUNCA use tags <img> nem ícones (como FontAwesome).
Foque em explicações didáticas, concisas e pedagógicas que caibam inteiramente em 16:9.
Retorne EXCLUSIVAMENTE o código HTML completo atualizado no bloco de código markdown (\`\`\`html ... \`\`\`).`;

        messagesForGroq = [
          { role: 'system', content: editSystemInstruction },
          { role: 'user', content: `Solicitação de alteração do usuário: "${userPrompt}"\n\nAqui está o código HTML atual dos slides que você deve editar:\n\`\`\`html\n${previousSlideMsg.text}\n\`\`\`` }
        ];
      } else {
        messagesForGroq = [
          { role: 'system', content: systemInstruction },
          { role: 'user', content: `Utilizando os dados de busca abaixo como fonte de informação factual precisa, crie a apresentação de slides sobre: "${userPrompt}"\n\nContexto de Busca:\n${searchContextText}` }
        ];
      }

      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${openRouterApiKey}`, 'Content-Type': 'application/json', 'HTTP-Referer': window.location.origin, 'X-Title': 'WSM AI' },
        body: JSON.stringify({
          model: 'nvidia/nemotron-3-super-120b-a12b:free',
          messages: messagesForGroq,
          temperature: 0.6,
          max_tokens: 2500
        })
      });

      if (!response.ok) throw new Error('Falha ao gerar apresentação de slides com a IA.');
      const data = await response.json();
      const aiResponseText = data.choices[0].message.content;

      // Salva na sessão do chat
      currentSession.messages.push({ role: 'user', text: userPrompt || 'Gerar Slides' });
      currentSession.messages.push({
        role: 'bot',
        text: aiResponseText,
        isSlide: true
      });
      saveSessions();
      renderHistoryList();

      const stepText4 = document.getElementById(`stepText4_${currentAgentId}`);
      if (stepText4) {
        stepText4.textContent = 'Apresentação de slides gerada com sucesso.';
      }

      await sleep(600);
      setStepCompleted(4, currentAgentId, '#9333ea');
      clearInterval(timerInterval);

      const thoughtBoxEl = document.getElementById(`thoughtBox_${currentAgentId}`);
      const titleElFinal = document.getElementById(`mainTitle_${currentAgentId}`);
      if (thoughtBoxEl) thoughtBoxEl.classList.add('completed');
      if (titleElFinal) titleElFinal.textContent = 'Slides gerados com sucesso!';
      setTimeout(() => { if (thoughtBoxEl) thoughtBoxEl.classList.add('collapsed'); }, 600);

      // Exibe a resposta
      const outputCard = document.getElementById(`outputCard_${currentAgentId}`);
      const outputContent = document.getElementById(`outputContent_${currentAgentId}`);
      const researchFollowups = document.getElementById(`researchFollowups_${currentAgentId}`);

      if (outputCard && outputContent) {
        outputCard.style.display = 'block';
        outputCard.classList.add('visible');

        let displayResponse = aiResponseText;
        let followups = [];

        const suggestionsRegex = /(?:\[SUGESTOES\]|\*\*Sugestões\*\*|### Sugestões|Sugestões:|Sugestões para o usuário:)\s*\n([\s\S]*)$/i;
        const match = aiResponseText.match(suggestionsRegex);
        if (match) {
          displayResponse = aiResponseText.replace(suggestionsRegex, '').trim();
          followups = match[1].trim().split('\n')
            .map(s => s.replace(/^[-*0-9.\s]+/, '').trim())
            .filter(s => s.length > 0)
            .slice(0, 3);
        }

        const botAvatarHTML = `<img src="oi.gif" class="bot-avatar" alt="AI"><span class="bot-name-tag">WSM 1.5 Flash</span>`;
        const botHeader = document.getElementById(`botHeader_${currentAgentId}`);
        if (botHeader) botHeader.innerHTML = botAvatarHTML;

        const slideMsgId = 'slide_' + Date.now();
        outputCard.id = slideMsgId;
        outputCard.setAttribute('data-raw-content', displayResponse);

        // Ações da mensagem (Copiar/Regenerar)
        const botActions = `<div class="message-actions"><button class="action-btn" onclick="copyMessageText('${slideMsgId}', this)" title="Copiar"><i data-lucide="copy"></i></button><button class="action-btn" onclick="regenerateAI()" title="Regenerar"><i data-lucide="refresh-cw"></i></button></div>`;
        outputContent.innerHTML = formatMarkdown(displayResponse);
        outputCard.insertAdjacentHTML('afterend', botActions);
        if (window.lucide) lucide.createIcons();

        // Substituir o bloco de código grande de reveal.js gerado por um botão para abrir no painel lateral
        const codeNode = outputContent.querySelector('pre code');
        if (codeNode) {
          const rawCode = codeNode.textContent;
          const lines = rawCode.split('\n').length;
          const preNode = codeNode.parentNode;

          const card = document.createElement('div');
          card.className = 'artifact-trigger-card';
          card.innerHTML = `
              <div class="artifact-card-icon"><i class="ti ti-presentation" style="color: var(--agent-purple, #9333ea)"></i></div>
              <div class="artifact-card-info">
                  <span class="title">Visualizar WSM 1.0 Agent Slide</span>
                  <span class="meta">Reveal.js Slides • ${lines} linhas</span>
              </div>
              <button class="artifact-card-btn">Abrir Prévia</button>
          `;

          card.addEventListener('click', () => {
              openArtifact(rawCode, 'slide');
          });

          preNode.parentNode.insertBefore(card, preNode);
          preNode.remove();

          // Abre automaticamente na primeira vez
          openArtifact(rawCode, 'slide');
        }

        if (researchFollowups && followups.length > 0) {
          followups.forEach(s => {
            const btn = document.createElement('button');
            btn.className = 'followup-pill';
            btn.textContent = s;
            btn.onclick = () => {
              const f = document.getElementById('inputField');
              if (f) { f.value = s; autoResize(f); f.focus(); }
            };
            researchFollowups.appendChild(btn);
          });
        }
      }

      setTimeout(scrollToBottom, 50);

    } catch (error) {
      clearInterval(timerInterval);
      const outputCard = document.getElementById(`outputCard_${currentAgentId}`);
      const outputContent = document.getElementById(`outputContent_${currentAgentId}`);
      if (outputCard && outputContent) {
        outputCard.style.display = 'block';
        outputContent.innerHTML = `❌ <strong>Erro no WSM 1.0 Agent Slide:</strong> ${error.message}`;
        outputCard.offsetHeight;
        outputCard.classList.add('visible');
      }
      scrollToBottom();
    }
  }

  // ========== SLIDES — TELA CHEIA, RENDERIZAÇÃO E PDF ==========

  // Visualizar slides em tela cheia (Reveal.js interativo) a partir do slide horizontal h e vertical v
  function openSlidesFullscreenAt(h, v) {
    const modal = document.getElementById('slidesFullscreenModal');
    const iframe = document.getElementById('slidesFullscreenIframe');
    if (modal && iframe) {
      // Injeta um script no iframe para capturar a tecla Escape e mensagens de navegação
      const initScript = `
        <script>
          window.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') {
              window.parent.postMessage('close-fullscreen-slides', '*');
            }
          });
          window.addEventListener('message', function(msgEvent) {
            if (typeof Reveal !== 'undefined') {
              if (msgEvent.data === 'reveal-next') {
                Reveal.next();
              } else if (msgEvent.data === 'reveal-prev') {
                Reveal.prev();
              }
            }
          });
          (function() {
            function initFullscreen() {
              if (typeof Reveal !== 'undefined') {
                if (Reveal.isReady()) {
                  Reveal.slide(${h}, ${v}, 0);
                  Reveal.configure({ keyboard: true, touch: true, controls: true, progress: true });
                } else {
                  Reveal.on('ready', () => {
                    Reveal.slide(${h}, ${v}, 0);
                    Reveal.configure({ keyboard: true, touch: true, controls: true, progress: true });
                  });
                }
              } else {
                setTimeout(initFullscreen, 50);
              }
            }
            initFullscreen();
          })();
        <\/script>
      `;
      let code = currentArtifactCode;
      // Disable hash and history to prevent replaceState SecurityError inside iframe srcdoc
      code = code.replace(/hash:\s*true/g, 'hash: false');
      code = code.replace(/history:\s*true/g, 'history: false');
      code = code.replace(/Reveal\.initialize\(\{/g, 'Reveal.initialize({ hash: false, history: false, ');
      if (code.includes('</body>')) {
        code = code.replace('</body>', initScript + '</body>');
      } else {
        code += initScript;
      }
      iframe.onload = function() {
        setTimeout(() => {
          iframe.focus();
          if (iframe.contentWindow) iframe.contentWindow.focus();
        }, 150);
      };
      iframe.srcdoc = code;
      modal.classList.add('active');
    }
  }

  function openSlidesFullscreen() {
    openSlidesFullscreenAt(0, 0);
  }

  function closeSlidesFullscreen() {
    const modal = document.getElementById('slidesFullscreenModal');
    const iframe = document.getElementById('slidesFullscreenIframe');
    if (modal) {
      modal.classList.remove('active');
    }
    if (iframe) {
      iframe.srcdoc = '';
    }
  }

  // Listener para sair do modo tela cheia quando o escape é pressionado (tanto no iframe quanto no pai)
  window.addEventListener('message', function(e) {
    if (e.data === 'close-fullscreen-slides') {
      closeSlidesFullscreen();
    }
  });

  window.addEventListener('keydown', function(e) {
    const modal = document.getElementById('slidesFullscreenModal');
    if (modal && modal.classList.contains('active')) {
      const iframe = document.getElementById('slidesFullscreenIframe');
      if (iframe && iframe.contentWindow) {
        if (e.key === 'Escape') {
          closeSlidesFullscreen();
        } else if (['ArrowRight', 'ArrowDown', ' ', 'PageDown'].includes(e.key)) {
          iframe.contentWindow.postMessage('reveal-next', '*');
          e.preventDefault();
        } else if (['ArrowLeft', 'ArrowUp', 'PageUp'].includes(e.key)) {
          iframe.contentWindow.postMessage('reveal-prev', '*');
          e.preventDefault();
        }
      }
    } else {
      if (e.key === 'Escape') {
        closeSlidesFullscreen();
      }
    }
  });

  // Extrai título amigável para o cabeçalho de cada slide
  function getSlideTitle(sectionElement, defaultNum) {
    const header = sectionElement.querySelector('h1, h2, h3, h4');
    if (header && header.textContent.trim()) {
      const text = header.textContent.trim();
      return text.length > 25 ? text.substring(0, 25) + '...' : text;
    }
    return `Slide ${defaultNum}`;
  }

  // Prepara o código HTML de um único slide para ser renderizado em seu próprio iframe
  function getSingleSlideHtml(htmlContent, h, v) {
    const customStyles = `
      <style>
        html, body {
          overflow: hidden !important;
          width: 100% !important;
          height: 100% !important;
          margin: 0 !important;
          padding: 0 !important;
          background: #0f0f10 !important;
        }
        .reveal {
          width: 100% !important;
          height: 100% !important;
        }
        /* Oculta controles, progresso e navegação nativa do Reveal na prévia */
        .reveal .controls,
        .reveal .progress,
        .reveal .slide-number,
        .reveal .playback {
          display: none !important;
        }
        /* Exibe todos os fragmentos escondidos na prévia */
        .reveal .slides section .fragment {
          opacity: 1 !important;
          visibility: visible !important;
          transform: none !important;
        }
.chart-container {
  width: 100%;
  max-width: 800px;
  margin: 16px auto;
}
</style>
    `;

    const customScript = `
      <script>
        (function() {
          function initPreview() {
            if (typeof Reveal !== 'undefined') {
              if (Reveal.isReady()) {
                Reveal.slide(${h}, ${v}, 0);
                Reveal.configure({
                  keyboard: false,
                  touch: false,
                  controls: false,
                  progress: false,
                  help: false,
                  overview: false
                });
                setTimeout(function() { Reveal.layout(); }, 100);
                setTimeout(function() { Reveal.layout(); }, 300);
              } else {
                Reveal.on('ready', () => {
                  Reveal.slide(${h}, ${v}, 0);
                  Reveal.configure({
                    keyboard: false,
                    touch: false,
                    controls: false,
                    progress: false,
                    help: false,
                    overview: false
                  });
                  setTimeout(function() { Reveal.layout(); }, 100);
                  setTimeout(function() { Reveal.layout(); }, 300);
                });
              }
            } else {
              setTimeout(initPreview, 50);
            }
          }
          initPreview();
          window.addEventListener('load', function() {
            setTimeout(function() { if (typeof Reveal !== 'undefined') Reveal.layout(); }, 500);
          });
        })();
      <\/script>
    `;

    let processed = htmlContent;
    // Disable hash and history to prevent replaceState SecurityError inside iframe srcdoc
    processed = processed.replace(/hash:\s*true/g, 'hash: false');
    processed = processed.replace(/history:\s*true/g, 'history: false');
    processed = processed.replace(/Reveal\.initialize\(\{/g, 'Reveal.initialize({ hash: false, history: false, ');
    if (processed.includes('</head>')) {
      processed = processed.replace('</head>', customStyles + '</head>');
    } else {
      processed = customStyles + processed;
    }

    if (processed.includes('</body>')) {
      processed = processed.replace('</body>', customScript + '</body>');
    } else {
      processed = processed + customScript;
    }

    return processed;
  }

  // Renderiza todos os slides empilhados (PDF style) usando múltiplos iframes isolados
  function renderSlidesPreview(htmlContent) {
    const container = document.getElementById('slidesPreviewContainer');
    if (!container) return;
    container.innerHTML = '';

    const parser = new DOMParser();
    const doc = parser.parseFromString(htmlContent, 'text/html');

    const slides = [];
    const topLevelSections = doc.querySelectorAll('.reveal .slides > section');
    if (topLevelSections.length > 0) {
      topLevelSections.forEach((sec, h) => {
        const nestedSections = sec.querySelectorAll('section');
        if (nestedSections.length === 0) {
          slides.push({ h, v: 0, title: getSlideTitle(sec, h + 1) });
        } else {
          nestedSections.forEach((subsec, v) => {
            slides.push({ h, v, title: getSlideTitle(subsec, `${h + 1}.${v + 1}`) });
          });
        }
      });
    } else {
      const allSections = doc.querySelectorAll('section');
      allSections.forEach((sec, idx) => {
        slides.push({ h: idx, v: 0, title: getSlideTitle(sec, idx + 1) });
      });
    }

    if (slides.length === 0) {
      container.innerHTML = '<div style="color: #a1a1aa; text-align: center; padding: 20px;">Nenhum slide encontrado para renderizar.</div>';
      return;
    }

    slides.forEach((slide, idx) => {
      const card = document.createElement('div');
      card.className = 'slide-card';
      card.style.marginBottom = '20px';

      const header = document.createElement('div');
      header.className = 'slide-card-header';
      header.textContent = `SLIDE ${idx + 1} - ${slide.title}`;
      card.appendChild(header);

      const iframe = document.createElement('iframe');
      iframe.style.width = '100%';
      iframe.style.height = '100%';
      iframe.style.border = 'none';
      iframe.style.background = '#0f0f10';
      iframe.style.display = 'block';
      iframe.style.pointerEvents = 'none'; // Evita que cliques entrem no iframe, permitindo que subam para o card

      iframe.srcdoc = getSingleSlideHtml(htmlContent, slide.h, slide.v);

      card.appendChild(iframe);

      // Clique no card abre fullscreen exatamente a partir deste slide
      card.onclick = function() {
        openSlidesFullscreenAt(slide.h, slide.v);
      };

      container.appendChild(card);
    });
  }

  function downloadSlidesAsPDF() {
    if (!currentArtifactCode) {
      showToast("Nenhum slide para exportar!", "error");
      return;
    }

    showToast("Preparando exportação de PDF...", "info");

    const parser = new DOMParser();
    const doc = parser.parseFromString(currentArtifactCode, 'text/html');

    // Container temporário para renderizar as páginas do PDF (posicionado atrás do app para ser visível ao html2canvas)
    const printContainer = document.createElement('div');
    printContainer.id = 'pdfPrintContainer';
    printContainer.style.position = 'fixed';
    printContainer.style.left = '0';
    printContainer.style.top = '0';
    printContainer.style.width = '1080px';
    printContainer.style.zIndex = '-9999';
    printContainer.style.background = '#0f0f10';
    document.body.appendChild(printContainer);

    // Copia todas as folhas de estilo do slide original
    doc.querySelectorAll('style, link[rel="stylesheet"]').forEach(tag => {
      printContainer.appendChild(tag.cloneNode(true));
    });

    // Adiciona o estilo customizado para o PDF
    const customPDFStyle = document.createElement('style');
    customPDFStyle.innerHTML = `
      @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400..900;1,400..900&family=Outfit:wght@100..900&family=Plus+Jakarta+Sans:ital,wght@0,200..800;1,200..800&display=swap');
      #pdfPrintContainer {
        display: block !important;
        opacity: 1 !important;
        visibility: visible !important;
      }
      #pdfPrintContainer style {
        display: none !important;
      }
      .pdf-page {
        color: #ffffff;
        font-family: "Outfit", "Inter", sans-serif;
        text-align: center;
        width: 1080px;
        height: 607.5px;
        position: relative;
        box-sizing: border-box;
        overflow: hidden;
        display: flex !important;
        flex-direction: column;
        justify-content: center;
        align-items: center;
        padding: 60px;
        page-break-after: always;
        background: #0f172a;
        opacity: 1 !important;
        visibility: visible !important;
      }
      .pdf-page * {
        opacity: 1 !important;
        visibility: visible !important;
      }
      .pdf-page .fragment {
        opacity: 1 !important;
        visibility: visible !important;
        transform: none !important;
      }
      .pdf-page h1, .pdf-page h2, .pdf-page h3 {
        margin-top: 0;
        font-weight: 700;
        line-height: 1.2;
        color: #ffffff;
      }
      .pdf-page h1 { font-size: 52px; margin-bottom: 24px; }
      .pdf-page h2 { font-size: 40px; margin-bottom: 20px; }
      .pdf-page h3 { font-size: 32px; margin-bottom: 16px; }
      .pdf-page p, .pdf-page li {
        font-size: 22px;
        line-height: 1.6;
        color: rgba(255, 255, 255, 0.9);
      }
      .pdf-page ul, .pdf-page ol {
        text-align: left;
        margin-top: 20px;
        display: inline-block;
      }
      .pdf-page .split-layout {
        display: grid !important;
        grid-template-columns: 1fr 1fr;
        gap: 30px;
        width: 100%;
        align-items: center;
        text-align: left;
      }
    `;
    printContainer.appendChild(customPDFStyle);

    // Mapeia todos os slides (incluindo verticais se houver)
    const flatSections = [];
    const topLevelSections = doc.querySelectorAll('.reveal .slides > section');
    if (topLevelSections.length > 0) {
      topLevelSections.forEach(sec => {
        const nested = sec.querySelectorAll('section');
        if (nested.length === 0) {
          flatSections.push(sec);
        } else {
          nested.forEach(subsec => {
            flatSections.push(subsec);
          });
        }
      });
    } else {
      doc.querySelectorAll('section').forEach(sec => {
        flatSections.push(sec);
      });
    }

    if (flatSections.length === 0) {
      showToast("Nenhum slide estruturado encontrado.", "error");
      printContainer.remove();
      return;
    }

    // Tenta extrair a cor ou imagem de fundo do próprio reveal
    let defaultBg = '';
    const revealSlides = doc.querySelector('.reveal');
    if (revealSlides && revealSlides.style.background) {
      defaultBg = revealSlides.style.background;
    }

    // Cria as páginas para o PDF
    flatSections.forEach(sec => {
      const page = document.createElement('div');
      page.className = 'pdf-page';

      // Aplica fundo
      if (sec.style.background) {
        page.style.background = sec.style.background;
      } else if (sec.style.backgroundImage) {
        page.style.backgroundImage = sec.style.backgroundImage;
      } else if (defaultBg) {
        page.style.background = defaultBg;
      }

      // Clona o conteúdo
      Array.from(sec.childNodes).forEach(child => {
        page.appendChild(child.cloneNode(true));
      });

      printContainer.appendChild(page);
    });

    const opt = {
      margin:       0,
      filename:     'apresentacao.pdf',
      image:        { type: 'jpeg', quality: 0.98 },
      html2canvas:  { scale: 2, useCORS: true, letterRendering: true },
      jsPDF:        { unit: 'px', format: [1080, 607.5], orientation: 'landscape' }
    };

    function startPDFGeneration() {
      html2pdf().set(opt).from(printContainer).save().then(() => {
        printContainer.remove();
        showToast("PDF baixado com sucesso!", "info");
      }).catch(err => {
        console.error("Erro ao gerar PDF:", err);
        printContainer.remove();
        showToast("Erro ao exportar PDF.");
      });
    }

    if (typeof html2pdf === 'undefined') {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js';
      script.onload = startPDFGeneration;
      script.onerror = () => {
        printContainer.remove();
        showToast("Erro ao carregar conversor PDF.");
      };
      document.head.appendChild(script);
    } else {
      startPDFGeneration();
    }
  }
