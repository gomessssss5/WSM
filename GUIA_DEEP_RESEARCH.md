# 🔍 Setup Deep Research com Tavily API

## O Que Foi Implementado

O **Agente Deep Research** agora funciona com o padrão **AI Agent em Loop** com 4 etapas:

1. **📋 Planejamento (Groq)** - Gera palavras-chave otimizadas
2. **🌐 Varredura Web (Tavily)** - Busca dados REAIS em tempo real
3. **📊 Análise (JavaScript)** - Renderiza fontes confiáveis
4. **🧠 Síntese (Groq)** - Sintetiza resposta final com dados reais

---

## 🚀 Como Ativar

### **PASSO 1: Criar Conta Tavily**

1. Vá para: https://tavily.com
2. Clique em **Sign Up**
3. Crie sua conta (free tier oferece 1.000 buscas/mês)
4. Na dashboard, copie sua **API Key**

### **PASSO 2: Adicionar na Vercel**

1. Vercel Dashboard → Seu Projeto **WSM** → **Settings**
2. **Environment Variables**
3. Clique em **Add**:
   - **Name:** `TAVILY_API_KEY`
   - **Value:** `tvly_...` (sua chave Tavily)
   - ✓ Production ✓ Development ✓ Preview
4. Clique em **Save**

### **PASSO 3: Fazer Commit e Deploy**

```bash
cd /workspaces/WSM
git add .
git commit -m "Implement Deep Research with Tavily"
git push origin main
```

Espera Vercel fazer build (~2 min).

### **PASSO 4: Redeploy (IMPORTANTE!)**

Na Vercel Dashboard:
1. **Deployments**
2. Clica nos 3 pontinhos (...) do deploy mais recente
3. Clica **Redeploy**
4. Espera terminar

---

## ✅ Testando

1. Abre seu app: `https://seu-projeto.vercel.app`
2. Clica no ícone 🌍 (Pesquisar) no topbar
3. Digite uma pergunta: `"Qual é a temperatura atual em São Paulo?"`
4. Clica em **Enviar**
5. Aguarda o fluxo de 4 etapas completar
6. Vê a resposta com dados REAIS da web!

---

## 🔍 Debug no Console (F12)

Procure por logs assim:

```
🔄 [DEEP RESEARCH] Iniciando agente em loop...
📋 [ETAPA 1] Gerando palavras-chave com Groq...
✅ [ETAPA 1] Palavras-chave: temperatura são paulo
🌐 [ETAPA 2] Buscando na web com Tavily...
✅ [ETAPA 2] Tavily retornou 5 resultados
📊 [ETAPA 3] Analisando fontes...
🧠 [ETAPA 4] Sintetizando resposta final...
✅ [ETAPA 4] Síntese concluída
✨ [DEEP RESEARCH] Fluxo completo concluído!
```

Se algo der errado, procure por `❌` nos logs.

---

## 📋 Variáveis Obrigatórias

Verifique que ambas estão na Vercel:

| Variável | Valor | Status |
|----------|-------|--------|
| `GROQ_API_KEY` | `gsk_...` | ✅ Necessária |
| `TAVILY_API_KEY` | `tvly_...` | ✅ Necessária |

Ambas DEVEM estar em **Production**, **Development** e **Preview**.

---

## 🎯 Como Funciona

```
┌─────────────────────────────────────────┐
│  Usuário: "Qual é o preço do Bitcoin?"  │
└──────────┬──────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────┐
│ ETAPA 1: Groq gera palavras-chave       │
│ Output: "bitcoin price current market"  │
└──────────┬──────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────┐
│ ETAPA 2: Tavily busca na web            │
│ Input: "bitcoin price current market"   │
│ Output: 5 artigos + preços REAIS        │
└──────────┬──────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────┐
│ ETAPA 3: JS renderiza fontes confiáveis │
│ Mostra: cards com título e domínio      │
└──────────┬──────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────┐
│ ETAPA 4: Groq sintetiza com dados reais │
│ Input: dados web + pergunta original     │
│ Output: resposta premium estruturada     │
└──────────┬──────────────────────────────┘
           │
           ▼
┌─────────────────────────────────────────┐
│ Usuário vê resposta final com fontes ✨ │
└─────────────────────────────────────────┘
```

---

## 🔒 Segurança

- ✅ Chaves guardadas apenas em Environment Variables
- ✅ Nenhuma chave exposta no frontend
- ✅ Requisições feitas via endpoint `/api/search`
- ✅ CORS configurado para aceitar requisições

---

## 🆘 Troubleshooting

### Erro: `TAVILY_API_KEY não configurada`
→ Verifique se adicionou em Settings → Environment Variables
→ Confirme que fez **Redeploy** após adicionar

### Erro: `Tavily API retornou erro`
→ Verifique se sua API Key está correta
→ Confirme que tem saldo de requisições no free tier

### Erro: `Timeout na síntese`
→ A resposta do Groq demorou muito
→ Tente novamente com pergunta mais simples

### Sem logs no console
→ Limpe cache: **Ctrl+Shift+Del → Limpar Tudo**
→ Recarregue a página (F5 ou Ctrl+R)

---

## 📊 Estrutura de Arquivos

```
/workspaces/WSM/
├── api/
│   ├── config.js      ← Endpoint que lê GROQ_API_KEY
│   └── search.js      ← Endpoint que lê TAVILY_API_KEY e busca
├── index.html         ← HTML com função executeDeepResearch()
├── vercel.json        ← Config da Vercel
├── package.json       ← Info do projeto
└── GUIA_DEEP_RESEARCH.md  ← Este arquivo
```

---

## ✨ Resultado Final

Quando tudo estiver configurado:

1. Modo Normal: Llama 3.1 8B responde com base no conhecimento treinado
2. Modo Pesquisa (🌍): Busca web REAL com Tavily + Síntese Groq
3. Modo Visão (📎): Análise de imagens com animações

**Agora é um app de IA completo!** 🚀
