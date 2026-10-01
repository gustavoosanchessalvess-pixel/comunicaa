// =====================================================================
// graficos.js · GRÁFICOS SIMPLES EM SVG (sem biblioteca externa)
// ---------------------------------------------------------------------
// SVG = "desenho feito de código": retângulos (barras), linhas e textos.
// Desenhamos nós mesmos para não depender de outro site (segurança) e
// para o professor ver que dá para entender cada linha.
//
// Parábola: é como desenhar o gráfico no caderno quadriculado:
// escolhe a escala, desenha cada barra com a altura certa e escreve
// os nomes embaixo.
// =====================================================================
'use strict';

(function () {
  const NS = 'http://www.w3.org/2000/svg';

  // Cria um elemento SVG com atributos: svg('rect', { x: 1, y: 2 })
  function svg(tag, atributos, texto) {
    const el = document.createElementNS(NS, tag);
    Object.entries(atributos || {}).forEach(([nome, valor]) => el.setAttribute(nome, valor));
    if (texto !== undefined) el.textContent = texto;
    return el;
  }

  function quadro(largura, altura, descricao) {
    const s = svg('svg', { viewBox: '0 0 ' + largura + ' ' + altura, role: 'img', class: 'grafico', 'aria-label': descricao });
    s.append(svg('title', {}, descricao));
    return s;
  }

  // "Número redondo" para o topo da escala (ex.: 7 -> 8, 13 -> 15).
  function topoDaEscala(maximo) {
    if (maximo <= 4) return Math.max(1, maximo);
    const passos = [5, 10, 15, 20, 25, 30, 40, 50, 75, 100, 150, 200, 300, 500, 1000];
    return passos.find((p) => p >= maximo) || maximo;
  }

  CAA.graficos = {
    // ---------------- BARRAS VERTICAIS ----------------
    // dados = [{ rotulo: 'seg', valor: 3, destaque: false }]
    barras(caixa, dados, opcoes) {
      opcoes = opcoes || {};
      const L = 640, A = 220, esq = 34, base = A - 30, topoArea = 14;
      const s = quadro(L, A, opcoes.descricao || 'Gráfico de barras');
      const maximo = topoDaEscala(Math.max(0, ...dados.map((d) => d.valor)));
      const alturaUtil = base - topoArea;
      // linhas de grade (0, metade, topo)
      [0, maximo / 2, maximo].forEach((v) => {
        const y = base - (v / maximo) * alturaUtil;
        s.append(svg('line', { x1: esq, x2: L - 6, y1: y, y2: y, class: 'g-grade' }));
        s.append(svg('text', { x: esq - 8, y: y + 4, class: 'g-eixo', 'text-anchor': 'end' }, Number.isInteger(v) ? v : v.toFixed(1)));
      });
      const largura = (L - esq - 10) / Math.max(1, dados.length);
      const mostrarRotulo = (i) => dados.length <= 16 || i % Math.ceil(dados.length / 12) === 0 || i === dados.length - 1;
      dados.forEach((d, i) => {
        const h = (d.valor / maximo) * alturaUtil;
        const x = esq + i * largura + largura * 0.18;
        const w = largura * 0.64;
        const barra = svg('rect', { x, y: base - h, width: w, height: Math.max(h, d.valor ? 2 : 0), rx: Math.min(8, w / 2), class: d.destaque ? 'g-barra destaque' : 'g-barra' });
        barra.append(svg('title', {}, d.rotulo + ': ' + d.valor));
        s.append(barra);
        if (d.valor && dados.length <= 16) s.append(svg('text', { x: x + w / 2, y: base - h - 5, class: 'g-valor', 'text-anchor': 'middle' }, d.valor));
        if (mostrarRotulo(i)) s.append(svg('text', { x: x + w / 2, y: A - 10, class: 'g-eixo', 'text-anchor': 'middle' }, d.rotulo));
      });
      caixa.replaceChildren(s);
    },

    // ---------------- LINHA (evolução no tempo) ----------------
    // dados = [{ rotulo: '01/09', valor: 1.4 }]
    linha(caixa, dados, opcoes) {
      opcoes = opcoes || {};
      const L = 640, A = 220, esq = 40, base = A - 30, topoArea = 16;
      const s = quadro(L, A, opcoes.descricao || 'Gráfico de linha');
      const maximo = topoDaEscala(Math.max(1, ...dados.map((d) => d.valor)));
      const alturaUtil = base - topoArea;
      [0, maximo / 2, maximo].forEach((v) => {
        const y = base - (v / maximo) * alturaUtil;
        s.append(svg('line', { x1: esq, x2: L - 10, y1: y, y2: y, class: 'g-grade' }));
        s.append(svg('text', { x: esq - 8, y: y + 4, class: 'g-eixo', 'text-anchor': 'end' }, Number.isInteger(v) ? v : v.toFixed(1)));
      });
      const passo = dados.length > 1 ? (L - esq - 24) / (dados.length - 1) : 0;
      const pontos = dados.map((d, i) => [esq + 12 + i * passo, base - (d.valor / maximo) * alturaUtil]);
      if (pontos.length > 1) {
        const area = 'M' + pontos[0][0] + ',' + base + ' L' + pontos.map((p) => p.join(',')).join(' L') + ' L' + pontos[pontos.length - 1][0] + ',' + base + ' Z';
        s.append(svg('path', { d: area, class: 'g-area' }));
        s.append(svg('polyline', { points: pontos.map((p) => p.join(',')).join(' '), class: 'g-linha' }));
      }
      pontos.forEach((p, i) => {
        const c = svg('circle', { cx: p[0], cy: p[1], r: 4.5, class: 'g-ponto' });
        c.append(svg('title', {}, dados[i].rotulo + ': ' + dados[i].valor));
        s.append(c);
        if (dados.length <= 12 || i % Math.ceil(dados.length / 8) === 0 || i === dados.length - 1) {
          s.append(svg('text', { x: p[0], y: A - 10, class: 'g-eixo', 'text-anchor': 'middle' }, dados[i].rotulo));
        }
      });
      caixa.replaceChildren(s);
    },

    // ---------------- BARRAS HORIZONTAIS (partes de um todo) ----------------
    // dados = [{ rotulo: 'Pedidos', valor: 5, classe: 't-pedido' }]
    horizontais(caixa, dados) {
      caixa.replaceChildren();
      const total = dados.reduce((s, d) => s + d.valor, 0) || 1;
      const maximo = Math.max(1, ...dados.map((d) => d.valor));
      dados.forEach((d) => {
        const linha = CAA.el('div', 'tipo-linha ' + (d.classe || ''));
        const trilho = CAA.el('div', 'trilho');
        const barra = CAA.el('i');
        barra.style.width = (d.valor / maximo) * 100 + '%';
        if (d.cor) barra.style.background = d.cor;
        trilho.append(barra);
        const pct = Math.round((d.valor / total) * 100);
        linha.append(CAA.el('span', '', d.rotulo), trilho, CAA.el('b', '', d.valor + (d.valor ? ' · ' + pct + '%' : '')));
        caixa.append(linha);
      });
    },
  };
})();
