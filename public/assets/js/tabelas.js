// =====================================================================
// tabelas.js · TELA "TABELAS" (lista de categorias)
// ---------------------------------------------------------------------
// Mostra cada CATEGORIA do banco como um cartão ("tabela temática"),
// com uma capa de 3 figuras e quantas figuras ela tem.
// Tocar numa tabela abre a Casa já filtrada: index.html?categoria=ID
//
// São duas seções:
//   * Assuntos .......... Comidas, Sentimentos, Escola... (+ Mais usados)
//   * Cores das palavras . a chave de Fitzgerald (verbos = verde etc.)
//
// Parábola: é a ESTANTE de livros. Cada tabela é um livro; a capa
// mostra as primeiras figuras e a lombada diz quantas páginas tem.
// =====================================================================
'use strict';

(function () {
  // Cor do selo de cada seção/classe (variáveis do estilo.css).
  const COR_CLASSE = {
    social: 'var(--c-social)', pessoa: '#e0a100', verbo: 'var(--verde)', substantivo: 'var(--laranja)',
    adjetivo: 'var(--azul)', pergunta: 'var(--roxo)', adverbio: 'var(--c-adverbio)',
    importante: 'var(--vermelho)', diverso: '#8e8e93',
  };
  const CORES_ASSUNTO = ['var(--verde)', 'var(--azul)', 'var(--laranja)', 'var(--roxo)', 'var(--vermelho)'];

  let catalogo;

  CAA.iniciarPaginaInterna('tabelas', async () => {
    catalogo = await CAA.catalogo.carregar();
    document.getElementById('busca-tabela').addEventListener('input', desenhar);
    desenhar();
  });

  function desenhar() {
    const termo = CAA.normalizar(document.getElementById('busca-tabela').value.trim());
    const combina = (categoria) => !termo || CAA.normalizar(categoria.nome).includes(termo);

    const assuntos = [catalogo.maisUsados, ...catalogo.assuntos].filter(Boolean).filter(combina);
    const classes = catalogo.classes.filter(combina);

    preencher('lista-assuntos', assuntos, (categoria, indice) => CORES_ASSUNTO[indice % CORES_ASSUNTO.length]);
    preencher('lista-cores', classes, (categoria) => COR_CLASSE[categoria.classe]);

    document.getElementById('secao-cores').hidden = classes.length === 0;
    document.getElementById('sem-resultado').hidden = assuntos.length + classes.length > 0;
  }

  function preencher(idLista, categorias, escolherCor) {
    const lista = document.getElementById(idLista);
    lista.replaceChildren();
    categorias.forEach((categoria, indice) => {
      const link = CAA.el('a', 'tabela');
      link.href = 'index.html?categoria=' + encodeURIComponent(categoria.id);
      // Define a cor desta tabela (usada na borda ao passar o mouse e no selo).
      link.style.setProperty('--cor-tabela', escolherCor(categoria, indice));

      // Capa: as 3 primeiras figuras da categoria.
      const capa = CAA.el('div', 'tabela-capa');
      categoria.palavras.slice(0, 3).forEach((id) => {
        const palavra = catalogo.palavras.get(id);
        const imagem = document.createElement('img');
        imagem.src = palavra.imagem;
        imagem.alt = '';
        imagem.loading = 'lazy';
        capa.append(imagem);
      });

      const total = categoria.palavras.length;
      const selo = CAA.el('span', 'selo', total + (total === 1 ? ' figura' : ' figuras'));
      link.append(capa, CAA.el('strong', '', categoria.tipo === 'inicio' ? '⭐ ' + categoria.nome : categoria.nome), selo);
      lista.append(link);
    });
  }
})();
