-- =====================================================================
-- CAA · MIGRAÇÃO 2 · SEGURANÇA (RLS) E FUNÇÕES
-- ---------------------------------------------------------------------
-- RLS = Row Level Security = "Segurança por Linha".
--
-- Parábola: o banco é um PRÉDIO e cada linha é um APARTAMENTO.
-- Sem RLS, qualquer pessoa com a chave do portão (a chave pública do
-- site) entraria em todos os apartamentos. Com RLS, o porteiro confere
-- o crachá (o login) e só abre o apartamento que é SEU.
--
-- Quem é quem aqui:
--   anon .......... visitante SEM login  -> não vê nada
--   authenticated . pessoa COM login      -> vê o catálogo e SÓ as
--                                            próprias frases
-- =====================================================================


-- ---------------------------------------------------------------------
-- 1) LIGAR O PORTEIRO (RLS) EM TODAS AS 7 TABELAS
-- ---------------------------------------------------------------------
alter table public.usuario       enable row level security;
alter table public.frase         enable row level security;
alter table public.categoria     enable row level security;
alter table public.palavras_pecs enable row level security;
alter table public.cria          enable row level security;
alter table public.contem        enable row level security;
alter table public.tem           enable row level security;


-- ---------------------------------------------------------------------
-- 2) PERMISSÕES BÁSICAS (quem pode tentar o quê)
-- Primeiro tiramos tudo de todo mundo; depois devolvemos só o mínimo.
-- ---------------------------------------------------------------------
revoke all on public.usuario, public.frase, public.categoria, public.palavras_pecs,
              public.cria, public.contem, public.tem
  from anon, authenticated;

grant select                 on public.categoria, public.palavras_pecs, public.tem to authenticated;
grant select, insert, update on public.usuario                                     to authenticated;
grant select, delete         on public.frase                                       to authenticated;
grant select                 on public.cria, public.contem                         to authenticated;


-- ---------------------------------------------------------------------
-- 3) FUNÇÃO AJUDANTE: "qual é o MEU id_usuario?"
-- Lê o e-mail do crachá (JWT do login) e devolve o número do usuário.
-- "security definer" = roda com a chave do zelador, só para esta
-- consulta pequena e segura (evita um porteiro perguntando para outro
-- porteiro em círculo).
-- Ela mora no esquema "privado", que NÃO aparece na API do site:
-- é uma ferramenta interna do porteiro, não uma porta de entrada.
-- ---------------------------------------------------------------------
create schema if not exists privado;
revoke all on schema privado from public, anon;
grant usage on schema privado to authenticated;

create or replace function privado.meu_id_usuario()
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select u.id_usuario
  from public.usuario u
  where u.email = lower(coalesce(auth.jwt() ->> 'email', ''))
  limit 1;
$$;

revoke all on function privado.meu_id_usuario() from public, anon;
grant execute on function privado.meu_id_usuario() to authenticated;


-- ---------------------------------------------------------------------
-- 4) REGRAS DO PORTEIRO (POLICIES)
-- ---------------------------------------------------------------------

-- USUARIO: cada pessoa só vê, cria e edita a PRÓPRIA linha.
-- A coluna senha precisa continuar vazia (a senha fica no Supabase Auth).
create policy "usuario: ver o proprio cadastro"
  on public.usuario for select to authenticated
  using (email = lower((select auth.jwt()) ->> 'email'));

create policy "usuario: criar o proprio cadastro"
  on public.usuario for insert to authenticated
  with check (email = lower((select auth.jwt()) ->> 'email') and senha is null);

create policy "usuario: editar o proprio cadastro"
  on public.usuario for update to authenticated
  using      (email = lower((select auth.jwt()) ->> 'email'))
  with check (email = lower((select auth.jwt()) ->> 'email') and senha is null);

-- CATÁLOGO (categoria, palavras_pecs, tem): quem está logado pode LER.
-- Ninguém edita pelo site: o catálogo é cuidado pela equipe no painel
-- do Supabase (curadoria), como a biblioteca da escola.
create policy "categoria: leitura para quem esta logado"
  on public.categoria for select to authenticated using (true);

create policy "palavras_pecs: leitura para quem esta logado"
  on public.palavras_pecs for select to authenticated using (true);

create policy "tem: leitura para quem esta logado"
  on public.tem for select to authenticated using (true);

-- CRIA: vejo só as ligações "usuário -> frase" que são minhas.
create policy "cria: ver as proprias"
  on public.cria for select to authenticated
  using (id_usuario = (select privado.meu_id_usuario()));

-- FRASE: vejo e apago só frases que EU criei (conferido pela tabela cria).
create policy "frase: ver as proprias"
  on public.frase for select to authenticated
  using (exists (
    select 1 from public.cria c
    where c.id_frase = frase.id_frase
      and c.id_usuario = (select privado.meu_id_usuario())
  ));

