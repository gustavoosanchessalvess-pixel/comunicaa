// =====================================================================
// dicionario.js · PROGRESSO (responsável) e RELATÓRIOS (profissional)
// ---------------------------------------------------------------------
// Tudo vem da função minhas_frases do banco (FRASE + CRIA + CONTEM +
// PALAVRAS_PECS). Nenhuma tabela nova: os números são CALCULADOS aqui.
//
// O que é medido (indicadores usados no acompanhamento de CAA por
// fonoaudiólogos e psicólogos):
//   * frequência de uso ........ quantas frases por dia / em quantos dias
//   * vocabulário .............. quantas figuras DIFERENTES foram usadas
//   * tamanho da frase ......... média de figuras por frase (1 figura ->
//                                combinações de 2 ou mais é sinal de avanço)
//   * funções comunicativas .... para que a pessoa comunicou: pedir,
//                                perguntar, avisar necessidade, se expressar
//
// RESPONSÁVEL vê o essencial em linguagem simples + dicas para a família.
// PROFISSIONAL vê mais: período de 7/30/90 dias, comparação com o período
// anterior, evolução semanal, vocabulário acumulado, classes de palavras,
// horários de uso, exportar CSV e imprimir.
//
// Parábola: é o "boletim da comunicação". O pai lê o resumo e os
// gráficos principais; o profissional abre a ficha completa.
// Nunca compara com outras crianças: só a pessoa com ela mesma.
// =====================================================================
'use strict';

