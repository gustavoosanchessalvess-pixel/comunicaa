// =====================================================================
// cadastro.js · TELA "CRIAR CONTA" e "COMPLETAR CADASTRO"
// ---------------------------------------------------------------------
// Dois modos na mesma tela:
//
//   CONTA NOVA (cadastro.html)
//     1. Supabase Auth cria o login (e-mail + senha criptografada) e
//        manda um e-mail de confirmação.
//     2. Nome, perfil e nascimento ficam guardados junto do login
//        (user_metadata) até a pessoa confirmar o e-mail e entrar.
//     3. No 1º acesso, auth.js grava a linha na tabela USUARIO.
//
//   COMPLETAR (cadastro.html?completar=1)
//     Quem entrou com Google já tem e-mail e nome. Falta só escolher o
//     perfil (e, se quiser, a data de nascimento). Ao salvar, a linha
//     é gravada direto na tabela USUARIO.
// =====================================================================
'use strict';

(function () {
  const $ = (id) => document.getElementById(id);
  const completar = new URLSearchParams(window.location.search).has('completar');
  let sessao = null;

  function avisar(texto, tipo) {
    const aviso = $('aviso');
    aviso.textContent = texto || '';
    aviso.className = 'aviso' + (tipo ? ' ' + tipo : '');
    if (texto) aviso.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  function ocupado(sim) {
    const botao = $('botao-cadastrar');
    botao.disabled = sim;
    botao.setAttribute('aria-busy', String(sim));
  }

  // Não deixa escolher uma data de nascimento no futuro.
  $('nascimento').max = CAA.chaveDia(new Date());

  async function iniciar() {
    if (!CAA.configurado || !CAA.db) {
      avisar('O Supabase ainda não foi configurado (arquivo config.js). Veja o README.', 'erro');
      ocupado(true);
      return;
    }
    sessao = await CAA.auth.sessao();

    if (completar) {
      if (!sessao) { window.location.replace('login.html'); return; }

      // Se o cadastro já existe, não há nada para completar.
      const { data: existente } = await CAA.db.from('usuario').select('id_usuario').maybeSingle();
      if (existente) { window.location.replace('index.html'); return; }

      // Ajusta a tela para o modo "completar".
      document.title = 'Completar cadastro · CAA';
      $('titulo').textContent = 'Falta pouco!';
      $('subtitulo').textContent = 'Conte pra gente quem vai usar o CAA.';
      $('bloco-google').hidden = true;
      $('bloco-credenciais').hidden = true;
      $('rodape-entrar').hidden = true;
      $('texto-botao').textContent = 'Começar a usar';
      $('email-google').hidden = false;
      $('email-google').textContent = 'Conta conectada: ' + sessao.user.email;

      const meta = sessao.user.user_metadata || {};
      $('nome').value = meta.nome_completo || meta.full_name || meta.name || '';
      if (meta.perfil) marcarPerfil(meta.perfil);
    } else if (sessao) {
      // Já está logado: nada de criar outra conta.
      window.location.replace('index.html');
    }
  }

  function marcarPerfil(valor) {
    const opcao = document.querySelector('input[name="perfil"][value="' + valor + '"]');
    if (opcao) opcao.checked = true;
  }

  function perfilEscolhido() {
    const marcado = document.querySelector('input[name="perfil"]:checked');
    return marcado ? marcado.value : '';
  }

  // ---------------- GOOGLE ----------------
  $('entrar-google').addEventListener('click', async () => {
    avisar('Abrindo o Google...', 'info');
    try { await CAA.auth.entrarComGoogle(); } catch (erro) { avisar(CAA.mensagemErro(erro), 'erro'); }
  });

  // ---------------- ENVIAR O FORMULÁRIO ----------------
  $('form-cadastro').addEventListener('submit', async (evento) => {
    evento.preventDefault();

    // 1. Conferir os campos (validação) antes de falar com o servidor.
    const dados = {
      nome_completo: $('nome').value.trim(),
      perfil: perfilEscolhido(),
      data_nasc: $('nascimento').value || null,
    };
    if (dados.nome_completo.length < 2) { avisar('Digite o nome completo.', 'erro'); $('nome').focus(); return; }
    if (!dados.perfil) { avisar('Escolha quem vai usar a conta.', 'erro'); return; }
    if (dados.data_nasc && dados.data_nasc > CAA.chaveDia(new Date())) { avisar('A data de nascimento não pode ser no futuro.', 'erro'); return; }

    ocupado(true);
    avisar('');
    try {
      if (completar) {
        // MODO COMPLETAR: grava direto na tabela USUARIO.
        await CAA.auth.criarUsuario(dados, sessao);
        window.location.replace('index.html');
        return;
      }

      // MODO CONTA NOVA
      const email = $('email').value.trim().toLowerCase();
      const senha = $('senha').value;
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error('Digite um e-mail válido.');
      if (senha.length < 8) throw new Error('A senha precisa ter pelo menos 8 caracteres.');
      if (senha !== $('senha-2').value) throw new Error('As duas senhas não são iguais.');

      const { data, error } = await CAA.db.auth.signUp({
        email,
        password: senha,
        options: {
          data: dados, // guardado no user_metadata até o primeiro acesso
          emailRedirectTo: CAA.auth.paginaDoSite('index.html'),
        },
      });
      $('senha').value = '';
      $('senha-2').value = '';
      if (error) throw error;

      // O Supabase não revela se o e-mail já existe (proteção contra
      // "descobrir e-mails"), mas devolve uma conta sem identidades.
      if (data.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
        throw new Error('User already registered');
      }

      if (data.session) {
        // Confirmação de e-mail desligada no Supabase: já entra direto.
        await CAA.auth.criarUsuario(dados, data.session);
        window.location.replace('index.html');
        return;
      }

      // Confirmação de e-mail ligada (recomendado): avisa e esconde o formulário.
      $('form-cadastro').hidden = true;
      $('bloco-google').hidden = true;
      $('titulo').textContent = 'Confira seu e-mail';
      $('subtitulo').textContent = 'Falta só um passo.';
      avisar('Enviamos um link de confirmação para ' + email + '. Abra o e-mail, toque no link e depois entre com sua senha.', 'ok');
    } catch (erro) {
      avisar(CAA.mensagemErro(erro), 'erro');
    } finally {
      ocupado(false);
    }
  });

  iniciar().catch((erro) => avisar(CAA.mensagemErro(erro), 'erro'));

  // Botão oficial do Google (mostra "comunicaa.vercel.app" em vez do endereço do Supabase).
  CAA.auth.prepararBotaoGoogle(
    document.getElementById('google-oficial'),
    document.getElementById('entrar-google'),
    (erro) => avisar(CAA.mensagemErro(erro), 'erro'),
  );
})();
