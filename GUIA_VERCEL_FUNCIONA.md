# 🚀 GUIA DE EMERGÊNCIA - Fazendo a API Groq Funcionar na Vercel

## ⚠️ IMPORTANTE: Leia TUDO antes de fazer!

---

## 🎯 Pré-Requisitos

- [ ] Você tem uma chave Groq válida (formato: `gsk_...`)
- [ ] Seu projeto está no GitHub
- [ ] Seu projeto está conectado na Vercel

---

## 📋 PASSO A PASSO (OBRIGATÓRIO)

### **PASSO 1: Crie o arquivo de API (JÁ FEITO!)**

O arquivo `/api/config.js` já foi criado. Confirme se existe em:
```
/workspaces/WSM/api/config.js
```

Se NÃO existir, crie-o com este conteúdo:

```javascript
export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
  
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const groqApiKey = process.env.GROQ_API_KEY;

  if (!groqApiKey) {
    return res.status(400).json({ 
      error: 'GROQ_API_KEY não configurada',
      hint: 'Configure nas Environment Variables da Vercel'
    });
  }

  return res.status(200).json({ groqApiKey: groqApiKey });
}
```

### **PASSO 2: Fazer Deploy (CRUCIAL!)**

```bash
# Na pasta do seu projeto
git add .
git commit -m "Adicionar API config"
git push origin main
```

**A Vercel vai fazer deploy automaticamente.** Aguarde a build terminar (~1-2 minutos).

### **PASSO 3: Configurar Environment Variables na Vercel**

1. Vá para: **https://vercel.com/dashboard**
2. Clique no seu projeto **WSM**
3. Vá em **Settings** (engrenagem, canto superior)
4. Clique em **Environment Variables**
5. Clique em **Add**
6. Preencha:
   - **Name:** `GROQ_API_KEY`
   - **Value:** `gsk_sua_chave_aqui` (copie exatamente como recebeu)
   - **Environments:** Selecione ✓ Production ✓ Development ✓ Preview
7. Clique em **Add**
8. Clique em **Save**

### **PASSO 4: Fazer Redeploy (MUITO IMPORTANTE!)**

Após adicionar a variável, você PRECISA fazer redeploy:

1. Na Vercel, vá em **Deployments**
2. Clique nos 3 pontinhos (...) do deploy mais recente
3. Clique em **Redeploy**
4. Aguarde terminar

**OU** faça:
```bash
git commit --allow-empty -m "Redeploy com GROQ_API_KEY"
git push
```

### **PASSO 5: Testar**

1. Vá para seu app: `https://seu-projeto.vercel.app`
2. Abra **DevTools (F12 ou Ctrl+Shift+I)**
3. Vá em **Console**
4. Envie uma mensagem
5. Procure por logs verdes ✅:
   ```
   ✅ [DEBUG] Chave encontrada em /api/config
   📡 Resposta da Groq: Status 200
   ✅ Resposta recebida com sucesso
   ```

---

## 🔴 Se Ainda NÃO Funcionar

### Checklist de Troubleshooting

#### 1️⃣ Verificar se `/api/config.js` existe

```bash
ls -la api/config.js
```

Deve existir! Se não, crie.

#### 2️⃣ Verificar se a chave está na Vercel

Na Vercel Dashboard → Settings → Environment Variables → procure `GROQ_API_KEY`

Deve estar lá com o valor `gsk_...`

#### 3️⃣ Verificar se fez redeploy

Na Vercel Dashboard → Deployments → o deploy DEPOIS que adicionou a variável deve estar lá.

Se o deploy tem timestamp anterior à adição da variável, **NÃO FOI REDEPLOYADO!** Clique em **Redeploy**.

#### 4️⃣ Checar logs da API

Na Vercel Dashboard → seu projeto → Deployments → clique no deploy recente → **Logs**

Procure por:
- ✅ `GROQ_API_KEY lida com sucesso`
- ❌ `GROQ_API_KEY não configurada`

#### 5️⃣ Testar a API diretamente

Abra em uma aba nova:
```
https://seu-projeto.vercel.app/api/config
```

Deve retornar algo assim:
```json
{
  "groqApiKey": "gsk_...",
  "message": "Chave carregada com sucesso"
}
```

Se retornar erro ou fizer download do arquivo, o arquivo `/api/config.js` não está correto.

#### 6️⃣ Limpar cache do navegador

```
Ctrl+Shift+Del → Limpar tudo → Todos os tempos → Limpar dados de navegação
```

Depois recarregue o site.

---

## 💡 Forma Alternativa (Se ainda não funcionar)

Se a API não funciona, use **localStorage** enquanto debuga:

1. Abra seu app: `https://seu-projeto.vercel.app`
2. Clique em **⚙️ Configurações**
3. Cole sua chave `gsk_...`
4. Clique em **Salvar Chave**
5. Funciona normalmente ✅

Isso salva a chave **apenas no seu navegador** e funciona sem dependências.

---

## 📊 Status de Verificação

Faça um check aqui:

- [ ] Arquivo `/api/config.js` existe
- [ ] Git push foi feito (`git push origin main`)
- [ ] Vercel fez build automaticamente
- [ ] Variável `GROQ_API_KEY` está em Settings → Environment Variables
- [ ] Redeploy foi acionado APÓS adicionar a variável
- [ ] Console.log mostra `✅ [DEBUG] Chave carregada de /api/config`
- [ ] Teste em `/api/config` retorna JSON com a chave

---

## 🆘 Último Recurso

Se nada funcionar, faça isso em ordem:

1. Abra uma issue com o log completo (F12 Console)
2. Confirme que fez todos os passos acima
3. Tente limpar cache
4. Faça outro commit e push

---

## ✨ Resumo Rápido

```bash
# 1. Arquivo existe? Sim ✅
# 2. Git push
git add . && git commit -m "Fix: API Config" && git push

# 3. Espera Vercel fazer build (2-3 min)
# 4. Vercel Dashboard: Settings → Environment Variables
#    Adiciona: GROQ_API_KEY = gsk_sua_chave
# 5. Clica em Redeploy
# 6. Espera 2-3 min
# 7. Testa no console com F12
```

**Pronto!** Deve funcionar agora! 🎉
