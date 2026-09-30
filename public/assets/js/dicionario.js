// =====================================================================
// dicionario.js · TELA "DICIONÁRIO" (para o responsável acompanhar)
// ---------------------------------------------------------------------
// Busca no banco as frases da pessoa logada (função minhas_frases, que
// junta FRASE + CRIA + CONTEM + PALAVRAS_PECS) e mostra, em linguagem
// simples:
//   * um resumo em frase ("Nos últimos 7 dias, foram 5 frases...");
//   * "Figuras que mais aparecem" (o dicionário pessoal);
//   * o histórico, separado por dia, com os botões Ouvir e Apagar.
//
// Sem gráficos, notas ou comparações: foi o retorno das profissionais
// que acompanham o projeto (o foco é o CONTEXTO do dia a dia, não número).
//
// Parábola: é o "caderninho de recados" entre a criança e a família.
// =====================================================================
'use strict';

(function () {
  const TIPOS = { pedido: 'Pedido', pergunta: 'Pergunta', necessidade: 'Necessidade', expressao: 'Expressão' };
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
    desenharResumo();
    desenharVocabulario();
    desenharHistorico();
  }

  // Figuras mais usadas, da mais para a menos usada.
  function maisUsadas(limite) {
    const usos = new Map();
    frases.forEach((f) => f.palavras.forEach((p) => usos.set(p.id_palavra, (usos.get(p.id_palavra) || 0) + 1)));
    return [...usos.entries()].sort((a, b) => b[1] - a[1]).slice(0, limite).map(([id]) => id);
  }

  // ------------------------------------------------------------------
  // RESUMO EM UMA FRASE (linguagem simples, sem gráfico)
  // ------------------------------------------------------------------
  function desenharResumo() {
    const caixa = $('resumo');
    if (!frases.length) {
      caixa.textContent = 'Ainda não há frases salvas. No Modo Criança, cada frase falada aparece aqui.';
      return;
    }
    const semana = Date.now() - 7 * 24 * 60 * 60 * 1000;
    const recentes = frases.filter((f) => new Date(f.data_frase).getTime() >= semana).length;
    const top = maisUsadas(3).map((id) => (catalogo.palavras.get(id) || {}).texto).filter(Boolean);
    let texto = recentes
      ? 'Nos últimos 7 dias, ' + (recentes === 1 ? 'foi feita 1 frase' : 'foram feitas ' + recentes + ' frases') + '.'
      : 'Nenhuma frase nos últimos 7 dias.';
    if (top.length) texto += ' As figuras que mais aparecem são: ' + top.join(', ') + '.';
    caixa.textContent = texto;
  }

  // ------------------------------------------------------------------
  // FIGURAS QUE MAIS APARECEM
  // ------------------------------------------------------------------
  function desenharVocabulario() {
    const caixa = $('vocabulario');
    caixa.replaceChildren();
    const ids = maisUsadas(18);
    if (!ids.length) {
      caixa.append(estadoVazio('As figuras mais usadas vão aparecer aqui.'));
      return;
    }
    ids.forEach((id) => {
      const palavra = catalogo.palavras.get(id);
      if (!palavra) return;
      const item = CAA.el('button', 'palavra-usada cl-' + palavra.classe);
      item.type = 'button';
      item.title = 'Ouvir ' + palavra.texto;
      const imagem = document.createElement('img');
      imagem.src = palavra.imagem;
      imagem.alt = '';
      imagem.loading = 'lazy';
      item.append(imagem, CAA.el('strong', '', palavra.texto));
      item.addEventListener('click', () => CAA.voz.falar(CAA.voz.textoParaFala(palavra.texto)));
      caixa.append(item);
    });
  }

  // ------------------------------------------------------------------
  // HISTÓRICO, SEPARADO POR DIA
  // ------------------------------------------------------------------
  function nomeDoDia(iso) {
    const chave = CAA.chaveDia(iso);
    const hoje = new Date();
    const ontem = new Date(); ontem.setDate(hoje.getDate() - 1);
    if (chave === CAA.chaveDia(hoje)) return 'Hoje';
    if (chave === CAA.chaveDia(ontem)) return 'Ontem';
    return new Date(iso).toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
  }

  function desenharHistorico() {
    const caixa = $('historico');
    caixa.replaceChildren();

    if (!frases.length) {
      const vazio = estadoVazio('Nenhuma frase salva ainda.');
      const ir = CAA.el('a', 'botao verde', 'Ir para a Casa');
      ir.href = 'index.html';
      vazio.append(document.createElement('br'), ir);
      caixa.append(vazio);
      $('mais-historico').hidden = true;
      return;
    }

    let diaAtual = '';
    frases.slice(0, limiteHistorico).forEach((frase) => {
      const dia = nomeDoDia(frase.data_frase);
      if (dia !== diaAtual) {
        diaAtual = dia;
        caixa.append(CAA.el('h3', 'dia-titulo', dia.charAt(0).toUpperCase() + dia.slice(1)));
      }

      const registro = CAA.el('article', 'registro');
      const corpo = CAA.el('div');
      const topo = CAA.el('div', 'registro-topo');
      const hora = new Date(frase.data_frase).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
      topo.append(CAA.el('span', 'etiqueta t-' + frase.tipo_frase, TIPOS[frase.tipo_frase] || frase.tipo_frase), CAA.el('span', '', hora));

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
      apagar.title = 'Apagar';
      apagar.setAttribute('aria-label', 'Apagar a frase ' + texto);
      apagar.append(CAA.icone('trash3'));
      apagar.addEventListener('click', () => apagarFrase(frase, apagar));
      acoes.append(ouvir, apagar);

      registro.append(corpo, acoes);
      caixa.append(registro);
    });

    $('mais-historico').hidden = frases.length <= limiteHistorico;
  }

  // Apaga a FRASE no banco; por "on delete cascade", CRIA e CONTEM somem junto.
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
