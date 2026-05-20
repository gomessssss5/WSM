# WSM AI 1.0 - Setup Completo

> **Status:** ✅ Deep Research com Tavily implementado!

---

## 🎯 3 Modos de Funcionamento

| Modo | Ativação | O Que Faz |
|------|----------|----------|
| **💬 Chat Normal** | Padrão (nenhum botão pressionado) | Llama 3.1 8B com histórico de contexto |
| **🔍 Deep Research** | Clica em 🌍 no topbar | Busca web REAL com Tavily + Síntese Groq |
| **📸 Visão** | Anexa imagens (📎) | Análise visual com animações |

---

## 🚀 Setup em 5 Minutos

### 1️⃣ GROQ_API_KEY (Já Feito?)

Se ainda NÃO configurou:

```bash
# Na Vercel Dashboard:
Settings → Environment Variables
Add:
  Name: GROQ_API_KEY
  Value: gsk_seu_valor_aqui
  ✓ Production ✓ Development ✓ Preview
```

### 2️⃣ TAVILY_API_KEY (NOVO!)

```bash
# 1. Crie conta: https://tavily.com
# 2. Copie a API Key
# 3. Na Vercel Dashboard:
Settings → Environment Variables
Add:
  Name: TAVILY_API_KEY
  Value: tvly_seu_valor_aqui
  ✓ Production ✓ Development ✓ Preview
```

### 3️⃣ Commit e Deploy

```bash
git add .
git commit -m "Add Deep Research"
git push origin main
```

### 4️⃣ Redeploy

Na Vercel → Deployments → Redeploy do último deploy

### 5️⃣ Teste!

```
1. Abre: https://seu-projeto.vercel.app
2. Clica 🌍 (ativa pesquisa)
3. Digita: "temperatura em São Paulo"
4. Vê resultados reais da web! ✨
```

---

## 📂 Arquivos Importantes

| Arquivo | O Que Faz |
|---------|-----------|
| `/api/config.js` | Endpoint que serve GROQ_API_KEY |
| `/api/search.js` | **NOVO!** Endpoint que integra Tavily |
| `index.html` | App com 3 modos funcionando |
| `GUIA_DEEP_RESEARCH.md` | Documentação detalhada |

---

## 🔍 Testando

**Console (F12):**

Procure por:
- ✅ `[DEEP RESEARCH] Iniciando agente em loop...`
- ✅ `[ETAPA 1]`, `[ETAPA 2]`, `[ETAPA 3]`, `[ETAPA 4]`
- ✅ `Fluxo completo concluído!`

Se der erro, procure por `❌` e note o erro.

---

## 🆘 Rápido Troubleshooting

| Problema | Solução |
|----------|---------|
| "TAVILY_API_KEY não encontrada" | Verifique em Settings → Environment Variables |
| Redeploy não funcionou | Vercel leva 2-3 min, espere e recarregue |
| API retorna erro | Confirme que a chave está correta |
| Nada aparece | Limpe cache (Ctrl+Shift+Del) e recarregue |

---

## 📝 Arquitetura

```
User Request
    ↓
Button 🌍 (searchMode = true)
    ↓
sendMessage() → executeDeepResearch(text)
    ↓
ETAPA 1: Groq → gera palavras-chave
    ↓
ETAPA 2: /api/search → Tavily busca web
    ↓
ETAPA 3: JavaScript → renderiza fontes
    ↓
ETAPA 4: Groq → sintetiza com dados reais
    ↓
Usuário vê resposta premium com fontes ✨
```

---

## ✨ Features

- ✅ Chat com Llama 3.1 8B (Groq)
- ✅ Busca web em tempo real (Tavily)
- ✅ Análise de imagens com animações
- ✅ Design premium com animações suaves
- ✅ Dark mode / Light mode
- ✅ Logs de debug completos
- ✅ Todas as chaves guardadas em Environment Variables

---

## 📖 Documentação Completa

Leia os guias em ordem:

1. `GUIA_VERCEL_FUNCIONA.md` - Setup inicial Groq
2. `GUIA_DEEP_RESEARCH.md` - Setup Tavily (novo!)
3. `index.html` - Código comentado

---

## 🎉 Pronto!

Seu app agora tem:
- 💬 Chat inteligente
- 🔍 Pesquisa web em tempo real
- 📸 Análise de imagens
- ✨ Interface premium

**Bora testar? Clica 🌍 e escreve uma pergunta!** 🚀
