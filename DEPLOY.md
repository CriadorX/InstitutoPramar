# Guia de Deploy e Atualização - Instituto Pramar

Este guia detalha como configurar e manter seu projeto no ar usando Vercel e GitHub.

## 1. Configuração Inicial na Vercel (Variáveis de Ambiente)
Se você ver a tela "**Configuração Pendente**" (Fundo branco com alerta vermelho), significa que o site não conseguiu conectar ao banco de dados Supabase. Siga estes passos:

1. Acesse o painel do seu projeto na **Vercel**.
2. Vá em **Settings** > **Environment Variables**.
3. Adicione as seguintes chaves (copie exatamente como estão):

| Key (Nome da Chave) | Value (Valor) |
| :--- | :--- |
| `VITE_SUPABASE_URL` | `https://jrahvykjegstbevkcziv.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | `(Sua chave longa do Supabase - começa com eyJ...)` |

4. (Opcional) Adicione também a chave da IA se quiser usar o chat:
   - `GEMINI_API_KEY`: `AIzaSyBFTHYWxjqNjmfcy1hRwtbqelSFAqkmVaw`

5. Após adicionar, vá na aba **Deployments** e clique em **Redeploy** (ou faça uma nova alteração no código) para que as mudanças e façam efeito.

---

## 2. Como Atualizar o Site
Sempre que você quiser enviar novas alterações para o ar:

1. No seu computador, abra a pasta do projeto.
2. Dê dois cliques no arquivo **`save_progress.bat`**.
3. Digite uma mensagem explicando o que mudou (ou apenas dê Enter para usar a automática).
4. Aguarde a mensagem verde **"Sync Complete!"**.

Isso enviará o código para o GitHub, e a Vercel detectará e atualizará o site automaticamente em 1-2 minutos.

---

## 3. Resolução de Problemas Comuns
*   **Tela Branca:** Verifique se as variáveis de ambiente na Vercel não têm espaços extras antes ou depois.
*   **Erro de Build:** Se o deploy falhar na Vercel, clique em "View Build Logs" para ver o erro (geralmente é algo no código TypeScript).
