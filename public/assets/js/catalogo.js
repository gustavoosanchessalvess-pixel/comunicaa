// =====================================================================
// catalogo.js Â· BUSCA AS FIGURAS PECS NO BANCO E MONTA OS CARTÃ•ES
// ---------------------------------------------------------------------
// LÃª trÃªs tabelas do DER:
//   CATEGORIA ....... os assuntos (Comidas, Sentimentos...) e as cores
//   PALAVRAS_PECS ... as figuras (texto + imagem)
//   TEM ............. qual figura estÃ¡ em qual categoria (e em que ordem)
//
// ParÃ¡bola: Ã© como montar um ÃLBUM DE FIGURINHAS. PALAVRAS_PECS sÃ£o
// as figurinhas, CATEGORIA sÃ£o as pÃ¡ginas do Ã¡lbum, e TEM diz em qual
// pÃ¡gina cada figurinha deve ser colada (e em qual posiÃ§Ã£o).
// =====================================================================
'use strict';

(function () {
  // Categorias especiais que representam a CHAVE DE CORES de Fitzgerald.
  // Os nomes sÃ£o exatamente os mesmos gravados no banco (migraÃ§Ã£o 3).
  // "classe" vira a classe CSS da borda colorida (ex.: cl-verbo = verde).
  const CLASSES = {
    'Classe: ExpressÃµes sociais e preposiÃ§Ãµes': { classe: 'social',      rotulo: 'ExpressÃµes sociais', cor: 'rosa' },
    'Classe: Pessoas e pronomes':               { classe: 'pessoa',      rotulo: 'Pessoas e pronomes', cor: 'amarelo' },
    'Classe: AÃ§Ãµes e verbos':                   { classe: 'verbo',       rotulo: 'AÃ§Ãµes e verbos', cor: 'verde' },
    'Classe: Objetos e substantivos':           { classe: 'substantivo', rotulo: 'Objetos e substantivos', cor: 'laranja' },
    'Classe: Qualidades e adjetivos':           { classe: 'adjetivo',    rotulo: 'Qualidades e adjetivos', cor: 'azul' },
    'Classe: Perguntas':                        { classe: 'pergunta',    rotulo: 'Perguntas', cor: 'roxo' },
    'Classe: AdvÃ©rbios':                        { classe: 'adverbio',    rotulo: 'AdvÃ©rbios', cor: 'marrom' },
    'Classe: Recusa, ajuda e desconforto':      { classe: 'importante',  rotulo: 'Recusa, ajuda e desconforto', cor: 'vermelho' },
    'Classe: Outros sÃ­mbolos':                  { classe: 'diverso',     rotulo: 'Outros sÃ­mbolos', cor: 'branco' },
  };
  const NOME_MAIS_USADOS = 'Mais usados no dia a dia';
  const CHAVE_CACHE = 'caa-catalogo-v2'; // troque o número quando o catálogo do banco mudar
  const TAMANHO_LOTE = 1000; // o Supabase entrega no mÃ¡ximo 1000 linhas por pedido

  // Busca TODAS as linhas de uma tabela, de 1000 em 1000 (paginaÃ§Ã£o).
  async function buscarTudo(tabela, colunas, ordem) {
    const linhas = [];
    for (let inicio = 0; ; inicio += TAMANHO_LOTE) {
      let consulta = CAA.db.from(tabela).select(colunas);
      ordem.forEach((coluna) => { consulta = consulta.order(coluna, { ascending: true }); });
      const { data, error } = await consulta.range(inicio, inicio + TAMANHO_LOTE - 1);
      if (error) throw error;
      linhas.push(...data);
      if (data.length < TAMANHO_LOTE) break;
    }
    return linhas;
  }

  // Organiza as linhas cruas do banco em algo fÃ¡cil de usar na tela.
  function organizar(categoriasBanco, palavrasBanco, temBanco) {
    const palavras = new Map();   // id_palavra -> figura
    const categorias = new Map(); // id_categoria -> categoria

    palavrasBanco.forEach((p) => {
      palavras.set(p.id_palavra, {
        id: p.id_palavra,
        texto: p.txt_palavra,
        imagem: p.imagem_pecs,
        classe: 'diverso', // cor padrÃ£o; trocada abaixo se a figura tiver classe
        busca: CAA.normalizar(p.txt_palavra),
      });
    });

    categoriasBanco.forEach((c) => {
      const infoClasse = CLASSES[c.nome_categoria];
      categorias.set(c.id_categoria, {
        id: c.id_categoria,
        nome: infoClasse ? infoClasse.rotulo : c.nome_categoria,
        descricao: c.desc_categoria || '',
        tipo: infoClasse ? 'classe' : (c.nome_categoria === NOME_MAIS_USADOS ? 'inicio' : 'assunto'),
        classe: infoClasse ? infoClasse.classe : null,
        itens: [], // [{ id, data }] -> vira lista de ids ordenada
      });
    });

    temBanco.forEach((t) => {
      const categoria = categorias.get(t.id_categoria);
      const palavra = palavras.get(t.id_palavra);
      if (!categoria || !palavra) return;
      categoria.itens.push({ id: t.id_palavra, data: t.data_criacao });
      if (categoria.tipo === 'classe') palavra.classe = categoria.classe;
    });

    // Ordem das figuras dentro de cada categoria = data_criacao da TEM.
    categorias.forEach((categoria) => {
      categoria.palavras = categoria.itens
        .sort((a, b) => (a.data < b.data ? -1 : a.data > b.data ? 1 : a.id - b.id))
        .map((item) => item.id);
      delete categoria.itens;
    });

    return { palavras, categorias };
  }

  // Guarda o catÃ¡logo nesta aba (sessionStorage) para as outras telas
  // abrirem instantaneamente, sem baixar tudo de novo.
  function salvarCache(bruto) {
    try { sessionStorage.setItem(CHAVE_CACHE, JSON.stringify(bruto)); } catch (erro) { /* sem espaÃ§o: tudo bem */ }
  }
  function lerCache() {
    try { return JSON.parse(sessionStorage.getItem(CHAVE_CACHE)); } catch (erro) { return null; }
  }

  CAA.catalogo = {
    CLASSES,

    // Carrega o catÃ¡logo (do cache ou do banco) e devolve:
    // { palavras: Map, categorias: Map, maisUsados, assuntos, classes, todas }
    async carregar() {
      let bruto = lerCache();
      if (!bruto) {
        const [categoriasBanco, palavrasBanco, temBanco] = await Promise.all([
          buscarTudo('categoria', 'id_categoria, nome_categoria, desc_categoria', ['id_categoria']),
          buscarTudo('palavras_pecs', 'id_palavra, txt_palavra, imagem_pecs', ['id_palavra']),
          buscarTudo('tem', 'id_categoria, id_palavra, data_criacao', ['id_categoria', 'id_palavra']),
        ]);
        bruto = { categoriasBanco, palavrasBanco, temBanco };
        if (palavrasBanco.length) salvarCache(bruto);
      }
      const { palavras, categorias } = organizar(bruto.categoriasBanco, bruto.palavrasBanco, bruto.temBanco);
      const lista = [...categorias.values()];
      return {
        palavras,
        categorias,
        maisUsados: lista.find((c) => c.tipo === 'inicio') || null,
        assuntos: lista.filter((c) => c.tipo === 'assunto'),
        classes: lista.filter((c) => c.tipo === 'classe'),
        todas: [...palavras.keys()],
      };
    },

    // Procura uma figura pelo texto exato (ignora acentos/maiÃºsculas).
    acharPorTexto(catalogo, texto) {
      const alvo = CAA.normalizar(texto);
      for (const palavra of catalogo.palavras.values()) if (palavra.busca === alvo) return palavra;
      return null;
    },

    // Cria o botÃ£o de uma figura PECS (imagem + texto + borda colorida).
    criarCartao(palavra, aoTocar) {
      const botao = CAA.el('button', 'cartao cl-' + palavra.classe);
      botao.type = 'button';
      botao.dataset.id = palavra.id;
      const imagem = document.createElement('img');
      imagem.src = palavra.imagem;
      imagem.alt = ''; // o texto logo abaixo jÃ¡ descreve a figura
      imagem.width = 256;
      imagem.height = 256;
      imagem.loading = 'lazy';   // sÃ³ baixa a imagem quando ela aparece na tela
      imagem.decoding = 'async';
      botao.append(imagem, CAA.el('strong', '', palavra.texto));
      botao.addEventListener('click', () => {
        // Reinicia a animaÃ§Ã£o de "toque" mesmo em toques seguidos.
        botao.classList.remove('tocado');
        void botao.offsetWidth;
        botao.classList.add('tocado');
        aoTocar(palavra, botao);
      });
      return botao;
    },

    // -----------------------------------------------------------------
    // "MINHAS FIGURAS": a tabela pessoal de cada usuÃ¡rio.
    // NÃ£o existe coluna de "dono" na CATEGORIA (o DER nÃ£o tem), entÃ£o a
    // tabela pessoal Ã© CALCULADA a partir das frases que a prÃ³pria pessoa
    // salvou (CRIA + CONTEM), pela funÃ§Ã£o minhas_frases (que sÃ³ devolve
    // as frases dela, por causa do RLS). As mais usadas vÃªm primeiro.
    //
    // ParÃ¡bola: Ã© a "gaveta de brinquedos favoritos": ninguÃ©m precisa
    // arrumar; ela se enche sozinha com o que a crianÃ§a mais usa.
    // -----------------------------------------------------------------
    async minhasFiguras(catalogo, limite = 36) {
      const { data, error } = await CAA.db.rpc('minhas_frases', { p_limite: 500 });
      if (error) throw error;
      const usos = new Map();
      (data || []).forEach((frase) => frase.palavras.forEach((p) => usos.set(p.id_palavra, (usos.get(p.id_palavra) || 0) + 1)));
      return [...usos.entries()]
        .filter(([id]) => catalogo.palavras.has(id))
        .sort((a, b) => b[1] - a[1])
        .slice(0, limite)
        .map(([id]) => id);
    },

    limparCache() { try { sessionStorage.removeItem(CHAVE_CACHE); } catch (erro) { /* ignorado */ } },
  };
})();
