// =====================================================================
// crianca.js · MODO CRIANÇA (tela simples, estilo Matraquinha)
// ---------------------------------------------------------------------
// Para a pessoa autista usar sozinha:
//   * nada de menu, busca ou lista comprida de categorias;
//   * primeiro aparecem PASTAS grandes com figura (Comidas, Sentimentos...);
//   * tocando numa pasta, aparecem as figuras dela em PÁGINAS, com setas
//     grandes: a tela NUNCA precisa rolar;
//   * quantas figuras cabem por página depende do NÍVEL DE APOIO que o
//     responsável escolheu (3 = muito apoio = poucas figuras, enormes);
//   * para sair, um adulto precisa SEGURAR o cadeado por 2 segundos.
//
// Parábola: é um livro de figuras com abas coloridas. A criança escolhe
// a aba (pasta), vira as páginas e aponta. O adulto guarda o livro.
// =====================================================================
'use strict';

(function () {
  // Pastas mostradas no Modo Criança (nomes iguais aos da tabela CATEGORIA).
  // Escolhidas por serem do dia a dia; o responsável vê todas no Modo Adulto.
  const PASTAS = [
    'Sentimentos e sensações', 'Necessidades e desconfortos', 'Comidas', 'Bebidas',
    'Lanches', 'Frutas', 'Sobremesas', 'Higiene', 'Roupas', 'Pessoas e família',
    'Jogos e esportes', 'Tempo livre', 'Hobbies', 'Animais domésticos', 'Dentro de casa',
    'Fora de casa', 'Corpo', 'Cores', 'Números',
  ];

  // Colunas x linhas por nível de apoio: [telas estreitas (celular), telas largas]
  const LAYOUT = {
    3: [[1, 2], [3, 2]],   // muito apoio: 2 (celular) ou 6 figuras enormes
    2: [[2, 2], [4, 2]],   // apoio médio: 4 ou 8
    1: [[2, 3], [5, 3]],   // pouco apoio: 6 ou 15
  };

  const $ = (id) => document.getElementById(id);
  let pastas = [];          // [{ id, nome, palavras: [ids] }]
  let aberta = null;        // pasta aberta (ou null = mostrando as pastas)
  let pagina = 0;

  function montarPastas() {
    const catalogo = CAA.prancha.catalogo();
    const lista = [];
    if (catalogo.maisUsados) lista.push({ id: catalogo.maisUsados.id, nome: 'Mais usados', palavras: catalogo.maisUsados.palavras });
    const minhas = CAA.prancha.minhas();
    if (minhas.length) lista.push({ id: 'minhas', nome: 'Minhas figuras', palavras: minhas });
    PASTAS.forEach((nome) => {
      const categoria = catalogo.assuntos.find((c) => c.nome === nome);
      if (categoria && categoria.palavras.length) lista.push({ id: categoria.id, nome, palavras: categoria.palavras });
    });
    return lista;
  }

  // Quantas colunas e linhas cabem, conforme o nível e a largura da tela.
  function medidas() {
    const nivel = CAA.modoCrianca.nivel();
    const [estreita, larga] = LAYOUT[nivel] || LAYOUT[2];
    return window.innerWidth < 700 ? estreita : larga;
  }

  function desenhar() {
    const grade = $('grade-crianca');
    const [colunas, linhas] = medidas();
    const porPagina = colunas * linhas;
    grade.style.setProperty('--colunas', colunas);
    grade.style.setProperty('--linhas', linhas);

    const itens = aberta ? aberta.palavras : pastas;
    const totalPaginas = Math.max(1, Math.ceil(itens.length / porPagina));
    pagina = Math.min(pagina, totalPaginas - 1);

    // Título e botão Voltar
    $('crianca-voltar').hidden = !aberta;
    $('crianca-titulo').textContent = aberta ? aberta.nome : 'Escolha um assunto';

    grade.replaceChildren();
    itens.slice(pagina * porPagina, (pagina + 1) * porPagina).forEach((item, indice) => {
      if (aberta) {
        const palavra = CAA.prancha.catalogo().palavras.get(item);
        if (palavra) {
          const cartao = CAA.catalogo.criarCartao(palavra, CAA.prancha.escolher);
          const foto = CAA.el('span', 'foto');
          foto.append(cartao.querySelector('img'));
          cartao.prepend(foto);
          grade.append(cartao);
        }
      } else {
        grade.append(criarPasta(item, pagina * porPagina + indice));
      }
    });

    // Setas e bolinhas das páginas
    $('crianca-anterior').disabled = pagina === 0;
    $('crianca-proxima').disabled = pagina >= totalPaginas - 1;
    const pontos = $('crianca-pontos');
    pontos.replaceChildren();
    for (let i = 0; i < totalPaginas; i++) pontos.append(CAA.el('i', i === pagina ? 'atual' : ''));
    pontos.setAttribute('aria-label', 'Página ' + (pagina + 1) + ' de ' + totalPaginas);
  }

  // Pasta = botão colorido (texto branco) com a 1ª figura da categoria.
  function criarPasta(pasta, indice) {
    const botao = CAA.el('button', 'pasta c' + (indice % 5));
    botao.type = 'button';
    const caixa = CAA.el('span', 'pasta-img');
    // Capa: o 1º OBJETO (substantivo) da pasta, que representa melhor o assunto
    // (em "Frutas" aparece uma fruta, e não a ação "comer").
    const palavras = CAA.prancha.catalogo().palavras;
    const capaId = pasta.palavras.find((id) => (palavras.get(id) || {}).classe === 'substantivo') || pasta.palavras[0];
    const palavra = palavras.get(capaId);
    const imagem = document.createElement('img');
    imagem.src = palavra ? palavra.imagem : 'assets/logo-caa.png';
    imagem.alt = '';
    caixa.append(imagem);
    botao.append(caixa, CAA.el('span', '', pasta.nome));
    botao.addEventListener('click', () => {
      aberta = pasta;
      pagina = 0;
      desenhar();
      if (CAA.prefs.ler('falar-ao-tocar', true)) CAA.voz.falar(pasta.nome);
    });
    return botao;
  }

  // Cadeado dos pais: segurar 2 segundos para sair do Modo Criança.
  function ligarCadeado() {
    const cadeado = $('cadeado');
    let tempo = null;
    const comecar = (evento) => {
      evento.preventDefault();
      cadeado.classList.add('segurando');
      tempo = setTimeout(() => CAA.modoCrianca.desligar(), 2000);
    };
    const cancelar = () => {
      cadeado.classList.remove('segurando');
      clearTimeout(tempo);
    };
    cadeado.addEventListener('pointerdown', comecar);
    ['pointerup', 'pointerleave', 'pointercancel'].forEach((nome) => cadeado.addEventListener(nome, cancelar));
    cadeado.addEventListener('keydown', (evento) => { if ((evento.key === 'Enter' || evento.key === ' ') && !evento.repeat) comecar(evento); });
    cadeado.addEventListener('keyup', cancelar);
    cadeado.addEventListener('contextmenu', (evento) => evento.preventDefault()); // toque longo no celular
  }

  CAA.crianca = {
    iniciar() {
      pastas = montarPastas();
      $('crianca-voltar').addEventListener('click', () => { aberta = null; pagina = 0; desenhar(); });
      $('crianca-anterior').addEventListener('click', () => { pagina -= 1; desenhar(); });
      $('crianca-proxima').addEventListener('click', () => { pagina += 1; desenhar(); });
      window.addEventListener('resize', desenhar);
      ligarCadeado();
      desenhar();
    },
  };
})();
