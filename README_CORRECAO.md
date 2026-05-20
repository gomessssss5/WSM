# WSM Chat - Guia de Correção da API Groq

## 🎯 O Que Foi Corrigido?

O seu código HTML tinha um **bug na leitura da variável de ambiente `GROQ_API_KEY`** quando implantado na Vercel.

### ❌ Problema Original

```javascript
// ERRADO - não funciona no navegador:
if (!apiKey) {
  apiKey = typeof process !== 'undefined' && process.env ? process.env.GROQ_API_KEY : '';
}
```

**Por quê?** `process.env` é uma API do **Node.js**, não existe no navegador (frontend).

### ✅ Solução Implementada

Agora o código tenta obter a chave em **3 formas diferentes**:

```javascript
// 1. localStorage (salvo manualmente no modal)
let apiKey = localStorage.getItem('GROQ_API_KEY');

// 2. Variável global injetada (window.GROQ_API_KEY)
if (!apiKey && typeof window !== 'undefined' && window.GROQ_API_KEY) {
  apiKey = window.GROQ_API_KEY;
}

// 3. Fetch de um endpoint de API /api/config
if (!apiKey) {
  try {
    const response = await fetch('/api/config', { method: 'GET' });
    if (response.ok) {
      const data = await response.json();
      apiKey = data.groqApiKey;
    }
  } catch (err) {
    console.log("Endpoint /api/config não disponível");
  }
}
```

---

## 🚀 Como Usar Agora?

### Opção 1: Configurar Manualmente (Mais Fácil)

1. Abra seu app
2. Clique em ⚙️ **Configurações**
3. Cole sua chave Groq
4. Clique em **Salvar Chave**

✨ Pronto! A chave será salva no `localStorage`.

### Opção 2: Usar Variável de Ambiente da Vercel

Se quer que a chave **venha automaticamente** da Vercel:

1. Na Vercel Dashboard → **Settings** → **Environment Variables**
2. Adicione:
   ```
   NEXT_PUBLIC_GROQ_API_KEY = gsk_sua_chave
   ```
3. No seu `index.html`, **antes da tag `</body>`**, adicione:
   ```html
   <script>
     window.GROQ_API_KEY = process.env.NEXT_PUBLIC_GROQ_API_KEY || '';
   </script>
   ```
4. Deploy novamente

### Opção 3: Usar um Endpoint de API (Mais Seguro)

Se você tem um backend na Vercel:

1. Crie o arquivo `/api/config.js` (veja `api-config-example.js`)
2. Configure `GROQ_API_KEY` nas Environment Variables da Vercel
3. O HTML fará fetch automaticamente

---

## 📂 Arquivos Criados/Modificados

| Arquivo | Descrição |
|---------|-----------|
| `index.html` | ✏️ **Corrigido** - Lógica de obtenção da chave melhorada |
| `VERCEL_CONFIG.md` | 📖 Guia completo de configuração com Vercel |
| `api-config-example.js` | 📋 Exemplo de endpoint Node.js para Vercel |
| `README_CORREÇÃO.md` | Este arquivo |

---

## 🔧 Teste Localmente

Para testar antes de fazer deploy:

```bash
# 1. Abra o arquivo index.html no navegador
# 2. Clique em Configurações
# 3. Cole sua chave Groq
# 4. Envie uma mensagem
```

Se tudo funcionar, seu app está pronto para produção! ✨

---

## 💡 Próximos Passos

1. **Leia** `VERCEL_CONFIG.md` para entender melhor cada opção
2. **Escolha** qual método prefere usar (manual, variável global ou endpoint)
3. **Configure** conforme instruções
4. **Deploy** na Vercel: `vercel deploy --prod`
5. **Teste** no navegador

---

## ❓ Dúvidas Frequentes

**P: Minha chave não está sendo lida da Vercel**
> Verifique se você configurou a variável de ambiente corretamente. O nome exato deve ser `GROQ_API_KEY` ou `NEXT_PUBLIC_GROQ_API_KEY`.

**P: Posso usar localStorage em produção?**
> Sim, é seguro porque a chave é salva **localmente** apenas no seu navegador. Ninguém mais consegue acessá-la.

**P: Como renovar a chave se ela expirar?**
> Clique novamente em Configurações e salve a nova chave. Ou altere a variável na Vercel e faça deploy.

**P: Preciso de backend para isso funcionar?**
> Não! A Opção 1 (localStorage manual) funciona sem backend. Backend é opcional para mais segurança.

---

## ✅ Status

- [x] Bug corrigido
- [x] Suporte a 3 formas de obtenção de chave
- [x] Documentação criada
- [x] Exemplos prontos

Seu app agora está **pronto para produção** com a Vercel! 🎉
