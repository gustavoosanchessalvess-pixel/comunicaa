// =====================================================================
// prancha.js · A PRANCHA DE COMUNICAÇÃO (tela Casa)
// ---------------------------------------------------------------------
// É aqui que a pessoa monta a mensagem:
//   1. toca nas figuras  -> elas entram na faixa da frase (e são faladas);
//   2. toca em FALAR     -> a voz lê a frase inteira, destacando cada figura;
//   3. toca em SALVAR    -> a frase vai para o banco (FRASE + CRIA + CONTEM)
//                           e aparece no Dicionário.
//
// Parábola: a faixa da frase é um "trenzinho". Cada figura tocada é um
// vagão que engata no fim. APAGAR tira o último vagão, LIMPAR desengata
// todos, e SALVAR manda o trem para a estação (o banco de dados).
// =====================================================================
'use strict';

(function () {
  const LIMITE_FIGURAS = 40;   // mesmo limite verificado no banco
  const POR_LOTE = 36;         // quantas figuras aparecem antes do "Mostrar mais"
  const ATALHOS = ['Não', 'Me ajuda', 'Pausa', 'Ir no banheiro'];
  const CHAVE_RASCUNHO = 'caa-mensagem-atual';

  let catalogo;                // tudo que veio do banco (catalogo.js)
  let mensagem = [];           // ids das figuras, na ordem em que foram tocadas
  let salvando = false;        // evita salvar duas vezes com toque duplo
  let filtro = null;           // categoria escolhida (id) ou 'todas'
  let limiteVisivel = POR_LOTE;

  // Atalhos para os elementos da página (document.getElementById = "ache pelo id").
  const $ = (id) => document.getElementById(id);

  CAA.iniciarPaginaInterna('casa', async () => {
    catalogo = await CAA.catalogo.carregar();

    // Se veio da tela Tabelas (index.html?categoria=12), abre aquela categoria.
    const pedida = Number(new URLSearchParams(window.location.search).get('categoria'));
    filtro = catalogo.categorias.has(pedida) ? pedida : (catalogo.maisUsados ? catalogo.maisUsados.id : 'todas');

    // Recupera a mensagem que estava sendo montada (se a pessoa trocou de tela).
    try { mensagem = (JSON.parse(sessionStorage.getItem(CHAVE_RASCUNHO)) || []).filter((id) => catalogo.palavras.has(id)); } catch (erro) { mensagem = []; }

    montarAtalhos();
    montarChips();
    montarLegenda();
    ligarBotoes();
    iniciarAjustesDeVoz();
    desenharGrade();
    desenharFrase();
  });

  // ------------------------------------------------------------------
  // TOCAR NUMA FIGURA
  // ------------------------------------------------------------------
  function escolher(palavra) {
    if (salvando) return;
    if (mensagem.length >= LIMITE_FIGURAS) {
      CAA.toast('A frase já tem ' + LIMITE_FIGURAS + ' figuras. Salve ou apague algumas.', 'erro');
      return;
    }
    mensagem.push(palavra.id);
    mudouMensagem();
    const faixa = $('frase-faixa');
    faixa.scrollLeft = faixa.scrollWidth; // rola até o último vagão
    if (CAA.prefs.ler('falar-ao-tocar', true)) CAA.voz.falar(CAA.voz.textoParaFala(palavra.texto));
  }

  function mudouMensagem() {
    try { sessionStorage.setItem(CHAVE_RASCUNHO, JSON.stringify(mensagem)); } catch (erro) { /* ignorado */ }
    desenharFrase();
  }

  // ------------------------------------------------------------------
  // DESENHAR A FAIXA DA FRASE
  // ------------------------------------------------------------------
  function desenharFrase() {
    const faixa = $('frase-faixa');
    faixa.replaceChildren();

    if (!mensagem.length) {
      const vazia = CAA.el('p', 'frase-vazia');
      vazia.append(CAA.icone('hand-index-thumb'), document.createTextNode('Toque nas figuras para montar sua frase'));
      faixa.append(vazia);
    }

    mensagem.forEach((id, posicao) => {
      const palavra = catalogo.palavras.get(id);
      const item = CAA.el('div', 'frase-item cl-' + palavra.classe);
      const imagem = document.createElement('img');
      imagem.src = palavra.imagem;
      imagem.alt = '';
      const tirar = CAA.el('button', 'tirar', '×');
      tirar.type = 'button';
      tirar.setAttribute('aria-label', 'Tirar ' + palavra.texto + ' da frase');
      tirar.addEventListener('click', () => {
        if (salvando) return;
        mensagem.splice(posicao, 1); // splice = recorta 1 item daquela posição
        mudouMensagem();
      });
      item.append(imagem, CAA.el('strong', '', palavra.texto), tirar);
      faixa.append(item);
    });

    $('frase-texto').textContent = textoDaFrase();
    const vazia = mensagem.length === 0;
    $('falar').disabled = vazia;
    $('apagar').disabled = vazia || salvando;
    $('limpar').disabled = vazia || salvando;
    $('salvar').disabled = vazia || salvando;
    $('salvar').setAttribute('aria-busy', String(salvando));
  }

  function textoDaFrase() {
    return mensagem.map((id) => catalogo.palavras.get(id).texto).join(' ');
  }

  // ------------------------------------------------------------------
  // BOTÕES DA FRASE: Falar, Apagar, Limpar, Salvar
  // ------------------------------------------------------------------
  function ligarBotoes() {
    $('falar').addEventListener('click', falarFrase);

    $('apagar').addEventListener('click', () => {
      mensagem.pop(); // pop = tira o último
      mudouMensagem();
    });

    $('limpar').addEventListener('click', () => {
      CAA.voz.parar();
      mensagem = [];
      mudouMensagem();
    });

    $('salvar').addEventListener('click', salvarFrase);

    // Busca: a cada letra digitada, a grade é redesenhada.
    $('busca').addEventListener('input', () => { limiteVisivel = POR_LOTE; desenharGrade(); });
    $('mostrar-mais').addEventListener('click', () => { limiteVisivel += POR_LOTE; desenharGrade(); });
  }

  // Fala a frase inteira e "levanta" cada figura quando ela é dita.
  function falarFrase() {
    if (!mensagem.length) return;
    const itens = [...document.querySelectorAll('#frase-faixa .frase-item')];
    const pedacos = mensagem.map((id) => CAA.voz.textoParaFala(catalogo.palavras.get(id).texto));

    // Descobre em qual letra começa cada figura dentro do texto falado.
    const inicios = [];
    let posicao = 0;
    pedacos.forEach((pedaco) => { inicios.push(posicao); posicao += pedaco.length + 1; });

    const destacar = (indice) => itens.forEach((item, i) => item.classList.toggle('falando', i === indice));
    destacar(0);
    CAA.voz.falar(pedacos.join(' '), {
      aoPassarPalavra: (letra) => {
        let indice = 0;
        inicios.forEach((inicio, i) => { if (letra >= inicio) indice = i; });
        destacar(indice);
      },
    }).then(() => destacar(-1));
  }

  // ------------------------------------------------------------------
  // SALVAR NO BANCO
  // Chama a função salvar_frase do Supabase, que grava FRASE, CRIA e
  // CONTEM de uma vez só (ou nada, se der erro).
  // ------------------------------------------------------------------
  async function salvarFrase() {
    if (salvando || !mensagem.length) return;
    salvando = true;
    desenharFrase();
    try {
      const { error } = await CAA.db.rpc('salvar_frase', {
        p_tipo_frase: classificarFrase(),
        p_palavras: mensagem,
      });
      if (error) throw error;
      comemorar();
      mensagem = [];
      mudouMensagem();
    } catch (erro) {
      console.error(erro);
      CAA.toast(CAA.mensagemErro(erro), 'erro');
    } finally {
      salvando = false;
      desenharFrase();
    }
  }

  // Descobre a INTENÇÃO da frase para a coluna tipo_frase:
  //   tem figura vermelha (dor, não, ajuda) ...... necessidade
  //   tem figura roxa (pergunta) ou "?" .......... pergunta
  //   tem "quero", "posso", "preciso" ............ pedido
  //   qualquer outra ............................. expressao
  function classificarFrase() {
    const palavras = mensagem.map((id) => catalogo.palavras.get(id));
    if (palavras.some((p) => p.classe === 'importante')) return 'necessidade';
    if (palavras.some((p) => p.classe === 'pergunta' || p.texto.includes('?'))) return 'pergunta';
    if (palavras.some((p) => /^(quero|posso|preciso|me da|pode)/.test(p.busca))) return 'pedido';
    return 'expressao';
  }

  // Estrelinha + confetes, como uma pequena conquista do Duolingo.
  // No Modo Foco a comemoração é mais discreta (sem confetes).
  function comemorar() {
    const festa = CAA.el('div', 'festa');
    festa.setAttribute('role', 'status');
    const cartao = CAA.el('div', 'festa-cartao');
    const estrela = CAA.icone('star-fill');
    estrela.classList.add('estrela');
    cartao.append(estrela, CAA.el('strong', '', 'Frase salva!'), CAA.el('span', '', 'Muito bem! Ela já está no Dicionário.'));
    festa.append(cartao);

    if (!document.body.classList.contains('foco')) {
      const cores = ['#37c26a', '#ffc43d', '#ff7bac', '#3fa9f5', '#a66bf0', '#ff9a3d'];
      for (let i = 0; i < 26; i++) {
        const confete = CAA.el('i', 'confete');
        const angulo = (Math.PI * 2 * i) / 26;
        const distancia = 140 + Math.random() * 120;
        // style.setProperty = define as "variáveis" que a animação do CSS usa.
        confete.style.setProperty('--x', Math.cos(angulo) * distancia + 'px');
        confete.style.setProperty('--y', Math.sin(angulo) * distancia + 'px');
        confete.style.setProperty('--r', Math.round(Math.random() * 540) + 'deg');
        confete.style.background = cores[i % cores.length];
        festa.append(confete);
      }
    }
    document.body.append(festa);
    setTimeout(() => festa.classList.add('saindo'), 1500);
    setTimeout(() => festa.remove(), 1800);
  }

  // ------------------------------------------------------------------
  // ATALHOS "Preciso dizer" (sempre visíveis, em qualquer categoria)
  // ------------------------------------------------------------------
  function montarAtalhos() {
    const caixa = $('atalhos-lista');
    ATALHOS.forEach((texto) => {
      const palavra = CAA.catalogo.acharPorTexto(catalogo, texto);
      if (!palavra) return;
      const botao = CAA.el('button', 'atalho');
      botao.type = 'button';
      const imagem = document.createElement('img');
      imagem.src = palavra.imagem;
      imagem.alt = '';
      botao.append(imagem, CAA.el('span', '', palavra.texto));
      botao.addEventListener('click', () => escolher(palavra));
      caixa.append(botao);
    });
  }

  // ------------------------------------------------------------------
  // PÍLULAS DE CATEGORIA (Mais usados, Comidas, Sentimentos, ..., Todas)
  // ------------------------------------------------------------------
  function montarChips() {
    const caixa = $('chips');
    const opcoes = [];
    if (catalogo.maisUsados) opcoes.push({ id: catalogo.maisUsados.id, nome: '⭐ Mais usados' });
    // Se veio de uma "cor" (classe) pela tela Tabelas, ela aparece como pílula também.
    const pedida = catalogo.categorias.get(filtro);
    if (pedida && pedida.tipo === 'classe') opcoes.push({ id: pedida.id, nome: pedida.nome });
    catalogo.assuntos.forEach((c) => opcoes.push({ id: c.id, nome: c.nome }));
    opcoes.push({ id: 'todas', nome: 'Todas as figuras' });

    opcoes.forEach((opcao) => {
      const chip = CAA.el('button', 'chip', opcao.nome);
      chip.type = 'button';
      chip.dataset.filtro = String(opcao.id);
      chip.setAttribute('aria-pressed', String(opcao.id === filtro));
      chip.addEventListener('click', () => {
        filtro = opcao.id;
        limiteVisivel = POR_LOTE;
        $('busca').value = '';
        caixa.querySelectorAll('.chip').forEach((c) => c.setAttribute('aria-pressed', String(c === chip)));
        desenharGrade();
      });
      caixa.append(chip);
    });

    // Rola as pílulas até a escolhida ficar visível.
    const ativa = caixa.querySelector('[aria-pressed="true"]');
    if (ativa) ativa.scrollIntoView({ block: 'nearest', inline: 'center' });
  }

  // ------------------------------------------------------------------
  // GRADE DE FIGURAS
  // ------------------------------------------------------------------
  function idsVisiveis() {
    const termo = CAA.normalizar($('busca').value.trim());
    // Com busca digitada, procura no catálogo INTEIRO.
    if (termo) return catalogo.todas.filter((id) => catalogo.palavras.get(id).busca.includes(termo));
    if (filtro === 'todas') return catalogo.todas;
    const categoria = catalogo.categorias.get(filtro);
    return categoria ? categoria.palavras : [];
  }

  function desenharGrade() {
    const grade = $('grade');
    const ids = idsVisiveis();
    grade.replaceChildren();

    ids.slice(0, limiteVisivel).forEach((id) => {
      grade.append(CAA.catalogo.criarCartao(catalogo.palavras.get(id), escolher));
    });

    if (!ids.length) {
      const vazio = CAA.el('p', 'estado-vazio');
      vazio.append(CAA.icone('search'), document.createTextNode('Nenhuma figura encontrada. Tente outra palavra.'));
      grade.append(vazio);
    }

    $('mostrar-mais').hidden = ids.length <= limiteVisivel;
    $('contador').textContent = ids.length ? ids.length + (ids.length === 1 ? ' figura' : ' figuras') : '';
  }

  // Legenda das cores (lida das próprias categorias do banco).
  function montarLegenda() {
    const lista = $('legenda-lista');
    catalogo.classes.forEach((classe) => {
      lista.append(CAA.el('span', 'cl-' + classe.classe, classe.nome));
    });
  }

  // ------------------------------------------------------------------
  // AJUSTES DE VOZ (janela <dialog>)
  // ------------------------------------------------------------------
  function iniciarAjustesDeVoz() {
    const janela = $('ajustes-voz');
    const seletor = $('voz-escolha');
    const aoTocar = $('voz-ao-tocar');

    $('abrir-ajustes').addEventListener('click', () => {
      preencherVozes();
      janela.showModal(); // abre a janela por cima da tela
    });
    $('fechar-ajustes').addEventListener('click', () => janela.close());

    // Lista de vozes, com a melhor (automática) primeiro.
    function preencherVozes() {
      const atual = CAA.prefs.ler('voz-nome', '');
      seletor.replaceChildren(new Option('Automática (melhor voz do aparelho)', ''));
      CAA.voz.lista().forEach((voz) => {
        seletor.add(new Option(voz.name.replace(/\s*-\s*Portuguese.*$/i, ''), voz.voiceURI));
      });
      seletor.value = [...seletor.options].some((o) => o.value === atual) ? atual : '';
      if (!CAA.voz.disponivel) {
        seletor.disabled = true;
        $('voz-aviso').textContent = 'Este navegador não oferece voz. Tente o Chrome, o Edge ou o Safari.';
      }
    }
    document.addEventListener('caa:vozes', () => { if (janela.open) preencherVozes(); });

    seletor.addEventListener('change', () => {
      CAA.prefs.salvar('voz-nome', seletor.value);
      CAA.voz.falar('Olá! Esta é a minha voz.');
    });

    // Velocidade: Devagar / Normal / Rápido
    const velocidade = CAA.prefs.ler('voz-velocidade', 'normal');
    document.querySelectorAll('#voz-velocidade button').forEach((botao) => {
      botao.setAttribute('aria-pressed', String(botao.dataset.valor === velocidade));
      botao.addEventListener('click', () => {
        CAA.prefs.salvar('voz-velocidade', botao.dataset.valor);
        document.querySelectorAll('#voz-velocidade button').forEach((b) => b.setAttribute('aria-pressed', String(b === botao)));
        CAA.voz.falar('Vamos conversar?');
      });
    });

    // Falar ao tocar na figura (liga/desliga)
    aoTocar.setAttribute('aria-pressed', String(CAA.prefs.ler('falar-ao-tocar', true)));
    aoTocar.addEventListener('click', () => {
      const ligado = aoTocar.getAttribute('aria-pressed') !== 'true';
      aoTocar.setAttribute('aria-pressed', String(ligado));
      CAA.prefs.salvar('falar-ao-tocar', ligado);
    });

    $('testar-voz').addEventListener('click', () => CAA.voz.falar('Oi! Eu sou a voz do CAA. Vamos conversar?'));
  }
})();