create policy "frase: apagar as proprias"
  on public.frase for delete to authenticated
  using (exists (
    select 1 from public.cria c
    where c.id_frase = frase.id_frase
      and c.id_usuario = (select privado.meu_id_usuario())
  ));

-- CONTEM: vejo as figuras só das minhas frases.
create policy "contem: ver das proprias frases"
  on public.contem for select to authenticated
  using (exists (
    select 1 from public.cria c
    where c.id_frase = contem.id_frase
      and c.id_usuario = (select privado.meu_id_usuario())
  ));


-- ---------------------------------------------------------------------
-- 5) FUNÇÃO salvar_frase: grava uma mensagem INTEIRA de uma vez.
-- Parábola: é como mandar uma carta registrada. Ou chega TUDO
-- (frase + cria + contem) ou não chega NADA. Nunca fica meia frase.
--   p_tipo_frase ... 'pedido' | 'pergunta' | 'necessidade' | 'expressao'
--   p_palavras ..... lista de id_palavra NA ORDEM em que foram tocadas
-- Devolve o id_frase criado.
-- Observação: o "Security Advisor" do Supabase mostra um aviso (WARN)
-- dizendo que usuários logados podem executar esta função. É de
-- propósito: ela é a ÚNICA porta para salvar frases, confere tudo e só
-- grava em nome de quem está logado.
-- ---------------------------------------------------------------------
create or replace function public.salvar_frase(p_tipo_frase text, p_palavras integer[])
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_usuario integer := privado.meu_id_usuario();
  v_qtd     integer := coalesce(array_length(p_palavras, 1), 0);
  v_frase   integer;
begin
  -- Só quem terminou o cadastro pode salvar.
  if v_usuario is null then
    raise exception 'Complete seu cadastro antes de salvar frases.' using errcode = '42501';
  end if;

  -- Uma frase tem de 1 a 40 figuras (mesmo limite da tela).
  if v_qtd < 1 or v_qtd > 40 then
    raise exception 'A frase precisa ter de 1 a 40 figuras.' using errcode = '22023';
  end if;

  -- Todas as figuras precisam existir no catálogo.
  if exists (
    select 1
    from unnest(p_palavras) as p(id)
    left join public.palavras_pecs pp on pp.id_palavra = p.id
    where pp.id_palavra is null
  ) then
    raise exception 'Uma das figuras não existe no catálogo.' using errcode = '22023';
  end if;

  -- 1. FRASE
  insert into public.frase (tipo_frase)
  values (coalesce(p_tipo_frase, 'expressao'))
  returning id_frase into v_frase;

  -- 2. CRIA (quem criou, quando e quantas figuras)
  insert into public.cria (id_usuario, id_frase, qtd_palavras)
  values (v_usuario, v_frase, v_qtd);

  -- 3. CONTEM (as figuras, gravadas na ordem em que foram tocadas)
  insert into public.contem (id_frase, id_palavra)
  select v_frase, p.id
  from unnest(p_palavras) with ordinality as p(id, ordem)
  order by p.ordem;

  return v_frase;
end;
$$;

revoke all on function public.salvar_frase(text, integer[]) from public, anon;
grant execute on function public.salvar_frase(text, integer[]) to authenticated;


-- ---------------------------------------------------------------------
-- 6) FUNÇÃO minhas_frases: devolve o HISTÓRICO pronto para a tela.
-- "security invoker" = roda com o crachá de quem chamou, então o
-- porteiro (RLS) continua valendo: cada um só recebe as próprias frases.
-- As figuras vêm na ordem de gravação (ctid = "posição na fila" em que
-- a linha foi escrita no disco).
-- ---------------------------------------------------------------------
create or replace function public.minhas_frases(p_limite integer default 200)
returns table (
  id_frase     integer,
  data_criacao timestamptz,
  tipo_frase   varchar,
  data_frase   timestamptz,
  qtd_palavras integer,
  palavras     jsonb
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    f.id_frase,
    f.data_criacao,
    f.tipo_frase,
    c.data_frase,
    c.qtd_palavras,
    coalesce((
      select jsonb_agg(
               jsonb_build_object(
                 'id_palavra',  p.id_palavra,
                 'txt_palavra', p.txt_palavra,
                 'imagem_pecs', p.imagem_pecs
               ) order by ct.ctid)
      from public.contem ct
      join public.palavras_pecs p on p.id_palavra = ct.id_palavra
      where ct.id_frase = f.id_frase
    ), '[]'::jsonb) as palavras
  from public.cria c
  join public.frase f on f.id_frase = c.id_frase
  where c.id_usuario = privado.meu_id_usuario()
  order by c.data_frase desc
  limit least(greatest(coalesce(p_limite, 200), 1), 500);
$$;

revoke all on function public.minhas_frases(integer) from public, anon;
grant execute on function public.minhas_frases(integer) to authenticated;
