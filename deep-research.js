/* ==========================================================================
   WSM AI — deep-research.js
   Agente de Deep Research (acionado pelo botão "Pesquisar" e pelo token
   {web: ...} retornado pelo modelo). Carregado após o index.html.
   ========================================================================== */

  // ========== HELPERS DE PASSOS / ANIMAÇÃO ==========

  function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

  function setStepActive(num, agentId) {
    const step = document.getElementById(`step${num}_${agentId}`);
    if (step) step.className = "step active";
  }

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

  // ========== PAINEL DE FONTES ==========

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

    if (typeof window._deepResearchCount !== 'number') window._deepResearchCount = 0;
    const currentAgentId = ++window._deepResearchCount;
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
        if (!planData.choices || !Array.isArray(planData.choices) || planData.choices.length === 0) {
          const errMsg = planData.error?.message || JSON.stringify(planData).substring(0, 300);
          throw new Error(`Resposta vazia/inválida do planejador: ${errMsg}`);
        }
        const planContent = planData.choices[0].message?.content;
        if (!planContent) throw new Error('Planejador retornou resposta sem conteúdo.');
        searchKeywords = planContent.trim();
        if (!searchKeywords) throw new Error('Planejador retornou palavras-chave vazias.');
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
        let detail = '';
        try {
          const errBody = await searchResponse.json();
          detail = errBody.error || errBody.details?.error?.message || errBody.hint || JSON.stringify(errBody).substring(0, 300);
        } catch (e) {
          detail = `HTTP ${searchResponse.status}`;
        }
        throw new Error(`Tavily API: ${detail}`);
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
                  if (j.choices && Array.isArray(j.choices) && j.choices.length > 0 && j.choices[0].message?.content) {
                    visionAnalysis = j.choices[0].message.content;
                    break;
                  } else {
                    lastVisionErr = j.error?.message || 'Resposta sem choices';
                  }
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
          sourcesFooter.style.display = 'none';
        }

          const tavilyBox = document.getElementById(`tavilyImages_${currentAgentId}`);
          if (tavilyBox) {
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

      if (!synthesisResponse.ok) {
        const errBody = await synthesisResponse.json().catch(() => ({}));
        const detail = errBody.error?.message || `HTTP ${synthesisResponse.status}`;
        throw new Error(`Erro ao sintetizar resposta final: ${detail}`);
      }
      const synthesisData = await synthesisResponse.json();
      if (!synthesisData.choices || !Array.isArray(synthesisData.choices) || synthesisData.choices.length === 0) {
        const errMsg = synthesisData.error?.message || JSON.stringify(synthesisData).substring(0, 300);
        throw new Error(`Resposta vazia/inválida do modelo: ${errMsg}`);
      }
      const finalResponse = synthesisData.choices[0].message?.content;
      if (!finalResponse) throw new Error('Modelo retornou resposta sem conteúdo.');

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

          console.log("Research Display raw:", researchDisplay);
          let paragraphs = researchDisplay.split(/\n\n+/);
let formattedParagraphs = paragraphs.map(p => {
               let contentWithPlaceholders = p.replace(/\[\s*(?:fonte:?\s*)?(\d+|[^\]]+)\s*\]/gi, '@@CIT_$1@@');
               console.log("Paragraph processed:", contentWithPlaceholders);
               let htmlContent = formatMarkdown(contentWithPlaceholders);

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
               }).join('\n\n');
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
