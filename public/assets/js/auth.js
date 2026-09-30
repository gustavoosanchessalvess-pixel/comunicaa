// =====================================================================
// auth.js · LOGIN, SESSÃO E CADASTRO DO USUÁRIO
// ---------------------------------------------------------------------
// "Auth" vem de "authentication" (autenticação) = provar quem você é.
//
// Parábola do CRACHÁ:
//   * Entrar (Google ou e-mail/senha) = pegar um crachá na portaria.
//   * O crachá (sessão/JWT) fica guardado no navegador.
//   * Cada pedido ao banco mostra o crachá; o banco vê o e-mail escrito
//     nele e só libera os dados daquela pessoa (regras RLS).
//   * Sair = devolver o crachá.
//
// A senha NUNCA passa pelo nosso código de banco: quem guarda e confere
// senhas é o Supabase Auth, com criptografia (bcrypt).
// =====================================================================
'use strict';

(function () {
  // Nomes bonitos para mostrar na tela.
  const PERFIS = {
    responsavel: 'Responsável',
    profissional: 'Profissional',
    autista: 'Pessoa autista',
  };

  // Uma promessa que nunca termina: usada quando mandamos a pessoa para
  // outra página, para o resto do código "parar e esperar" o redirecionamento.
  const esperarParaSempre = () => new Promise(() => {});

  // Endereço completo de uma página deste site (funciona no computador
  // local e na Vercel). Ex.: paginaDoSite('index.html')
  function paginaDoSite(arquivo) {
    return new URL(arquivo, window.location.href).href.split('?')[0].split('#')[0];
  }

  CAA.auth = {
    PERFIS,
    paginaDoSite,

    // Existe alguém logado neste navegador? Devolve a sessão ou null.
    async sessao() {
      if (!CAA.db) return null;
      const { data, error } = await CAA.db.auth.getSession();
      if (error) throw error;
      return data.session;
    },

    // -----------------------------------------------------------------
    // PORTEIRO DAS PÁGINAS INTERNAS (Casa, Tabelas, Dicionário)
    // 1. Sem crachá? -> vai para o login.
    // 2. Com crachá mas sem cadastro na tabela USUARIO? -> completa o cadastro.
    // 3. Tudo certo? -> devolve a linha do usuário.
    // -----------------------------------------------------------------
    async exigirUsuario() {
      if (!CAA.configurado || !CAA.db) {
        mostrarErroConfiguracao();
        return esperarParaSempre();
      }

      const sessao = await CAA.auth.sessao();
      if (!sessao) {
        window.location.replace('login.html');
        return esperarParaSempre();
      }

      // O RLS garante que esta consulta devolve SÓ a linha da própria pessoa.
      let { data: usuario, error } = await CAA.db
        .from('usuario')
        .select('id_usuario, perfil, email, data_nasc, nome_completo')
        .maybeSingle();
      if (error) throw error;

      if (!usuario) {
        // Quem se cadastrou com e-mail e senha já informou nome e perfil;
        // esses dados ficam guardados no "user_metadata" até o 1º acesso.
        const meta = sessao.user.user_metadata || {};
        if (meta.nome_completo && PERFIS[meta.perfil]) {
          usuario = await CAA.auth.criarUsuario({
            nome_completo: meta.nome_completo,
            data_nasc: meta.data_nasc || null,
            perfil: meta.perfil,
          }, sessao);
        } else {
          window.location.replace('cadastro.html?completar=1');
          return esperarParaSempre();
        }
      }

      CAA.usuario = usuario;
      CAA.sessaoAtual = sessao;
      return usuario;
    },

    // Grava a linha na tabela USUARIO (entidade do DER).
    // O e-mail vem SEMPRE do crachá (sessão), nunca de um campo digitado,
    // para ninguém conseguir se passar por outra pessoa.
    async criarUsuario(dados, sessao) {
      const email = String(sessao.user.email || '').toLowerCase();
      const { data, error } = await CAA.db
        .from('usuario')
        .insert({
          email,
          nome_completo: dados.nome_completo.trim().slice(0, 120),
          data_nasc: dados.data_nasc || null,
          perfil: dados.perfil,
          // senha fica NULL de propósito: ela mora no Supabase Auth.
        })
        .select('id_usuario, perfil, email, data_nasc, nome_completo')
        .single();
      if (error) throw error;
      return data;
    },

    // Atualiza nome, nascimento e perfil do próprio usuário.
    async atualizarUsuario(dados) {
      const { data, error } = await CAA.db
        .from('usuario')
        .update({
          nome_completo: dados.nome_completo.trim().slice(0, 120),
          data_nasc: dados.data_nasc || null,
          perfil: dados.perfil,
        })
        .eq('id_usuario', CAA.usuario.id_usuario)
        .select('id_usuario, perfil, email, data_nasc, nome_completo')
        .single();
      if (error) throw error;
      CAA.usuario = data;
      return data;
    },

    // Botão "Continuar com Google": abre a tela de escolha de conta do
    // Google. Depois o Google devolve a pessoa para index.html.
    async entrarComGoogle() {
      const { error } = await CAA.db.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: paginaDoSite('index.html'),
          queryParams: { prompt: 'select_account' },
        },
      });
      if (error) throw error;
    },

    // Sair: devolve o crachá e limpa o que ficou guardado nesta aba.
    async sair() {
      try { await CAA.db.auth.signOut(); } catch (erro) { /* mesmo com erro de rede, seguimos para o login */ }
      try { sessionStorage.clear(); } catch (erro) { /* ignorado */ }
      window.location.replace('login.html?saiu=1');
    },
  };

  // Aviso amigável quando o config.js ainda não foi preenchido.
  function mostrarErroConfiguracao() {
    CAA.esconderCarregando();
    document.body.replaceChildren();
    const caixa = CAA.el('main', 'pagina-entrada');
    const cartao = CAA.el('section', 'entrada-cartao');
    cartao.append(
      CAA.el('h1', '', 'Falta configurar o Supabase'),
      CAA.el('p', 'subtitulo', 'Crie o arquivo public/assets/js/config.js a partir de config.example.js (ou rode "node scripts/gerar-config.mjs"). O passo a passo está no README.'),
    );
    caixa.append(cartao);
    document.body.append(caixa);
  }
})();