(function () {
  const TIPOS = [
    { id: 'pedido', nome: 'Pedidos', singular: 'Pedido' },
    { id: 'pergunta', nome: 'Perguntas', singular: 'Pergunta' },
    { id: 'necessidade', nome: 'Necessidades', singular: 'Necessidade' },
    { id: 'expressao', nome: 'Expressões', singular: 'Expressão' },
  ];
  const POR_LOTE = 20;
  const DIA = 24 * 60 * 60 * 1000;

  let catalogo;
  let frases = [];
  let profissional = false;
  let periodo = 7;
  let limiteHistorico = POR_LOTE;
  const $ = (id) => document.getElementById(id);

  CAA.iniciarPaginaInterna('dicionario', async (usuario) => {
    profissional = usuario.perfil === 'profissional';
    document.body.classList.toggle('visao-profissional', profissional);
    const nomes = CAA.nomesDoPerfil(usuario.perfil);
    $('titulo-pagina').textContent = nomes.dicionario;
    document.title = nomes.dicionario + ' · CAA';
    $('subtitulo-pagina').textContent = profissional
      ? 'Indicadores de uso da CAA para acompanhar o atendimento.'
      : 'Acompanhe como a comunicação está acontecendo no dia a dia.';

    const [cat, resposta] = await Promise.all([
      CAA.catalogo.carregar(),
      CAA.db.rpc('minhas_frases', { p_limite: 500 }),
    ]);
    if (resposta.error) throw resposta.error;
    catalogo = cat;
    frases = resposta.data || [];

    // Seletor de período (7 / 30 / 90 dias)
    document.querySelectorAll('#periodo button').forEach((botao) => {
      botao.addEventListener('click', () => {
        periodo = Number(botao.dataset.dias);
        document.querySelectorAll('#periodo button').forEach((b) => b.setAttribute('aria-pressed', String(b === botao)));
        desenharTudo();
      });
    });
    $('mais-historico').addEventListener('click', () => { limiteHistorico += POR_LOTE; desenharHistorico(); });
    $('exportar').addEventListener('click', exportarCSV);
    $('imprimir').addEventListener('click', () => window.print());
    desenharTudo();
  });

  // ------------------------------------------------------------------
  // CÁLCULOS
  // ------------------------------------------------------------------
  const tempo = (f) => new Date(f.data_frase).getTime();
  function noPeriodo(dias, deslocamento) {
    const fim = Date.now() - (deslocamento || 0) * dias * DIA;
    const inicio = fim - dias * DIA;
    return frases.filter((f) => tempo(f) > inicio && tempo(f) <= fim);
  }

  function indicadores(lista) {
    const figuras = lista.reduce((s, f) => s + f.qtd_palavras, 0);
    const diferentes = new Set(lista.flatMap((f) => f.palavras.map((p) => p.id_palavra)));
    const dias = new Set(lista.map((f) => CAA.chaveDia(f.data_frase)));
    const combinacoes = lista.filter((f) => f.qtd_palavras >= 2).length;
    return {
      frases: lista.length,
      dias: dias.size,
      vocabulario: diferentes.size,
      media: lista.length ? figuras / lista.length : 0,
      combinacoes: lista.length ? Math.round((combinacoes / lista.length) * 100) : 0,
    };
  }

  // Figuras usadas pela 1ª vez dentro do período (crescimento do vocabulário).
  function vocabularioNovo(dias) {
    const corte = Date.now() - dias * DIA;
    const antes = new Set(frases.filter((f) => tempo(f) <= corte).flatMap((f) => f.palavras.map((p) => p.id_palavra)));
    const agora = new Set(frases.filter((f) => tempo(f) > corte).flatMap((f) => f.palavras.map((p) => p.id_palavra)));
    return [...agora].filter((id) => !antes.has(id)).length;
  }

  const fmt = (n, casas) => n.toLocaleString('pt-BR', { maximumFractionDigits: casas || 0 });

  // ------------------------------------------------------------------
  // DESENHO
  // ------------------------------------------------------------------
  function desenharTudo() {
    const atual = noPeriodo(periodo);
    desenharResumo(atual);
    desenharNumeros(atual);
    desenharFrequencia();
    desenharFuncoes(atual);
    desenharVocabulario(atual);
    if (profissional) {
      desenharEvolucao();
      desenharClasses(atual);
      desenharHorarios(atual);
    }
    desenharHistorico();
  }

  function desenharResumo(atual) {
    const k = indicadores(atual);
    const nome = profissional ? 'o paciente' : 'a criança';
    if (!frases.length) {
      $('resumo').textContent = 'Ainda não há frases salvas. No Modo Criança, cada frase falada aparece aqui automaticamente.';
      return;
    }
    if (!k.frases) {
      $('resumo').textContent = 'Nenhuma frase nos últimos ' + periodo + ' dias. Que tal oferecer a prancha numa rotina do dia (lanche, banho, brincadeira)?';
      return;
    }
    const top = maisUsadas(atual, 3).map((id) => (catalogo.palavras.get(id) || {}).texto).filter(Boolean);
    $('resumo').textContent =
      'Nos últimos ' + periodo + ' dias, ' + nome + ' se comunicou em ' + k.dias + (k.dias === 1 ? ' dia' : ' dias') +
      ', com ' + k.frases + (k.frases === 1 ? ' frase' : ' frases') + ' e ' + k.vocabulario + ' figuras diferentes. ' +
      (top.length ? 'As mais usadas foram: ' + top.join(', ') + '.' : '');
  }

  function cartaoNumero(icone, cor, valor, rotulo, variacao) {
    const c = CAA.el('div', 'numero ' + cor);
    const i = CAA.icone(icone);
    c.append(i, CAA.el('strong', '', valor), CAA.el('span', '', rotulo));
    if (variacao) c.append(CAA.el('small', 'variacao ' + variacao.classe, variacao.texto));
    return c;
  }

  function variacao(agora, antes, casas) {
    if (!profissional) return null;
    const d = agora - antes;
    if (Math.abs(d) < 0.05) return { classe: 'igual', texto: 'igual ao período anterior' };
    return { classe: d > 0 ? 'sobe' : 'desce', texto: (d > 0 ? '▲ ' : '▼ ') + fmt(Math.abs(d), casas) + ' vs. período anterior' };
  }

  function desenharNumeros(atual) {
    const k = indicadores(atual);
    const a = indicadores(noPeriodo(periodo, 1));
    const caixa = $('numeros');
    caixa.replaceChildren(
      cartaoNumero('chat-square-heart-fill', 'frases', fmt(k.frases), 'frases no período', variacao(k.frases, a.frases)),
      cartaoNumero('calendar-check-fill', 'fogo', k.dias + ' de ' + periodo, 'dias com uso', variacao(k.dias, a.dias)),
      cartaoNumero('book-half', 'vocab', fmt(k.vocabulario), 'figuras diferentes', variacao(k.vocabulario, a.vocabulario)),
      cartaoNumero('bar-chart-fill', 'media', fmt(k.media, 1), 'figuras por frase (média)', variacao(k.media, a.media, 1)),
    );
    if (profissional) {
      caixa.append(
        cartaoNumero('link-45deg', 'frases', k.combinacoes + '%', 'frases com 2+ figuras', variacao(k.combinacoes, a.combinacoes)),
        cartaoNumero('stars', 'vocab', fmt(vocabularioNovo(periodo)), 'figuras novas no período'),
      );
    }
  }

  // Frases por dia (7 ou 30 dias) ou por semana (90 dias).
  function desenharFrequencia() {
    const dados = [];
    if (periodo <= 30) {
      for (let i = periodo - 1; i >= 0; i--) {
        const d = new Date(); d.setDate(d.getDate() - i);
        const chave = CAA.chaveDia(d);
        const valor = frases.filter((f) => CAA.chaveDia(f.data_frase) === chave).length;
        const rotulo = periodo === 7 ? (i === 0 ? 'Hoje' : d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')) : d.getDate() + '/' + (d.getMonth() + 1);
        dados.push({ rotulo, valor, destaque: i === 0 });
      }
      $('titulo-frequencia').textContent = 'Frases por dia';
    } else {
      for (let s = 12; s >= 0; s--) {
        const fim = Date.now() - s * 7 * DIA, inicio = fim - 7 * DIA;
        const d = new Date(fim);
        dados.push({ rotulo: d.getDate() + '/' + (d.getMonth() + 1), valor: frases.filter((f) => tempo(f) > inicio && tempo(f) <= fim).length, destaque: s === 0 });
      }
      $('titulo-frequencia').textContent = 'Frases por semana';
    }
    CAA.graficos.barras($('grafico-frequencia'), dados, { descricao: $('titulo-frequencia').textContent });
  }

  function desenharFuncoes(atual) {
    CAA.graficos.horizontais($('funcoes'), TIPOS.map((t) => ({
      rotulo: t.nome, valor: atual.filter((f) => f.tipo_frase === t.id).length, classe: 't-' + t.id,
    })));
  }

  // Evolução semanal (profissional): tamanho médio da frase e vocabulário acumulado.
  function desenharEvolucao() {
    const semanas = [];
    for (let s = 11; s >= 0; s--) {
      const fim = Date.now() - s * 7 * DIA;
      semanas.push({ fim, inicio: fim - 7 * DIA });
    }
    const rotulo = (w) => { const d = new Date(w.fim); return d.getDate() + '/' + (d.getMonth() + 1); };
    CAA.graficos.linha($('grafico-media'), semanas.map((w) => {
      const lista = frases.filter((f) => tempo(f) > w.inicio && tempo(f) <= w.fim);
      const m = lista.length ? lista.reduce((s, f) => s + f.qtd_palavras, 0) / lista.length : 0;
      return { rotulo: rotulo(w), valor: Math.round(m * 10) / 10 };
    }), { descricao: 'Tamanho médio da frase por semana' });
    CAA.graficos.linha($('grafico-vocabulario'), semanas.map((w) => ({
      rotulo: rotulo(w),
      valor: new Set(frases.filter((f) => tempo(f) <= w.fim).flatMap((f) => f.palavras.map((p) => p.id_palavra))).size,
    })), { descricao: 'Vocabulário acumulado (figuras diferentes já usadas)' });
  }

  // Classes de palavras (cores de Fitzgerald), a partir das categorias do banco.
  function desenharClasses(atual) {
    const contagem = new Map();
    atual.forEach((f) => f.palavras.forEach((p) => {
      const palavra = catalogo.palavras.get(p.id_palavra);
      const classe = palavra ? palavra.classe : 'diverso';
      contagem.set(classe, (contagem.get(classe) || 0) + 1);
    }));
    CAA.graficos.horizontais($('classes'), catalogo.classes
      .map((c) => ({ rotulo: c.nome, valor: contagem.get(c.classe) || 0, cor: 'var(--c-' + c.classe + ')' }))
      .sort((a, b) => b.valor - a.valor));
  }

  function desenharHorarios(atual) {
    const faixas = [['Manhã (6h–12h)', 6, 12], ['Tarde (12h–18h)', 12, 18], ['Noite (18h–24h)', 18, 24], ['Madrugada (0h–6h)', 0, 6]];
    CAA.graficos.horizontais($('horarios'), faixas.map(([rotulo, de, ate]) => ({
      rotulo, valor: atual.filter((f) => { const h = new Date(f.data_frase).getHours(); return h >= de && h < ate; }).length, classe: 't-expressao',
    })));
  }

  function maisUsadas(lista, limite) {
    const usos = new Map();
    lista.forEach((f) => f.palavras.forEach((p) => usos.set(p.id_palavra, (usos.get(p.id_palavra) || 0) + 1)));
    return [...usos.entries()].sort((a, b) => b[1] - a[1]).slice(0, limite).map(([id]) => id);
  }

  function desenharVocabulario(atual) {
    const caixa = $('vocabulario');
    caixa.replaceChildren();
    const usos = new Map();
    atual.forEach((f) => f.palavras.forEach((p) => usos.set(p.id_palavra, (usos.get(p.id_palavra) || 0) + 1)));
    const ids = maisUsadas(atual, profissional ? 24 : 12);
    if (!ids.length) { caixa.append(estadoVazio('As figuras mais usadas no período vão aparecer aqui.')); return; }
    ids.forEach((id) => {
      const palavra = catalogo.palavras.get(id);
      if (!palavra) return;
      const item = CAA.el('button', 'palavra-usada cl-' + palavra.classe);
      item.type = 'button';
      item.title = 'Ouvir ' + palavra.texto;
      const imagem = document.createElement('img');
      imagem.src = palavra.imagem; imagem.alt = ''; imagem.loading = 'lazy';
      item.append(CAA.el('span', 'vezes', usos.get(id) + '×'), imagem, CAA.el('strong', '', palavra.texto));
      item.addEventListener('click', () => CAA.voz.falar(CAA.voz.textoParaFala(palavra.texto)));
      caixa.append(item);
    });
  }

  // ------------------------------------------------------------------
  // HISTÓRICO (separado por dia)
  // ------------------------------------------------------------------
  function nomeDoDia(iso) {
    const chave = CAA.chaveDia(iso);
    const hoje = new Date(), ontem = new Date(); ontem.setDate(hoje.getDate() - 1);
    if (chave === CAA.chaveDia(hoje)) return 'Hoje';
    if (chave === CAA.chaveDia(ontem)) return 'Ontem';
    const t = new Date(iso).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
    return t.charAt(0).toUpperCase() + t.slice(1);
  }

  function desenharHistorico() {
    const caixa = $('historico');
    caixa.replaceChildren();
    if (!frases.length) {
      const vazio = estadoVazio('Nenhuma frase salva ainda.');
      const ir = CAA.el('a', 'botao verde', 'Ir para a prancha');
      ir.href = 'index.html';
      vazio.append(document.createElement('br'), ir);
      caixa.append(vazio);
      $('mais-historico').hidden = true;
      return;
    }
    let diaAtual = '';
    frases.slice(0, limiteHistorico).forEach((frase) => {
      const dia = nomeDoDia(frase.data_frase);
      if (dia !== diaAtual) { diaAtual = dia; caixa.append(CAA.el('h3', 'dia-titulo', dia)); }
      const registro = CAA.el('article', 'registro');
      const corpo = CAA.el('div');
      const topo = CAA.el('div', 'registro-topo');
      const tipo = TIPOS.find((t) => t.id === frase.tipo_frase);
      topo.append(
        CAA.el('span', 'etiqueta t-' + frase.tipo_frase, tipo ? tipo.singular : frase.tipo_frase),
        CAA.el('span', '', new Date(frase.data_frase).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })),
        CAA.el('span', '', '· ' + frase.qtd_palavras + (frase.qtd_palavras === 1 ? ' figura' : ' figuras')),
      );
      const figuras = CAA.el('div', 'registro-figuras');
      frase.palavras.forEach((p) => {
        const imagem = document.createElement('img');
        imagem.src = p.imagem_pecs; imagem.alt = p.txt_palavra; imagem.loading = 'lazy';
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
      apagar.type = 'button'; apagar.title = 'Apagar';
      apagar.setAttribute('aria-label', 'Apagar a frase ' + texto);
      apagar.append(CAA.icone('trash3'));
      apagar.addEventListener('click', () => apagarFrase(frase, apagar));
      acoes.append(ouvir, apagar);
      registro.append(corpo, acoes);
      caixa.append(registro);
    });
    $('mais-historico').hidden = frases.length <= limiteHistorico;
  }

  async function apagarFrase(frase, botao) {
    if (!window.confirm('Apagar esta frase do histórico?')) return;
    botao.disabled = true;
    const { error } = await CAA.db.from('frase').delete().eq('id_frase', frase.id_frase);
    if (error) { botao.disabled = false; CAA.toast(CAA.mensagemErro(error), 'erro'); return; }
    frases = frases.filter((f) => f.id_frase !== frase.id_frase);
    desenharTudo();
    CAA.toast('Frase apagada.');
  }

  // ------------------------------------------------------------------
  // EXPORTAR CSV (profissional) — abre no Excel / Google Planilhas.
  // Segurança: textos que começam com = + - @ ganham um apóstrofo, para
  // a planilha não executar como fórmula ("CSV injection").
  // ------------------------------------------------------------------
  function exportarCSV() {
    const seguro = (t) => {
      let v = String(t);
      if (/^[=+\-@\t\r]/.test(v)) v = "'" + v;
      return '"' + v.replace(/"/g, '""') + '"';
    };
    const linhas = [['data', 'hora', 'tipo_frase', 'qtd_palavras', 'frase']];
    noPeriodo(periodo).forEach((f) => {
      const d = new Date(f.data_frase);
      linhas.push([CAA.chaveDia(d), d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }), f.tipo_frase, f.qtd_palavras, f.palavras.map((p) => p.txt_palavra).join(' ')]);
    });
    const csv = '﻿' + linhas.map((l) => l.map(seguro).join(';')).join('\r\n');
    const link = document.createElement('a');
    link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    link.download = 'caa-relatorio-' + CAA.chaveDia(new Date()) + '-' + periodo + 'dias.csv';
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  }

  function estadoVazio(texto) {
    const p = CAA.el('div', 'estado-vazio');
    p.append(CAA.icone('chat-heart'), document.createTextNode(texto));
    return p;
  }
})();
