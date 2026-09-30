// =====================================================================
// dicionario.js · TELA "DICIONÁRIO" (progresso + histórico de frases)
// ---------------------------------------------------------------------
// Busca no banco as frases da pessoa logada (função minhas_frases, que
// junta FRASE + CRIA + CONTEM + PALAVRAS_PECS) e mostra:
//   * números do progresso (frases, dias seguidos, média, vocabulário);
//   * gráfico dos últimos 7 dias;
//   * tipos de frase (pedido, pergunta, necessidade, expressão);
//   * "meu dicionário": as figuras mais usadas;
//   * o histórico, com botões Ouvir e Apagar.
//
// Parábola: é o "boletim" gentil do aluno. Não dá nota nem diz
// "aprendeu"; só mostra o caminho que a pessoa já percorreu, para a
// família e os profissionais acompanharem a evolução.
// =====================================================================
'use strict';

(function () {
  const TIPOS = {
    pedido: 'Pedidos',
    pergunta: 'Perguntas',
    necessidade: 'Necessidades',
    expressao: 'Expressões',
  };
  const POR_LOTE = 20;

  let catalogo;
  let frases = [];
  let limiteHistorico = POR_LOTE;

  const $ = (id) => document.getElementById(id);

  CAA.iniciarPaginaInterna('dicionario', async () => {
    // Promise.all = faz os dois pedidos AO MESMO TEMPO (mais rápido).
    const [cat, resposta] = await Promise.all([
      CAA.catalogo.carregar(),
      CAA.db.rpc('minhas_frases', { p_limite: 500 }),
    ]);
    if (resposta.error) throw resposta.error;
    catalogo = cat;
    frases = resposta.data || [];
    $('mais-historico').addEventListener('click', () => { limiteHistorico += POR_LOTE; desenharHistorico(); });
    desenharTudo();
  });

  function desenharTudo() {
    desenharNumeros();
    desenharSemana();
    desenharTipos();
    desenharVocabulario();
    desenharHistorico();
  }

  // ------------------------------------------------------------------
  // NÚMEROS DO TOPO
  // ------------------------------------------------------------------
  function desenharNumeros() {
    const totalFiguras = frases.reduce((soma, f) => soma + f.qtd_palavras, 0);
    const media = frases.length ? totalFiguras / frases.length : 0;
    const diferentes = new Set(frases.flatMap((f) => f.palavras.map((p) => p.id_palavra))).size;

    $('n-frases').textContent = frases.length;
    $('n-sequencia').textContent = diasSeguidos();
    $('n-media').textContent = media.toLocaleString('pt-BR', { maximumFractionDigits: 1 });
    $('n-vocabulario').textContent = diferentes;
  }

  // Quantos dias seguidos (até hoje ou ontem) têm pelo menos uma frase.
  // É a "chama" do Duolingo: incentiva usar um pouquinho todo dia.
  function diasSeguidos() {
    const dias = new Set(frases.map((f) => CAA.chaveDia(f.data_frase)));
    const cursor = new Date();
    if (!dias.has(CAA.chaveDia(cursor))) cursor.setDate(cursor.getDate() - 1); // ainda dá tempo hoje
    let contagem = 0;
    while (dias.has(CAA.chaveDia(cursor))) {
      contagem += 1;
      cursor.setDate(cursor.getDate() - 1);
    }
    return contagem;
  }

  // ------------------------------------------------------------------
  // GRÁFICO DA SEMANA (barras feitas só com CSS)
  // ------------------------------------------------------------------
  function desenharSemana() {
    const caixa = $('semana');
    caixa.replaceChildren();
    const porDia = {};
    frases.forEach((f) => { const dia = CAA.chaveDia(f.data_frase); porDia[dia] = (porDia[dia] || 0) + 1; });

    const dias = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      dias.push(d);
    }
    const maximo = Math.max(1, ...dias.map((d) => porDia[CAA.chaveDia(d)] || 0));

    dias.forEach((d, indice) => {
      const quantidade = porDia[CAA.chaveDia(d)] || 0;
      const coluna = CAA.el('div', 'dia' + (indice === 6 ? ' hoje' : ''));
      const fundo = CAA.el('div', 'barra-fundo');
      const barra = CAA.el('div', 'barra');
      barra.style.height = '0%';
      fundo.append(barra);
      const nomeDia = indice === 6 ? 'Hoje' : d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
      coluna.append(fundo, CAA.el('b', '', quantidade), CAA.el('small', '', nomeDia));
      coluna.setAttribute('aria-label', nomeDia + ': ' + quantidade + ' frases');
      caixa.append(coluna);
      // Anima a barra crescendo depois que ela aparece na tela.
      requestAnimationFrame(() => requestAnimationFrame(() => { barra.style.height = Math.max(quantidade ? 8 : 0, (quantidade / maximo) * 100) + '%'; }));
    });
  }

  // ------------------------------------------------------------------
  // TIPOS DE FRASE (coluna tipo_frase da tabela FRASE)
  // ------------------------------------------------------------------
  function desenharTipos() {
    const caixa = $('tipos');
    caixa.replaceChildren();
    const contagem = { pedido: 0, pergunta: 0, necessidade: 0, expressao: 0 };
    frases.forEach((f) => { if (f.tipo_frase in contagem) contagem[f.tipo_frase] += 1; });
    const maximo = Math.max(1, ...Object.values(contagem));

    Object.entries(TIPOS).forEach(([tipo, nome]) => {
      const linha = CAA.el('div', 'tipo-linha t-' + tipo);
      const trilho = CAA.el('div', 'trilho');
      const barra = CAA.el('i');
      barra.style.width = (contagem[tipo] / maximo) * 100 + '%';
      trilho.append(barra);
      linha.append(CAA.el('span', '', nome), trilho, CAA.el('b', '', contagem[tipo]));
      caixa.append(linha);
    });
  }

  // ------------------------------------------------------------------
  // MEU DICIONÁRIO: figuras mais usadas
  // ------------------------------------------------------------------
  function desenharVocabulario() {
    const caixa = $('vocabulario');
    caixa.replaceChildren();
    const usos = new Map();
    frases.forEach((f) => f.palavras.forEach((p) => usos.set(p.id_palavra, (usos.get(p.id_palavra) || 0) + 1)));

    const maisUsadas = [...usos.entries()].sort((a, b) => b[1] - a[1]).slice(0, 18);
    if (!maisUsadas.length) {
      caixa.append(estadoVazio('Suas figuras favoritas vão aparecer aqui.'));
      return;
    }
    maisUsadas.forEach(([id, vezes]) => {
      const palavra = catalogo.palavras.get(id);
      if (!palavra) return;
      const item = CAA.el('div', 'palavra-usada cl-' + palavra.classe);
      const imagem = document.createElement('img');
      imagem.src = palavra.imagem;
      imagem.alt = '';
      imagem.loading = 'lazy';
      const selo = CAA.el('span', 'vezes', vezes + '×');
      selo.setAttribute('aria-label', 'usada ' + vezes + ' vezes');
      item.append(selo, imagem, CAA.el('strong', '', palavra.texto));
      caixa.append(item);
    });
  }

  // ------------------------------------------------------------------
  // HISTÓRICO DE FRASES
  // ------------------------------------------------------------------
  function desenharHistorico() {
    const caixa = $('historico');
    caixa.replaceChildren();

    if (!frases.length) {
      const vazio = estadoVazio('Nenhuma frase salva ainda. Monte uma frase na Casa e toque em Salvar.');
      const ir = CAA.el('a', 'botao verde', 'Ir para a Casa');
      ir.href = 'index.html';
      vazio.append(document.createElement('br'), ir);
      caixa.append(vazio);
      $('mais-historico').hidden = true;
      return;
    }

    frases.slice(0, limiteHistorico).forEach((frase) => {
      const registro = CAA.el('article', 'registro');
      const corpo = CAA.el('div');

      const topo = CAA.el('div', 'registro-topo');
      topo.append(
        CAA.el('span', 'etiqueta t-' + frase.tipo_frase, TIPOS[frase.tipo_frase] ? TIPOS[frase.tipo_frase].replace(/s$/, '') : frase.tipo_frase),
        CAA.el('span', '', CAA.formatarData(frase.data_frase)),
        CAA.el('span', '', '· ' + frase.qtd_palavras + (frase.qtd_palavras === 1 ? ' figura' : ' figuras')),
      );

      const figuras = CAA.el('div', 'registro-figuras');
      frase.palavras.forEach((p) => {
        const imagem = document.createElement('img');
        imagem.src = p.imagem_pecs;
        imagem.alt = p.txt_palavra;
        imagem.loading = 'lazy';
        figuras.append(imagem);
      });

      const texto = frase.palavras.map((p) => p.txt_palavra).join(' ');
      corpo.append(topo, figuras, CAA.el('p', 'registro-frase', texto));

      const acoes = CAA.el('div', 'registro-acoes');
      const ouvir = CAA.el('button', 'botao verde pequeno');
      ouvir.type = 'button';
      ouvir.append(CAA.icone('play-fill'), CAA.el('span', '', 'Ouvir'));
      ouvir.addEventListener('click', () => CAA.voz.falar(frase.palavras.map((p) => CAA.voz.textoParaFala(p.txt_palavra)).join(' ')));

      const apagar = CAA.el('button', 'botao-icone');
      apagar.type = 'button';
      apagar.setAttribute('aria-label', 'Apagar a frase ' + texto);
      apagar.title = 'Apagar';
      apagar.append(CAA.icone('trash3'));
      apagar.addEventListener('click', () => apagarFrase(frase, apagar));

      acoes.append(ouvir, apagar);
      registro.append(corpo, acoes);
      caixa.append(registro);
    });

    $('mais-historico').hidden = frases.length <= limiteHistorico;
  }

  // Apaga a FRASE no banco. Por causa do "on delete cascade", as linhas
  // de CRIA e CONTEM ligadas a ela somem junto.
  async function apagarFrase(frase, botao) {
    if (!window.confirm('Apagar esta frase do histórico?')) return;
    botao.disabled = true;
    const { error } = await CAA.db.from('frase').delete().eq('id_frase', frase.id_frase);
    if (error) {
      botao.disabled = false;
      CAA.toast(CAA.mensagemErro(error), 'erro');
      return;
    }
    frases = frases.filter((f) => f.id_frase !== frase.id_frase);
    desenharTudo();
    CAA.toast('Frase apagada.');
  }

  function estadoVazio(texto) {
    const p = CAA.el('div', 'estado-vazio');
    p.append(CAA.icone('chat-heart'), document.createTextNode(texto));
    return p;
  }
})();
