# Guia: ativar o "Continuar com Google" no CAA

Tempo: uns 10 minutos. Você só precisa de uma conta Google e do acesso ao painel do Supabase.

**Resumo:** o Google precisa de uma "chave" que diga *"este site pode pedir o login das pessoas"*. Você cria essa chave no Google Cloud (passos 1 a 4) e cola no Supabase (passo 5). É como cadastrar a portaria do prédio numa central de crachás.

Dados do nosso projeto (vamos usar logo abaixo):

| O quê | Valor |
|---|---|
| Site (Vercel) | `https://comunicaa.vercel.app` |
| Site local (testes no PC) | `http://localhost:5500` |
| **URL de retorno do Google (callback)** | `https://xpjiqtyumspnfkpqcrlh.supabase.co/auth/v1/callback` |

---

## 1. Criar um projeto no Google Cloud

1. Acesse **https://console.cloud.google.com/** e entre com a conta Google do grupo.
2. No topo, clique no seletor de projetos, depois em **Novo projeto**.
3. Nome: `CAA TCC`. Clique em **Criar** e depois selecione esse projeto no topo.

## 2. Configurar a tela de consentimento (o que aparece quando alguém clica em "Continuar com Google")

1. Menu ☰, depois **APIs e serviços**, depois **Tela de consentimento OAuth** (em inglês: *Google Auth Platform → Branding*).
2. Se pedir, clique em **Começar / Get started**.
3. Preencha:
   - **Nome do app:** `CAA - Comunicação Alternativa`
   - **E-mail de suporte:** o e-mail do grupo
   - **Público / Audience:** **Externo (External)**
   - **E-mail de contato do desenvolvedor:** o e-mail do grupo
4. Salve e continue até o fim (não precisa adicionar escopos: e-mail e perfil já vêm por padrão).
5. Em **Público / Audience**, clique em **Publicar app / Publish app** e confirme.
   *Sem publicar, só os e-mails cadastrados como "usuários de teste" conseguem entrar.* Como usamos só e-mail e nome, o Google não exige verificação.

## 3. Criar a credencial (a "chave")

1. Menu ☰, depois **APIs e serviços**, depois **Credenciais** (ou *Google Auth Platform → Clients*).
2. **+ Criar credenciais**, depois **ID do cliente OAuth**.
3. **Tipo de aplicativo:** **Aplicativo da Web**. Nome: `CAA Web`.
4. **Origens JavaScript autorizadas**: clique em *Adicionar URI* duas vezes:
   - `https://comunicaa.vercel.app`
   - `http://localhost:5500`
5. **URIs de redirecionamento autorizados**: adicione **exatamente**:
   - `https://xpjiqtyumspnfkpqcrlh.supabase.co/auth/v1/callback`
6. Clique em **Criar**.

## 4. Copiar o ID e a chave secreta

Vai aparecer uma janela com:
- **ID do cliente** (termina com `.apps.googleusercontent.com`)
- **Chave secreta do cliente** (começa com `GOCSPX-`)

Copie os dois. ⚠️ A chave secreta é **segredo**: não mande em grupo de WhatsApp, não coloque no código nem no GitHub.

## 5. Colar no Supabase

1. Acesse **https://supabase.com/dashboard/project/xpjiqtyumspnfkpqcrlh/auth/providers**.
2. Clique em **Google** e ligue a chave **Enable Sign in with Google**.
3. Cole o **Client ID** e o **Client Secret**.
4. Confira se o **Callback URL** mostrado é `https://xpjiqtyumspnfkpqcrlh.supabase.co/auth/v1/callback` (o mesmo do passo 3).
5. Clique em **Save**.

Pronto! Abra `https://comunicaa.vercel.app` e toque em **Continuar com Google**. 🎉

---

## Se der erro

| Mensagem | O que fazer |
|---|---|
| `redirect_uri_mismatch` | A URL do passo 3.5 está diferente. Copie de novo do painel do Supabase (Google → Callback URL). |
| "O login com Google ainda não foi ativado" | Faltou ligar o Google e salvar no passo 5. |
| "Acesso bloqueado: app não verificado / só testadores" | Faltou **Publicar app** no passo 2.5. |
| Volta para o login sem entrar | Veja se o endereço do site está em Supabase → Authentication → URL Configuration (já deixamos configurado: `https://comunicaa.vercel.app/**`). |

## Login com e-mail e senha (já funciona)

- Ao criar conta com e-mail, o Supabase manda um **link de confirmação**. Só depois de clicar no link a pessoa consegue entrar (proteção contra alguém usar o e-mail de outra pessoa).
- O servidor de e-mail gratuito do Supabase envia **poucos e-mails por hora** (limite do plano grátis). Para a apresentação, prefira o **login com Google**. Se precisarem de muitos cadastros por e-mail, dá para ligar um SMTP próprio (Gmail, Brevo, Resend) em *Authentication → Emails → SMTP Settings*.
