# CAA · Comunicação Aumentativa e Alternativa para Autistas

Plataforma web gratuita de **Comunicação Aumentativa e Alternativa (CAA)** com figuras **PECS/PCS**, voz e construção progressiva de frases. Feita para pessoas autistas com fala reduzida, ecolalia ou ausência de fala, e para as famílias e profissionais que as acompanham.

> Trabalho de Conclusão de Curso · Ensino Médio Integrado ao Técnico em Informática para Internet (MTec) · Etec · 2026
> **Autores:** Giovanna Caroline Ferreira Vieira, Gustavo Henrique Zamparo Vieira, Gustavo Sanches Alves, Isadora Luana Fornarolli e Maria Clara Aquino
> **Orientador:** Prof. Dr. Carlos Alberto Diniz

🌐 **Site no ar:** https://comunicaa.vercel.app

---

## O que o CAA faz

| Tela | Para que serve |
|---|---|
| **Entrar / Criar conta** | Login com **Google** (botão oficial do Google) ou com **e-mail e senha** (Supabase Auth). |
| **Casa (prancha)** | Tocar nas figuras monta a frase; **Falar** lê em voz alta; **Salvar** guarda no banco. Tem atalhos "Preciso dizer" (Não, Me ajuda, Pausa, Ir no banheiro), busca, categorias e Modo Foco. |
| **Tabelas** | Todas as categorias do banco (assuntos e cores das palavras) e a tabela pessoal **"Minhas figuras"** (as figuras mais usadas pela própria pessoa). Tocar abre a prancha filtrada. |
| **Dicionário** | Progresso: frases salvas, dias seguidos, média de figuras por frase, figuras diferentes, gráfico da semana, tipos de frase, figuras mais usadas e histórico com "Ouvir" e "Apagar". |

## Tecnologias

- **HTML, CSS e JavaScript puros**: sem framework, para a equipe conseguir ler tudo.
- **Supabase**: banco PostgreSQL, login (Google e e-mail/senha) e segurança por linha (RLS).
- **Vercel**: hospedagem do site.
- **Web Speech API**: voz do próprio navegador, escolhendo automaticamente a voz mais natural do aparelho.
- Bootstrap Icons (ícones), fonte Nunito e supabase-js ficam **dentro do projeto** (`public/assets/vendor`).

## Banco de dados = exatamente o DER

As 7 tabelas do DER oficial do grupo (`docs/DER` no Drive):

```
usuario ──< cria >── frase ──< contem >── palavras_pecs ──< tem >── categoria
```

| Tabela | Colunas |
|---|---|
| `usuario` | id_usuario (PK), perfil, email, senha*, data_nasc, nome_completo |
| `frase` | id_frase (PK), data_criacao, tipo_frase |
| `categoria` | id_categoria (PK), nome_categoria, desc_categoria |
| `palavras_pecs` | id_palavra (PK), txt_palavra, imagem_pecs |
| `cria` | id_usuario (FK), id_frase (FK), data_frase, qtd_palavras |
| `contem` | id_frase (FK), id_palavra (FK) |
| `tem` | id_categoria (FK), id_palavra (FK), data_criacao |

\* `senha` fica sempre vazia: a senha real é guardada **criptografada** pelo Supabase Auth.

Os arquivos SQL estão em [`supabase/migrations`](supabase/migrations):
1. `..._tabelas_do_der.sql`: cria as 7 tabelas.
2. `..._seguranca_rls.sql`: regras de segurança (RLS) e as funções `salvar_frase` e `minhas_frases`.
3. `..._catalogo_pecs.sql`: 64 categorias, 1.103 figuras e 2.230 ligações (gerado por `supabase/gerar-catalogo.mjs`).

## Estrutura de pastas

```
comunicaa/
├── public/                 ← o site (é isso que a Vercel publica)
│   ├── index.html          ← Casa (prancha de comunicação)
│   ├── tabelas.html        ← Tabelas (categorias)
│   ├── dicionario.html     ← Dicionário (progresso e histórico)
│   ├── login.html          ← Entrar
│   ├── cadastro.html       ← Criar conta / completar cadastro
│   ├── creditos.html       ← Créditos
│   └── assets/
│       ├── css/estilo.css  ← visual (Apple + Duolingo)
│       ├── js/             ← comportamento (um arquivo por assunto)
│       ├── pcs/            ← 1.103 figuras PCS
│       └── vendor/         ← bibliotecas de terceiros
├── supabase/               ← banco de dados (SQL + gerador do catálogo)
├── scripts/gerar-config.mjs← cria o config.js a partir das variáveis de ambiente
├── docs/                   ← documentação para a equipe
├── vercel.json             ← configuração da hospedagem + cabeçalhos de segurança
└── .gitignore              ← o que NUNCA vai para o GitHub
```

📘 **Explicação de cada arquivo, em linguagem simples:** [`docs/DOCUMENTACAO-DO-CODIGO.md`](docs/DOCUMENTACAO-DO-CODIGO.md)
🔑 **Como ativar o login com Google:** [`docs/GUIA-LOGIN-GOOGLE.md`](docs/GUIA-LOGIN-GOOGLE.md)

## Rodar no computador

Precisa só do [Node.js](https://nodejs.org) 18 ou mais novo.

```bash
# 1. Copie o modelo de variáveis e preencha com os dados do Supabase
cp .env.example .env

# 2. Gere o config.js e abra o site em http://localhost:5500
npm run dev
```

## Segurança (resumo)

- **RLS ligado nas 7 tabelas**: cada pessoa só vê e apaga as próprias frases; o catálogo é somente leitura; visitantes sem login não acessam nada.
- **Senhas** ficam só no Supabase Auth (bcrypt). O código nunca guarda nem mostra senhas.
- **Nenhuma chave no código**: o endereço e a chave **pública** do Supabase vêm de variáveis de ambiente (`.env` / Vercel). A chave secreta nunca é usada no site.
- **Cabeçalhos de segurança** na Vercel: Content-Security-Policy, HSTS, X-Frame-Options, entre outros.
- Textos digitados são mostrados com `textContent` (nunca `innerHTML`), o que evita injeção de código (XSS).

## Direitos das figuras

Figuras PCS/Boardmaker © Tobii Dynavox, a partir do flipbook de Fabiani M. Eggers e Renata Bonotto (adaptação: Associação Comunicatea). Uso acadêmico e sem fins lucrativos. Veja a página **Créditos** no site.

> Projeto acadêmico, sem validação clínica. A adaptação para cada pessoa deve ser orientada por profissionais.
