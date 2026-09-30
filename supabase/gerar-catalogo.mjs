// =====================================================================
// GERADOR DO CATÁLOGO PECS  ->  supabase/migrations/..._catalogo_pecs.sql
// ---------------------------------------------------------------------
// Parábola: este script é uma "máquina de mudança". Ele pega as figuras
// que estavam numa caixa de papelão (o arquivo dados-catalogo.js, feito
// na versão só de front-end) e arruma tudo nas gavetas do banco:
//   * cada figura vira uma linha em PALAVRAS_PECS
//   * cada assunto vira uma linha em CATEGORIA
//   * cada "figura pertence ao assunto" vira uma linha em TEM
//
// Como rodar (só precisa de Node.js, sem instalar nada):
//   node supabase/gerar-catalogo.mjs
// =====================================================================
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const pasta = dirname(fileURLToPath(import.meta.url));

// O arquivo antigo começa com "window.DADOS_CAA = {...}". Criamos um
// "window" de mentira só para conseguir ler o objeto.
const window = {};
new Function('window', readFileSync(join(pasta, 'fonte', 'dados-catalogo.js'), 'utf8'))(window);
const dados = window.DADOS_CAA;

// Classes gramaticais da chave de cores de Fitzgerald. Elas também são
// CATEGORIAS: assim a cor de cada figura vem do banco (tabela TEM),
// sem criar coluna nova. O front-end conhece estes nomes em
// public/assets/js/catalogo.js (constante CLASSES).
const CLASSES = {
  social:      ['Classe: Expressões sociais e preposições', 'Chave de cores de Fitzgerald: ROSA. Cumprimentos, expressões sociais e preposições.'],
  pessoa:      ['Classe: Pessoas e pronomes',               'Chave de cores de Fitzgerald: AMARELO. Pessoas, família e pronomes.'],
  verbo:       ['Classe: Ações e verbos',                   'Chave de cores de Fitzgerald: VERDE. Ações e verbos.'],
  substantivo: ['Classe: Objetos e substantivos',           'Chave de cores de Fitzgerald: LARANJA. Objetos, lugares e substantivos.'],
  adjetivo:    ['Classe: Qualidades e adjetivos',           'Chave de cores de Fitzgerald: AZUL. Qualidades, sentimentos e adjetivos.'],
  pergunta:    ['Classe: Perguntas',                        'Chave de cores de Fitzgerald: ROXO. Palavras de pergunta.'],
  adverbio:    ['Classe: Advérbios',                        'Chave de cores de Fitzgerald: MARROM. Advérbios de tempo, lugar e modo.'],
  importante:  ['Classe: Recusa, ajuda e desconforto',      'Chave de cores de Fitzgerald: VERMELHO. Recusar, pedir ajuda e avisar desconforto.'],
  diverso:     ['Classe: Outros símbolos',                  'Chave de cores de Fitzgerald: BRANCO. Letras, números e outros símbolos.'],
};
const NOME_MAIS_USADOS = 'Mais usados no dia a dia';

// Escapa aspas simples para o SQL: d'água -> d''água
const q = (texto) => `'${String(texto).replaceAll("'", "''")}'`;

// Bebidas alcoólicas não entram numa prancha infantil.
const cartoes = dados.cartoes.filter((c) => c.infancia === 1);
const ignorados = dados.cartoes.filter((c) => c.infancia !== 1);

// ---------------- CATEGORIA ----------------
const categorias = dados.categorias.map((c) => ({
  id: c.id_categoria,
  nome: c.nome,
  desc: `Tabela temática: ${c.nome.toLocaleLowerCase('pt-BR')}.`,
}));
let proximo_id = Math.max(...categorias.map((c) => c.id)) + 1;
const id_mais_usados = proximo_id++;
categorias.push({ id: id_mais_usados, nome: NOME_MAIS_USADOS, desc: 'Primeira tela da prancha: as figuras mais usadas no dia a dia, na ordem recomendada.' });
const id_classe = {};
for (const [tipo, [nome, desc]] of Object.entries(CLASSES)) {
  id_classe[tipo] = proximo_id;
  categorias.push({ id: proximo_id++, nome, desc });
}

// ---------------- TEM ----------------
// data_criacao marca a ORDEM das figuras dentro de cada categoria:
// a figura 1 ganha 12:00:01, a figura 2 ganha 12:00:02, e assim por diante.
const base = Date.parse('2026-09-30T12:00:00-03:00');
const quando = (segundos) => q(new Date(base + segundos * 1000).toISOString());
const tem = [];
for (const c of cartoes) {
  tem.push([c.id_categoria, c.id_cartao, quando(c.id_cartao)]);
  tem.push([id_classe[c.tipo], c.id_cartao, quando(c.id_cartao)]);
  if (c.inicial) tem.push([id_mais_usados, c.id_cartao, quando(c.ordem_inicial)]);
}

// ---------------- MONTAGEM DO SQL ----------------
const linhas = [];
linhas.push('-- =====================================================================');
linhas.push('-- CAA · MIGRAÇÃO 3 · CATÁLOGO PECS (gerado por supabase/gerar-catalogo.mjs)');
linhas.push('-- NÃO edite à mão: rode o gerador de novo se o catálogo mudar.');
linhas.push(`-- ${categorias.length} categorias · ${cartoes.length} palavras PECS · ${tem.length} ligações TEM`);
linhas.push(`-- Fora da prancha infantil: ${ignorados.map((c) => c.texto).join(', ')}`);
linhas.push('-- =====================================================================');
linhas.push('');
linhas.push('insert into public.categoria (id_categoria, nome_categoria, desc_categoria) values');
linhas.push(categorias.map((c) => `  (${c.id}, ${q(c.nome)}, ${q(c.desc)})`).join(',\n') + ';');
linhas.push('');
linhas.push('insert into public.palavras_pecs (id_palavra, txt_palavra, imagem_pecs) values');
linhas.push(cartoes.map((c) => `  (${c.id_cartao}, ${q(c.texto_voz || c.texto)}, ${q(c.imagem)})`).join(',\n') + ';');
linhas.push('');
linhas.push('insert into public.tem (id_categoria, id_palavra, data_criacao) values');
linhas.push(tem.map(([cat, pal, data]) => `  (${cat}, ${pal}, ${data})`).join(',\n') + ';');
linhas.push('');
linhas.push('-- Como inserimos os números (ids) na mão, avisamos o contador');
linhas.push('-- automático para continuar a partir do maior número usado.');
linhas.push("select setval(pg_get_serial_sequence('public.categoria', 'id_categoria'), (select max(id_categoria) from public.categoria));");
linhas.push("select setval(pg_get_serial_sequence('public.palavras_pecs', 'id_palavra'), (select max(id_palavra) from public.palavras_pecs));");
linhas.push('');

const destino = join(pasta, 'migrations', '20260930000003_catalogo_pecs.sql');
writeFileSync(destino, linhas.join('\n'), 'utf8');
console.log(`Catálogo gerado: ${categorias.length} categorias, ${cartoes.length} palavras, ${tem.length} ligações.`);
console.log(`Imagens fora da prancha (podem ser apagadas de public/assets/pcs): ${ignorados.map((c) => c.imagem).join(', ')}`);
