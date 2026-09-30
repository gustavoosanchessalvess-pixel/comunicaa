// =====================================================================
// interface.js · A "MOLDURA" DAS TELAS INTERNAS
// ---------------------------------------------------------------------
// Monta, em um só lugar, o que se repete em Casa, Tabelas e Dicionário:
//   * o menu lateral (computador) e as abas de baixo (celular);
//   * o cartão com o nome da pessoa logada e o botão Sair;
//   * o cumprimento "Olá, Ana!";
//   * o MODO CRIANÇA (tela simples para a pessoa autista usar sozinha).
//
// Parábola: é o "molde de bolo". Cada página só coloca o recheio
// (o conteúdo do <main>); a forma é sempre a mesma.
// =====================================================================
'use strict';

(function () {
  const PAGINAS = [
    { id: 'casa',       href: 'index.html',      nome: 'Casa',       icone: 'house-door-fill', cor: 'i-casa' },
    { id: 'tabelas',    href: 'tabelas.html',    nome: 'Tabelas',    icone: 'grid-3x3-gap-fill', cor: 'i-tabelas' },
    { id: 'dicionario', href: 'dicionario.html', nome: 'Dicionário', icone: 'book-half',       cor: 'i-dicionario' },
  ];

  CAA.montarEstrutura = function (paginaAtual, usuario) {
    // ---------- MENU LATERAL ----------
    const lateral = CAA.el('aside', 'lateral');
    lateral.setAttribute('aria-label', 'Menu');

    const marca = CAA.el('a', 'marca');
    marca.href = 'index.html';
    marca.setAttribute('aria-label', 'CAA: voltar para a Casa');
    // Só o logo, bem grande (sem textos ao lado), como pediu o grupo.
    const logo = document.createElement('img');
    logo.src = 'assets/logo-caa.png';
    logo.alt = 'CAA';
    logo.width = 168;
    logo.height = 168;
    marca.append(logo);

    const menu = CAA.el('nav', 'menu');
    menu.setAttribute('aria-label', 'Menu principal');
    PAGINAS.forEach((pagina) => {
      const link = CAA.el('a');
      link.href = pagina.href;
      const icone = CAA.el('span', 'icone ' + pagina.cor);
      icone.append(CAA.icone(pagina.icone));
      link.append(icone, CAA.el('span', '', pagina.nome));
      if (pagina.id === paginaAtual) link.setAttribute('aria-current', 'page');
      menu.append(link);
    });

    // Cartão da conta: iniciais, nome, perfil e botão Sair.
    const conta = CAA.el('div', 'conta');
    const avatar = CAA.el('span', 'avatar', iniciais(usuario.nome_completo));
    avatar.setAttribute('aria-hidden', 'true');
    const textoConta = CAA.el('div', 'conta-texto');
    textoConta.append(
      CAA.el('strong', '', usuario.nome_completo),
      CAA.el('small', '', CAA.auth.PERFIS[usuario.perfil] || ''),
    );
    const botaoSair = CAA.el('button', 'botao-icone');
    botaoSair.type = 'button';
    botaoSair.title = 'Sair';
    botaoSair.setAttribute('aria-label', 'Sair da conta');
    botaoSair.append(CAA.icone('box-arrow-right'));
    botaoSair.addEventListener('click', confirmarSaida);
    conta.append(avatar, textoConta, botaoSair);

    lateral.append(marca, menu, conta);

    // ---------- ABAS DE BAIXO (celular) ----------
    const abas = CAA.el('nav', 'abas');
    abas.setAttribute('aria-label', 'Menu principal');
    PAGINAS.forEach((pagina) => {
      const link = CAA.el('a');
      link.href = pagina.href;
      link.append(CAA.icone(pagina.icone), CAA.el('span', '', pagina.nome));
      if (pagina.id === paginaAtual) link.setAttribute('aria-current', 'page');
      abas.append(link);
    });
    const abaSair = CAA.el('button');
    abaSair.type = 'button';
    abaSair.append(CAA.icone('box-arrow-right'), CAA.el('span', '', 'Sair'));
    abaSair.addEventListener('click', confirmarSaida);
    abas.append(abaSair);

    // "prepend" = coloca no começo do <body>; "append" = no fim.
    document.body.prepend(lateral);
    document.body.append(abas);

    // ---------- CUMPRIMENTO ----------
    const saudacao = document.getElementById('saudacao');
    if (saudacao) saudacao.textContent = 'Olá, ' + CAA.primeiroNome(usuario.nome_completo) + '!';

  };

  // -------------------------------------------------------------------
  // MODO CRIANÇA
  // Quem decide: o PERFIL da conta (tabela USUARIO).
  //   * perfil "autista" ............ abre SEMPRE no Modo Criança;
  //   * "responsavel"/"profissional"  abre no Modo Adulto e pode ligar o
  //                                    Modo Criança para entregar o aparelho.
  // A escolha fica guardada neste aparelho (localStorage).
  // Parábola: é o "modo avião" do celular, só que para crianças: a
  // tela fica simples e só um adulto (segurando o cadeado) desliga.
  // -------------------------------------------------------------------
  CAA.modoCrianca = {
    ativo() {
      const salvo = CAA.prefs.ler('modo-crianca', null);
      if (salvo === null) return Boolean(CAA.usuario && CAA.usuario.perfil === 'autista');
      return salvo === true;
    },
    ligar() { CAA.prefs.salvar('modo-crianca', true); window.location.href = 'index.html'; },
    desligar() { CAA.prefs.salvar('modo-crianca', false); window.location.href = 'index.html'; },
    // Nível de apoio escolhido pelo responsável: 3 = muito apoio (poucas figuras, enormes).
    nivel() { return Number(CAA.prefs.ler('nivel-apoio', 2)) || 2; },
  };

  function confirmarSaida() {
    if (window.confirm('Deseja sair da sua conta neste aparelho?')) CAA.auth.sair();
  }

  // "Ana Clara Souza" -> "AS"
  function iniciais(nome) {
    const partes = String(nome || '?').trim().split(/\s+/);
    const primeira = partes[0] ? partes[0][0] : '?';
    const ultima = partes.length > 1 ? partes[partes.length - 1][0] : '';
    return (primeira + ultima).toUpperCase();
  }

  // -------------------------------------------------------------------
  // Início padrão de uma página interna: confere o login, monta a
  // moldura e só então chama a função própria da página.
  // -------------------------------------------------------------------
  CAA.iniciarPaginaInterna = async function (paginaAtual, iniciarConteudo) {
    try {
      const usuario = await CAA.auth.exigirUsuario();
      // No Modo Criança só existe a Casa: Tabelas e Dicionário são dos adultos.
      if (CAA.modoCrianca.ativo()) {
        if (paginaAtual !== 'casa') { window.location.replace('index.html'); return; }
        document.body.classList.add('crianca');
      }
      CAA.montarEstrutura(paginaAtual, usuario);
      await iniciarConteudo(usuario);
    } catch (erro) {
      console.error(erro);
      CAA.toast(CAA.mensagemErro(erro), 'erro');
    } finally {
      CAA.esconderCarregando();
    }
  };
})();
