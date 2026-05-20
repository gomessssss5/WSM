# Configuração da API Groq com Vercel

## 🎯 Como Ler GROQ_API_KEY da Vercel

Existem **3 formas** para o seu app HTML acessar a `GROQ_API_KEY` da Vercel:

---

## ✅ Opção 1: Salvar Manualmente (Mais Fácil)

1. **Abra o aplicativo** no navegador
2. Clique em **⚙️ Configurações** (canto inferior esquerdo)
3. Cole sua chave Groq (formato: `gsk_...`)
4. Clique em **Salvar Chave**
5. A chave será **salva no localStorage** do navegador

✨ **Pronto!** Funciona offline e é persistente.

---

## ✅ Opção 2: Variável Global Injetada (Recomendado para Vercel)

Se você quer que a chave **venha automaticamente da Vercel**, crie um **script que a injete globalmente**:

### No seu `index.html`, **antes** da tag `</body>`, adicione:

```html
<script>
  // Injeta a chave como variável global se estiver em ambiente Vercel
  if (typeof window !== 'undefined') {
    window.GROQ_API_KEY = process.env.NEXT_PUBLIC_GROQ_API_KEY || 
                          process.env.VITE_GROQ_API_KEY || 
                          process.env.GROQ_API_KEY || '';
  }
</script>
```

### Depois, **na Vercel Dashboard**:

1. Vá para seu **Projeto** → **Settings** → **Environment Variables**
2. Adicione uma nova variável:
   - **Name:** `NEXT_PUBLIC_GROQ_API_KEY` (ou `VITE_GROQ_API_KEY`)
   - **Value:** `gsk_sua_chave_aqui`
3. Clique em **Save**
4. **Redeploy** seu projeto

Agora a chave será **injetada automaticamente** no `window` quando a página carrega.

---

## ✅ Opção 3: API Endpoint (Mais Seguro para Produção)

Se você tem um **backend ou API** na Vercel (Node.js, Python, etc.), crie um endpoint que retorna a chave:

### Criar arquivo `/api/config.js` (Node.js):

```javascript
export default function handler(req, res) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  res.status(200).json({
    groqApiKey: process.env.GROQ_API_KEY || ''
  });
}
```

### Ou `/api/config.py` (Python):

```python
def handler(request):
    import os
    return {
        'groqApiKey': os.getenv('GROQ_API_KEY', '')
    }, 200
```

O código HTML já faz fetch automaticamente para `/api/config` se não encontrar a chave.

---

## 🔒 Segurança

⚠️ **NUNCA exponha sua chave no código público!**

- ✅ Use **variáveis de ambiente** (Environment Variables)
- ✅ Use **localStorage** só para desenvolvimento local
- ✅ Use **API endpoints** para produção (Opção 3)
- ❌ Não comente a chave no código
- ❌ Não commite `.env` com a chave real

---

## 🐛 Testando Localmente

Para testar localmente com `GROQ_API_KEY`:

### Opção 1: Variável de Ambiente Local

```bash
# Linux/Mac
export GROQ_API_KEY="sua_chave_aqui"

# Windows PowerShell
$env:GROQ_API_KEY="sua_chave_aqui"

# Windows CMD
set GROQ_API_KEY=sua_chave_aqui
```

Depois injete um script que leia dela (se usando Node):

```html
<script>
  fetch('/api/config').then(r => r.json()).then(d => {
    window.GROQ_API_KEY = d.groqApiKey;
  });
</script>
```

### Opção 2: Arquivo `.env.local` (se usar build system)

```
VITE_GROQ_API_KEY=gsk_sua_chave_aqui
```

---

## 📝 Resumo: Ordem de Prioridade

O código agora procura a chave nesta ordem:

1. **localStorage** (salvo manualmente no modal)
2. **window.GROQ_API_KEY** (injetado via script)
3. **Fetch /api/config** (endpoint de backend)
4. Se nada encontrar → Pede ao usuário para configurar manualmente

---

## ✨ Resultado Final

Depois de configurar, quando enviar uma mensagem, o app:
1. Procura a chave nos 3 lugares
2. Usa a chave para chamar a **API Groq**
3. Recebe resposta do **Llama 3.1 8B**
4. Mostra a resposta no chat

Pronto! 🚀
