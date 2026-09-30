# Documentação do código do CAA

> Para quem **não programa** entender **tudo** o que o código faz e conseguir responder à banca.
> Cada parte tem uma explicação simples e uma **parábola** (comparação com o dia a dia).
> Os próprios arquivos também têm comentários em português, linha a linha, nas partes importantes.

---

## Sumário

1. [A ideia geral em 1 minuto](#1-a-ideia-geral-em-1-minuto)
2. [Conceitos básicos (com parábolas)](#2-conceitos-básicos-com-parábolas)
3. [A viagem de uma frase: do toque até o banco](#3-a-viagem-de-uma-frase-do-toque-até-o-banco)
4. [Banco de dados (Supabase / PostgreSQL)](#4-banco-de-dados-supabase--postgresql)
5. [Segurança: RLS, login e senhas](#5-segurança-rls-login-e-senhas)
6. [As páginas HTML](#6-as-páginas-html)
7. [Os arquivos JavaScript, um por um](#7-os-arquivos-javascript-um-por-um)
8. [O visual (estilo.css)](#8-o-visual-estilocss)
9. [Configuração, publicação e GitHub](#9-configuração-publicação-e-github)
10. [Perguntas que a banca pode fazer (e as respostas)](#10-perguntas-que-a-banca-pode-fazer-e-as-respostas)
11. [Glossário rápido](#11-glossário-rápido)

---

## 1. A ideia geral em 1 minuto

```
 [ Celular / Computador ]                 [ Vercel ]                  [ Supabase ]
   navegador da pessoa   ── pede o site ──►  guarda os arquivos   
         (HTML, CSS, JS) ◄── entrega ──────  do site (public/)
         
   navegador da pessoa   ── login, figuras, frases ──────────────────►  Auth + Banco
                         ◄── respostas (só os dados permitidos) ──────  PostgreSQL + RLS
```

- **Vercel** = a *vitrine*: entrega as páginas do site para quem acessa `comunicaa.vercel.app`.
- **Supabase** = o *cofre*: guarda contas (login) e os dados (figuras, frases), e confere quem pode ver o quê.
- **Navegador** = onde tudo acontece para a pessoa: ela toca nas figuras, ouve a voz e salva as frases.

**Parábola:** o CAA é uma **papelaria**. A Vercel é a **loja** (as prateleiras com as páginas). O Supabase é o **depósito com cofre** nos fundos. O navegador é o **cliente** que entra na loja, pede coisas e leva para casa. O funcionário do depósito (RLS) só entrega para cada cliente as coisas **dele**.

---

## 2. Conceitos básicos (com parábolas)

| Termo | O que é | Parábola |
|---|---|---|
| **HTML** | Diz *o que existe* na tela: botões, textos, imagens. | O **esqueleto** do corpo. |
| **CSS** | Diz *como fica bonito*: cores, tamanhos, espaços. | A **roupa**. |
| **JavaScript (JS)** | Diz *o que acontece* quando tocamos: falar, salvar, buscar. | O **cérebro**. |
| **Front-end** | Tudo que roda no navegador (HTML, CSS, JS). | O **salão do restaurante**. |
| **Back-end** | O que roda no servidor (banco, login). Aqui é o Supabase. | A **cozinha**. |
| **Banco de dados** | Onde as informações ficam guardadas de forma organizada, em tabelas. | Um **armário com gavetas etiquetadas**. |
| **Tabela** | Uma "planilha" do banco, com colunas fixas. | Uma **gaveta**. |
| **Linha (registro)** | Um item da tabela (ex.: uma frase). | Uma **ficha** dentro da gaveta. |
| **Chave primária (PK)** | Número único que identifica cada linha. | O **RG** da ficha. |
| **Chave estrangeira (FK)** | Coluna que aponta para a PK de outra tabela. | Um **"veja também: ficha nº 12"**. |
| **Relacionamento N:N** | Muitos de um lado ligam com muitos do outro. Vira uma tabela de ligação. | Uma **lista de chamada**: vários alunos em várias turmas. |
| **SQL** | A língua para conversar com o banco. | O **idioma** do armário. |
| **Migração** | Arquivo SQL que cria/muda o banco, em ordem. | As **plantas da obra**, etapa por etapa. |
| **API** | Porta pela qual o site pede dados ao Supabase. | O **balcão de pedidos**. |
| **Login / Auth** | Provar quem você é. | Pegar o **crachá** na portaria. |
| **JWT (sessão)** | O "crachá digital" que o navegador guarda depois do login. | O **crachá** com seu nome escrito. |
| **RLS** | Regras do banco que decidem, linha por linha, quem pode ver/editar. | O **porteiro** que confere o crachá antes de abrir cada apartamento. |
| **OAuth (Google)** | Entrar usando uma conta que já existe em outro lugar. | Usar a **carteirinha do clube** para entrar em outro clube parceiro. |
| **Variável de ambiente** | Configuração guardada fora do código. | A **senha do Wi-Fi num papel dentro de casa**, não pintada no muro. |
| **Deploy** | Publicar o site na internet. | **Abrir a loja** ao público. |
| **Git / GitHub** | Guarda o histórico de todas as versões do código, na nuvem. | Um **álbum de fotos** de cada versão do projeto. |

---

## 3. A viagem de uma frase: do toque até o banco

Exemplo: a criança toca **Eu**, **Quero**, **Água** e depois **Salvar**.

1. **Toque na figura "Eu"** → `prancha.js` executa `escolher()`. O número da figura (`id_palavra`) entra na lista `mensagem` e a figura aparece na faixa da frase.
2. **A voz fala "Eu"** → `voz.js` usa a voz mais natural do aparelho (`falar()`).
3. Ela toca **Quero** e **Água**. A lista fica `[10, 12, 345]`.
4. **Toque em Falar** → `falarFrase()` lê "Eu quero água" e cada figura "levanta" quando é dita.
5. **Toque em Salvar** → `salvarFrase()`:
   - descobre o tipo da frase (`classificarFrase()`): tem "Quero", então é **pedido**;
   - chama a função do banco `salvar_frase('pedido', [10, 12, 345])`.
6. **No Supabase**, a função `salvar_frase` (arquivo `..._seguranca_rls.sql`):
   - confere quem está logado (pelo e-mail do crachá);
   - confere se as figuras existem e se são de 1 a 40;
   - grava **1 linha em FRASE** (data + tipo), **1 linha em CRIA** (quem criou, quando, 3 palavras) e **3 linhas em CONTEM** (as figuras, na ordem).
   - Se qualquer passo falhar, **nada** é gravado (é tudo-ou-nada).
7. **Estrelinha e confetes** aparecem: "Frase salva!". A faixa fica limpa para a próxima frase.
8. **No Dicionário**, `dicionario.js` chama `minhas_frases()` e mostra a frase no histórico e nos gráficos.

**Parábola:** é um **trenzinho**. Cada figura tocada é um vagão que engata no fim. *Apagar* tira o último vagão, *Limpar* desengata todos, e *Salvar* manda o trem inteiro para a estação (o banco). Ou o trem chega inteiro, ou não sai.

---

## 4. Banco de dados (Supabase / PostgreSQL)

### 4.1 As 7 tabelas (exatamente as do DER)

| Tabela | Tipo | Colunas | Para que serve |
|---|---|---|---|
| `usuario` | Entidade | **id_usuario** (PK), perfil, email, senha, data_nasc, nome_completo | Quem usa o CAA. |
| `frase` | Entidade | **id_frase** (PK), data_criacao, tipo_frase | Cada mensagem salva. |
| `categoria` | Entidade | **id_categoria** (PK), nome_categoria, desc_categoria | Assuntos (Comidas...) e cores das palavras. |
| `palavras_pecs` | Entidade | **id_palavra** (PK), txt_palavra, imagem_pecs | Cada figura PECS. |
| `cria` | Relacionamento N:N | id_usuario (FK), id_frase (FK), data_frase, qtd_palavras | Quem criou qual frase. |
| `contem` | Relacionamento N:N | id_frase (FK), id_palavra (FK) | Quais figuras formam cada frase. |
| `tem` | Relacionamento N:N | id_categoria (FK), id_palavra (FK), data_criacao | Em quais categorias cada figura aparece. |

**Nenhuma coluna foi inventada.** Só adicionamos **regras** (constraints) que protegem os dados:

| Regra | Onde | Por quê |
|---|---|---|
| `email` único e em minúsculas | usuario | Uma conta por pessoa; "Ana@x.com" = "ana@x.com". |
| `perfil` só aceita `responsavel`, `profissional`, `autista` | usuario | Evita valores errados. |
| `tipo_frase` só aceita `pedido`, `pergunta`, `necessidade`, `expressao` | frase | Evita valores errados. |
| `qtd_palavras` entre 1 e 40 | cria | Mesmo limite da tela. |
| `on delete cascade` nas FKs | cria, contem, tem | Apagar uma frase apaga as ligações dela junto. |
| PK composta (`id_usuario, id_frase`) | cria | A mesma pessoa não "cria" a mesma frase duas vezes. |
| PK composta (`id_categoria, id_palavra`) | tem | A mesma figura não entra duas vezes na mesma categoria. |
| **Sem** PK em `contem` | contem | De propósito: a mesma figura pode aparecer 2 vezes na frase ("mais, mais!"). |
| Índices | cria, contem, tem | Deixam as buscas mais rápidas (como o **sumário** de um livro). |

**Sobre as datas:** o DER pede `timestamp`; usamos `timestamptz` (timestamp **com fuso horário**), para 15h em São Paulo continuar sendo 15h no histórico.

### 4.2 Como as ideias da tela viram colunas do DER

| Na tela | No banco |
|---|---|
| Cores das bordas (verde = ação, roxo = pergunta...) | São **categorias** especiais ("Classe: Ações e verbos"...), ligadas às figuras pela tabela **TEM**. Assim a cor vem do banco, sem coluna nova. |
| Ordem das figuras dentro de uma categoria | Coluna **data_criacao** da tabela **TEM** (quem foi ligado primeiro aparece primeiro). |
| "Mais usados no dia a dia" | É uma **categoria** com as 24 figuras mais comuns. |
| Tipo da frase (pedido, pergunta...) | Coluna **tipo_frase** da tabela **FRASE**. |
| Quantas figuras a frase tem | Coluna **qtd_palavras** da tabela **CRIA**. |
| Quando a frase foi feita | **data_criacao** (FRASE) e **data_frase** (CRIA). |

### 4.3 Os arquivos de migração (`supabase/migrations`)

1. **`20260930000001_tabelas_do_der.sql`**: cria as 7 tabelas, as regras e os índices.
2. **`20260930000002_seguranca_rls.sql`**: liga o RLS, define quem pode fazer o quê e cria as funções.
3. **`20260930000003_catalogo_pecs.sql`**: coloca no banco 64 categorias, 1.103 figuras e 2.230 ligações. É **gerado automaticamente** por `supabase/gerar-catalogo.mjs` a partir do arquivo `supabase/fonte/dados-catalogo.js` (o catálogo da versão antiga só de front-end). As 3 figuras de bebida alcoólica ficaram de fora da prancha infantil.

**Parábola:** as migrações são as **plantas da obra**, numeradas. Se precisar construir o prédio de novo em outro terreno (outro projeto Supabase), é só seguir as plantas na ordem.

### 4.4 As funções do banco

| Função | O que faz | Quem pode usar |
|---|---|---|
| `privado.meu_id_usuario()` | Lê o e-mail do crachá (JWT) e devolve o `id_usuario` da pessoa. É uma ferramenta interna das regras de segurança (fica no esquema `privado`, que não aparece na API). | Só as regras internas |
| `public.salvar_frase(tipo, palavras[])` | Grava FRASE + CRIA + CONTEM **de uma vez só** (tudo-ou-nada), depois de conferir tudo. | Pessoas logadas |
| `public.minhas_frases(limite)` | Devolve o histórico da pessoa logada, com as figuras de cada frase **na ordem** em que foram tocadas. | Pessoas logadas |

---

## 5. Segurança: RLS, login e senhas

### 5.1 RLS, o porteiro do banco

O site usa uma **chave pública** do Supabase (ela aparece no navegador, e isso é normal). Quem protege os dados **não é esconder a chave**: são as **regras RLS**, que o próprio banco aplica em **toda** consulta.

| Tabela | Ler | Criar | Editar | Apagar |
|---|---|---|---|---|
| `usuario` | só a própria linha | só com o próprio e-mail do login | só a própria linha | ninguém |
| `frase` | só as próprias (conferido via `cria`) | só pela função `salvar_frase` | ninguém | só as próprias |
| `cria` | só as próprias | só pela função | ninguém | automático (cascade) |
| `contem` | só das próprias frases | só pela função | ninguém | automático (cascade) |
| `categoria`, `palavras_pecs`, `tem` | quem está logado | ninguém pelo site | ninguém pelo site | ninguém pelo site |
| Visitante sem login (`anon`) | **nada** | **nada** | **nada** | **nada** |

Essas regras foram **testadas de verdade** no banco (teste automático, depois desfeito):

- A pessoa A salvou uma frase; a pessoa B **não conseguiu ver nem apagar** a frase de A.
- Criar frase direto na tabela (sem a função): **bloqueado**.
- Se cadastrar com o e-mail de outra pessoa: **bloqueado**.
- Mudar o catálogo: **bloqueado**.
- Tipo de frase inválido ou figura inexistente: **recusados**.
- Visitante sem login: **bloqueado** em tudo.

**Parábola:** o banco é um **prédio**. Cada linha é um **apartamento**. A chave pública só abre o **portão**. Dentro, o **porteiro (RLS)** olha o crachá e só abre o apartamento que é seu.

### 5.2 Login

- **Google (OAuth)**: a pessoa escolhe a conta Google; o Google confirma quem ela é e devolve para o site já logada. Usamos o fluxo **PKCE**, um "código secreto de ida e volta" que impede alguém de roubar o login no meio do caminho.
- **E-mail e senha**: o Supabase Auth guarda a senha **criptografada (bcrypt)** e manda um **e-mail de confirmação**. Só depois de confirmar dá para entrar (assim ninguém cria conta com o e-mail de outra pessoa).
- **Esqueci minha senha**: o Supabase manda um link; ao voltar, a pessoa escolhe uma senha nova.

### 5.3 E a coluna `senha` da tabela `usuario`?

Ela existe porque está no DER, mas **fica sempre vazia (NULL)**, e o próprio banco **proíbe** gravar algo nela (regra RLS `senha is null`). A senha verdadeira mora no **Supabase Auth**, criptografada. **Guardar senha em tabela comum seria uma falha grave de segurança.**

### 5.4 Outras proteções

- **Sem chaves no código**: endereço e chave pública do Supabase vêm de **variáveis de ambiente** (`.env` no PC, painel da Vercel na nuvem). O arquivo `config.js` gerado **não vai para o GitHub**.
- **Chave secreta nunca no site**: o script `gerar-config.mjs` **recusa** a chave secreta, se alguém colar por engano.
- **XSS (injeção de código)**: textos são colocados na tela com `textContent`, nunca com `innerHTML`. Se alguém digitar `<script>` no nome, aparece como texto.
- **Cabeçalhos de segurança** (`vercel.json`): *Content-Security-Policy* (só roda código do próprio site), *HSTS* (sempre HTTPS), *X-Frame-Options* (ninguém coloca o CAA dentro de outro site para enganar), entre outros.
- **Bibliotecas locais**: ícones, fonte e supabase-js ficam dentro do projeto; o site não baixa código de servidores desconhecidos.

---

## 6. As páginas HTML

Todas ficam em `public/`. Cada uma carrega, nesta ordem, os scripts de que precisa (com `defer`, que significa "baixe agora, mas só rode depois que a página toda foi lida").

| Arquivo | Tela | Precisa de login? | Scripts |
|---|---|---|---|
| `login.html` | Entrar (Google, e-mail/senha, esqueci a senha) | Não | base, auth, login |
| `cadastro.html` | Criar conta / completar cadastro | Não / Sim (completar) | base, auth, cadastro |
| `index.html` | **Casa**: prancha de comunicação | Sim | base, auth, interface, voz, catalogo, prancha |
| `tabelas.html` | Tabelas (categorias) | Sim | base, auth, interface, catalogo, tabelas |
| `dicionario.html` | Dicionário (progresso e histórico) | Sim | base, auth, interface, voz, catalogo, dicionario |
| `creditos.html` | Créditos (página pública) | Não | (nenhum) |

Detalhes que valem para todas:
- `lang="pt-BR"`: leitores de tela falam em português.
- Link **"Pular para o conteúdo"**: para quem navega pelo teclado.
- Tela de **carregando** (três bolinhas) enquanto conferimos o login.
- O **menu lateral** e as **abas do celular** não estão escritos no HTML: são montados por `interface.js` (um só molde para todas as páginas).

---

## 7. Os arquivos JavaScript, um por um

Todos ficam em `public/assets/js/`. Tudo do projeto é guardado dentro de um objeto chamado **`CAA`** (uma "mochila" única), para os nomes não se misturarem com os de outras bibliotecas.

### 7.1 `config.js` (gerado) e `config.example.js`
- Guarda `supabaseUrl` e `supabaseKey` (chave **pública**).
- `config.js` é **criado** pelo script `scripts/gerar-config.mjs` e **não vai para o GitHub**. `config.example.js` é só o modelo.

### 7.2 `base.js`: a caixa de ferramentas
| Parte | O que faz |
|---|---|
| `CAA.db` | Cria o **cliente do Supabase** (o "cartão do banco") com login PKCE, sessão guardada e renovação automática. |
| `CAA.el(tag, classe, texto)` | Cria um elemento na tela de forma segura (usa `textContent`). |
| `CAA.icone(nome)` | Cria um ícone do Bootstrap Icons. |
| `CAA.prefs.ler/salvar` | Guarda preferências **deste aparelho** (Modo Foco, voz escolhida) no `localStorage`. |
| `CAA.toast(msg)` | Mostra o aviso flutuante (como notificação de celular). |
| `CAA.mensagemErro(erro)` | Traduz erros técnicos para português simples. |
| `CAA.formatarData`, `CAA.chaveDia` | Datas no formato brasileiro. |
| `CAA.normalizar(texto)` | Tira acentos para a busca achar "agua" = "água". |
| `CAA.esconderCarregando()` | Some com as três bolinhas. |

### 7.3 `auth.js`: login e cadastro (o crachá)
| Função | O que faz |
|---|---|
| `CAA.auth.sessao()` | Pergunta ao Supabase se tem alguém logado. |
| `CAA.auth.exigirUsuario()` | **Porteiro das páginas internas**: sem login, vai para `login.html`; com login mas sem linha em `usuario`, vai completar o cadastro (ou cria sozinho com os dados informados no cadastro por e-mail). |
| `CAA.auth.criarUsuario(dados, sessao)` | Grava a linha na tabela **USUARIO**. O e-mail vem **do crachá**, nunca de um campo digitado. |
| `CAA.auth.prepararBotaoGoogle()` | Desenha o **botão oficial do Google** (Google Identity Services). A janelinha do Google abre a partir do nosso site e mostra **comunicaa.vercel.app** e o nome do app, em vez do endereço técnico do Supabase. O Google devolve uma prova de identidade (*id_token*) e `signInWithIdToken` entrega ao Supabase, que cria a sessão. Usa um *nonce* (número de uso único) contra reaproveitamento. |
| `CAA.auth.entrarComGoogle()` | **Reserva**: login por redirecionamento, usado só se o botão oficial não carregar. |
| `CAA.auth.sair()` | Devolve o crachá (logout) e limpa os dados da aba. |

### 7.4 `interface.js`: a moldura das telas internas
- `CAA.montarEstrutura(pagina, usuario)`: monta o **menu lateral** (computador), as **abas de baixo** (celular), o cartão com **iniciais, nome e perfil**, o botão **Sair** e o cumprimento **"Olá, Nome!"**.
- `iniciarModoFoco()`: liga/desliga o **Modo Foco** (figuras maiores, menos distrações) e lembra a escolha.
- `CAA.iniciarPaginaInterna(pagina, funcao)`: o "roteiro" de toda página interna: 1) conferir login, 2) montar a moldura, 3) carregar o conteúdo da página, 4) esconder o carregando.

**Parábola:** é o **molde de bolo**. Cada página só coloca o recheio; a forma é sempre a mesma.

### 7.5 `voz.js`: o locutor
- Usa a **Web Speech API** do navegador: é gratuita, funciona sem servidor e **não envia a frase para empresas**.
- **`nota(voz)`**: dá pontos para cada voz em português. Vozes **neurais/naturais** (Edge: "Francisca Online (Natural)"), **Google** (Chrome/Android) e **aprimoradas** (iPhone: "Luciana") ganham mais pontos; vozes robóticas perdem. A de maior nota é escolhida automaticamente.
- **`textoParaFala(texto)`**: limpa textos dos cartões para a voz soar natural: "Bom/bem" vira "Bom", "Outro (a)" vira "Outro", "Água c/ gás" vira "Água com gás", "TO" vira "terapeuta ocupacional".
- **`falar(texto)`**: interrompe a fala anterior (toques rápidos não se acumulam), usa a velocidade escolhida (Devagar/Normal/Rápido) e avisa quando cada palavra é dita (para a figura "levantar").

**Parábola:** é um **teste de elenco**: todas as vozes do aparelho fazem teste, e a que tirar a maior nota vira a narradora do CAA.

### 7.6 `catalogo.js`: o álbum de figurinhas
- **`buscarTudo(tabela)`**: o Supabase entrega no máximo 1.000 linhas por pedido; esta função pede de 1.000 em 1.000 até acabar (**paginação**).
- **`carregar()`**: busca **CATEGORIA**, **PALAVRAS_PECS** e **TEM** ao mesmo tempo e organiza: cada figura ganha sua **cor** (pela categoria "Classe: ..."), e cada categoria ganha sua lista de figuras **na ordem** (`tem.data_criacao`). Guarda uma cópia na aba (`sessionStorage`) para as outras telas abrirem instantaneamente.
- **`criarCartao(palavra)`**: cria o botão da figura (imagem + texto + borda colorida) com a animação de toque.
- **`CLASSES`**: a lista das categorias de cor (chave de Fitzgerald) e a classe CSS de cada uma.
- **`minhasFiguras()`**: monta a tabela pessoal **"💜 Minhas figuras"**: as figuras que a própria pessoa mais usou nas frases salvas (CRIA + CONTEM, via `minhas_frases`). Como o DER não tem coluna de "dono" em CATEGORIA, a tabela pessoal é **calculada**, não gravada. Aparece na Casa e em Tabelas assim que a pessoa salva a primeira frase. *Parábola:* a gaveta de brinquedos favoritos que se enche sozinha.

**Parábola:** **PALAVRAS_PECS** são as figurinhas, **CATEGORIA** são as páginas do álbum e **TEM** diz em qual página cada figurinha é colada, e em qual posição.

### 7.7 `prancha.js`: a tela Casa
| Função | O que faz |
|---|---|
| `escolher(palavra)` | Engata a figura na frase (até 40) e fala a palavra. |
| `desenharFrase()` | Redesenha a faixa da frase e liga/desliga os botões. |
| `falarFrase()` | Fala a frase inteira, "levantando" cada figura quando é dita. |
| `salvarFrase()` | Chama `salvar_frase` no banco e comemora. |
| `classificarFrase()` | Decide o **tipo_frase**: figura vermelha é **necessidade**; roxa ou "?" é **pergunta**; "quero/posso/preciso" é **pedido**; o resto é **expressão**. |
| `comemorar()` | Estrelinha + confetes (sem confetes no Modo Foco). |
| `montarAtalhos()` | Botões "Preciso dizer": Não, Me ajuda, Pausa, Ir no banheiro. |
| `montarChips()` | As pílulas de categoria (Mais usados, Comidas, ...). |
| `desenharGrade()` | Mostra as figuras da categoria/busca, de 36 em 36 ("Mostrar mais"). |
| `iniciarAjustesDeVoz()` | Janela de ajustes: escolher voz, velocidade, "falar ao tocar" e testar. |

A frase em construção fica guardada na aba (`sessionStorage`): se a pessoa for em Tabelas e voltar, a frase continua lá.

### 7.8 `tabelas.js`: a estante
Mostra cada **categoria** como um cartão (capa com 3 figuras + quantidade). Duas seções: **Assuntos** e **Cores das palavras**. Tocar abre `index.html?categoria=ID`, e a Casa já abre filtrada.

### 7.9 `dicionario.js`: o boletim gentil
Chama `minhas_frases()` e calcula, no próprio navegador:
- **frases salvas**, **dias seguidos** (a "chama" do Duolingo), **média de figuras por frase** e **figuras diferentes** usadas;
- **gráfico dos últimos 7 dias** (barras feitas só com CSS);
- **tipos de frase** (pedido, pergunta, necessidade, expressão);
- **meu dicionário**: as 18 figuras mais usadas;
- **histórico**, com **Ouvir** e **Apagar** (apagar a FRASE apaga CRIA e CONTEM junto, pelo *cascade*).

> Não é avaliação clínica: mostra o **uso**, para a família e os profissionais acompanharem a evolução.

### 7.10 `login.js` e `cadastro.js`
- **login.js**: botões do Google e de e-mail/senha, "Esqueci minha senha" e a tela de nova senha (`login.html?redefinir=1`).
- **cadastro.js**: dois modos na mesma tela:
  - **conta nova**: cria o login no Supabase Auth e guarda nome/perfil/nascimento até a confirmação do e-mail;
  - **completar** (`?completar=1`): quem entrou com Google escolhe o perfil e grava a linha em USUARIO.
  - Valida os campos antes de enviar (nome, perfil, e-mail, senha de 8+ caracteres, senhas iguais, data não futura).

---

## 8. O visual (`estilo.css`)

Organizado em 10 partes numeradas no próprio arquivo:

1. **Variáveis**: a "paleta de tintas" com nome (`--verde`, `--azul`...). Trocar aqui muda o site inteiro.
2. **Base e fonte**: fonte **Nunito** (letras arredondadas), foco visível para teclado.
3. **Botões**: estilo **Duolingo**: sombra dura embaixo; ao tocar, o botão "afunda". **Botão colorido sempre com texto branco** (cores escolhidas com contraste ≥ 3:1).
4. **Formulários**: campos grandes (54px), fáceis de tocar.
5. **Estrutura**: menu lateral com vidro fosco (estilo **Apple**), abas do celular, avisos flutuantes.
6. **Prancha**: faixa da frase que "gruda" no topo, cartões com **borda na cor da classe** (chave de Fitzgerald), animações curtas.
7. **Tabelas**: cartões com capa de 3 figuras.
8. **Dicionário**: números grandes, gráfico de barras e histórico.
9. **Login e cadastro**: fundo com manchas suaves de cor.
10. **Modo Foco, movimento reduzido e celular**:
    - **Modo Foco**: figuras maiores, sem legendas e rodapé.
    - `prefers-reduced-motion`: se o aparelho pede "menos movimento", as animações são desligadas (importante para pessoas sensíveis a estímulos).
    - Até **960px**: o menu lateral vira **abas embaixo** (como apps de celular).
    - Até **640px**: tudo se reorganiza para caber no celular sem rolagem lateral.

**Chave de cores (Fitzgerald)** usada nas bordas:

| Cor | Classe de palavra |
|---|---|
| 🩷 Rosa | Expressões sociais e preposições |
| 💛 Amarelo | Pessoas e pronomes |
| 💚 Verde | Ações e verbos |
| 🧡 Laranja | Objetos e substantivos |
| 💙 Azul | Qualidades e adjetivos |
| 💜 Roxo | Perguntas |
| 🤎 Marrom | Advérbios |
| ❤️ Vermelho | Recusa, ajuda e desconforto |
| 🩶 Cinza | Outros símbolos |

---

## 9. Configuração, publicação e GitHub

| Arquivo | Para que serve |
|---|---|
| `.env` (não vai para o GitHub) | Endereço e chave **pública** do Supabase no seu computador. |
| `.env.example` | Modelo do `.env`, sem valores reais. |
| `scripts/gerar-config.mjs` | Lê o `.env` (ou as variáveis da Vercel) e escreve `public/assets/js/config.js`. Recusa chaves secretas. |
| `vercel.json` | Diz à Vercel: rode o script acima, publique a pasta `public/` e envie os **cabeçalhos de segurança**. |
| `.gitignore` | Lista do que **nunca** vai para o GitHub (`.env`, `config.js`...). |
| `.vercelignore` | Lista do que **nunca** sobe para a Vercel. |
| `supabase/config.toml` | Configuração do login no Supabase (endereço do site, links permitidos, senha mínima de 8, confirmação de e-mail). |
| `package.json` | Atalhos de comando: `npm run dev` (rodar no PC), `npm run catalogo` (gerar o catálogo). |

**Publicar de novo depois de mudar algo:**
```bash
vercel deploy --prod
```

**Mudar o banco:** crie um novo arquivo em `supabase/migrations/` (com data/hora maior no nome) e rode:
```bash
npx supabase db push
```

---

## 10. Perguntas que a banca pode fazer (e as respostas)

**1. "O banco está igual ao DER?"**
Sim. São as 7 tabelas do DER (usuario, frase, categoria, palavras_pecs, cria, contem, tem), com as mesmas colunas. Os relacionamentos N:N (CRIA, CONTÉM, TEM) viraram tabelas associativas com as chaves estrangeiras das duas entidades e seus atributos próprios.

**2. "Onde fica a senha do usuário?"**
No **Supabase Auth**, criptografada com **bcrypt**. A coluna `senha` do DER existe, mas fica vazia e o banco proíbe gravar nela. Guardar senha em texto numa tabela comum seria inseguro.

**3. "A chave do Supabase está no navegador. Isso não é perigoso?"**
É a chave **pública** (feita para isso). Ela só "abre o portão". Quem protege os dados é o **RLS**, que confere o login em cada consulta. A chave **secreta** nunca vai para o site (o script até recusa se alguém tentar).

**4. "Um usuário consegue ver as frases de outro?"**
Não. As regras RLS só liberam as linhas ligadas ao próprio `id_usuario` (via tabela CRIA). Testamos: o usuário B não consegue ver nem apagar as frases do usuário A.

**5. "Como a frase é salva?"**
Pela função `salvar_frase`, que grava FRASE, CRIA e CONTEM numa **transação**: ou grava tudo, ou nada. Ela confere quem está logado, se as figuras existem e se são de 1 a 40.

**6. "Como vocês guardam a ordem das figuras, se CONTÉM só tem as duas chaves?"**
As figuras são gravadas na ordem em que foram tocadas, numa única instrução, e a função `minhas_frases` lê na mesma ordem de gravação (`ctid`, a "posição na fila" do disco). Por isso não foi preciso criar uma coluna nova no DER.

**7. "Como funciona o login com Google?"**
Por **OAuth 2.0** com **PKCE**. O Google confirma a identidade e devolve para o site com um código; o Supabase troca esse código por uma sessão (JWT). No primeiro acesso, a pessoa escolhe o perfil e criamos a linha em USUARIO.

**8. "De onde vem a voz?"**
Da **Web Speech API**, que já existe nos navegadores. O `voz.js` escolhe automaticamente a voz mais natural do aparelho (vozes neurais do Edge/Windows, Google no Chrome/Android, vozes aprimoradas no iPhone). É gratuita e a frase não é enviada para nenhuma empresa.

**9. "Por que HTML, CSS e JS puros e não React?"**
Para a equipe entender e explicar cada linha, sem etapas de compilação. O site continua rápido e organizado em um arquivo por assunto.

**10. "O que é o tipo_frase?"**
A intenção da mensagem: **pedido** ("quero"), **pergunta** (figuras roxas ou "?"), **necessidade** (figuras vermelhas: não, dor, ajuda) ou **expressão** (o resto). Ele aparece no Dicionário para acompanhar o que a pessoa mais comunica.

**11. "E acessibilidade?"**
Botões grandes, cores com contraste, texto sempre junto da figura (a cor nunca é a única pista), navegação por teclado, textos para leitores de tela, **Modo Foco** e respeito ao "reduzir movimento" do aparelho.

**12. "E se a internet cair?"**
A tela avisa "Sem conexão" em português. A frase em construção continua na tela.

**13. "Cada usuário pode ter a sua própria tabela?"**
Sim, a **"Minhas figuras"**, calculada a partir das frases que a pessoa salvou (as mais usadas primeiro). Não foi preciso criar coluna nova no DER: os dados já estão em CRIA e CONTEM.

**14. "Por que a tela do Google mostra o nome do site e não do Supabase?"**
Usamos o botão oficial do Google (Google Identity Services). A janela abre a partir do `comunicaa.vercel.app`, o Google devolve um *id_token* assinado e o Supabase valida com `signInWithIdToken`. Se o botão oficial falhar, o login por redirecionamento continua como reserva.

**15. "Onde o site está hospedado?"**
Na **Vercel** (front-end) e no **Supabase**, região São Paulo (banco e login). O código está no **GitHub**.

---

## 11. Glossário rápido

- **anon / authenticated**: os dois "papéis" do Supabase: visitante sem login e pessoa logada.
- **bcrypt**: forma de criptografar senhas que não pode ser "desfeita".
- **cascade**: "em cascata": apagar o pai apaga os filhos ligados.
- **CSP (Content-Security-Policy)**: regra que diz ao navegador de onde o site pode carregar código.
- **defer**: atributo do `<script>`: baixa já, executa depois que a página foi lida.
- **HSTS**: obriga o navegador a usar sempre HTTPS (cadeado).
- **JWT**: o crachá digital da sessão, assinado pelo Supabase.
- **localStorage / sessionStorage**: "gavetinhas" do navegador. A primeira dura para sempre; a segunda, só enquanto a aba está aberta.
- **PKCE**: proteção extra do login com Google contra interceptação.
- **RPC**: chamar uma função do banco pelo site (ex.: `CAA.db.rpc('salvar_frase', ...)`).
- **security definer / invoker**: se a função roda com a permissão de quem a criou (definer) ou de quem a chamou (invoker).
- **textContent vs innerHTML**: `textContent` mostra texto puro (seguro); `innerHTML` interpreta como código (perigoso com textos digitados).
- **XSS**: ataque em que alguém tenta colocar código no site por um campo de texto.
