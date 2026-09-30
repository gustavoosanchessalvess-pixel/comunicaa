// =====================================================================
// login.js · TELA "ENTRAR"
// ---------------------------------------------------------------------
// Três caminhos:
//   1. Continuar com Google ... o Google confirma quem é a pessoa e
//                               devolve para index.html já logada.
//   2. E-mail e senha ......... o Supabase Auth confere a senha
//                               (criptografada) e entrega o crachá.
//   3. Esqueci minha senha .... o Supabase manda um link por e-mail;
//                               ao voltar (login.html?redefinir=1) a
//                               pessoa cria uma senha nova.
// =====================================================================
'use strict';

(function () {
  const $ = (id) => document.getElementById(id);
  const parametros = new URLSearchParams(window.location.search);

  function avisar(texto, tipo) {
    const aviso = $('aviso');
    aviso.textContent = texto || '';
    aviso.className = 'aviso' + (tipo ? ' ' + tipo : '');
  }

  // Deixa um botão "ocupado" enquanto espera o servidor responder.
  function ocupado(botao, sim) {
    botao.disabled = sim;
    botao.setAttribute('aria-busy', String(sim));
  }

  async function iniciar() {
    if (!CAA.configurado || !CAA.db) {
      avisar('O Supabase ainda não foi configurado (arquivo config.js). Veja o README.', 'erro');
      return;
    }

    // Erros que o Google/Supabase devolvem na URL (ex.: a pessoa cancelou).
    const hash = new URLSearchParams(window.location.hash.slice(1));
    const erroUrl = parametros.get('error_description') || hash.get('error_description');
    if (erroUrl) avisar(CAA.mensagemErro(erroUrl.replace(/\+/g, ' ')), 'erro');
    if (parametros.get('saiu')) avisar('Você saiu da sua conta.', 'info');

    const sessao = await CAA.auth.sessao();

    // Voltou pelo link de "esqueci minha senha"?
    if (parametros.get('redefinir')) {
      if (sessao) {
        $('bloco-entrar').hidden = true;
        $('form-nova-senha').hidden = false;
        avisar('Tudo certo! Agora escolha sua nova senha.', 'info');
        $('nova-senha').focus();
      } else {
        avisar('O link de nova senha expirou ou já foi usado. Peça outro em "Esqueci minha senha".', 'erro');
      }
      return;
    }

    // Já está logado? Vai direto para a Casa.
    if (sessao) window.location.replace('index.html');
  }

  // ---------------- 1. GOOGLE ----------------
  $('entrar-google').addEventListener('click', async (evento) => {
    const botao = evento.currentTarget;
    ocupado(botao, true);
    avisar('Abrindo o Google...', 'info');
    try {
      await CAA.auth.entrarComGoogle();
    } catch (erro) {
      avisar(CAA.mensagemErro(erro), 'erro');
      ocupado(botao, false);
    }
  });

  // ---------------- 2. E-MAIL E SENHA ----------------
  $('form-entrar').addEventListener('submit', async (evento) => {
    evento.preventDefault(); // não deixa a página recarregar
    const email = $('email').value.trim().toLowerCase();
    const senha = $('senha').value;
    if (!email || !senha) { avisar('Preencha o e-mail e a senha.', 'erro'); return; }

    const botao = $('botao-entrar');
    ocupado(botao, true);
    avisar('');
    const { error } = await CAA.db.auth.signInWithPassword({ email, password: senha });
    $('senha').value = ''; // a senha não fica parada na tela
    if (error) {
      avisar(CAA.mensagemErro(error), 'erro');
      ocupado(botao, false);
      return;
    }
    window.location.replace('index.html');
  });

  // ---------------- 3. ESQUECI MINHA SENHA ----------------
  $('esqueci').addEventListener('click', async () => {
    const email = $('email').value.trim().toLowerCase();
    if (!email) {
      avisar('Digite seu e-mail no campo acima e toque de novo em "Esqueci minha senha".', 'info');
      $('email').focus();
      return;
    }
    const { error } = await CAA.db.auth.resetPasswordForEmail(email, {
      redirectTo: CAA.auth.paginaDoSite('login.html') + '?redefinir=1',
    });
    // Por segurança a mensagem é a mesma exista ou não a conta.
    if (error && !/rate limit/i.test(error.message)) avisar(CAA.mensagemErro(error), 'erro');
    else avisar('Se existir uma conta com esse e-mail, enviamos um link para criar uma nova senha.', 'ok');
  });

  $('form-nova-senha').addEventListener('submit', async (evento) => {
    evento.preventDefault();
    const senha = $('nova-senha').value;
    if (senha.length < 8) { avisar('A senha precisa ter pelo menos 8 caracteres.', 'erro'); return; }
    if (senha !== $('nova-senha-2').value) { avisar('As duas senhas não são iguais.', 'erro'); return; }
    const { error } = await CAA.db.auth.updateUser({ password: senha });
    if (error) { avisar(CAA.mensagemErro(error), 'erro'); return; }
    avisar('Senha alterada! Entrando...', 'ok');
    setTimeout(() => window.location.replace('index.html'), 900);
  });

  iniciar().catch((erro) => avisar(CAA.mensagemErro(erro), 'erro'));
})();
