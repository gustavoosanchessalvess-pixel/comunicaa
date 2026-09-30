// =====================================================================
// gerar-config.mjs · CRIA public/assets/js/config.js
// ---------------------------------------------------------------------
// Por que existe: não queremos o endereço e a chave do Supabase
// escritos direto no código que vai para o GitHub ("hard coded").
// Então guardamos esses valores em VARIÁVEIS DE AMBIENTE:
//   * no computador ... arquivo .env (que o .gitignore esconde)
//   * na Vercel ....... Settings > Environment Variables
// Na hora de publicar, a Vercel roda este script, que escreve o
// config.js com os valores certos.
//
// Parábola: é como deixar a senha do Wi-Fi num papel dentro de casa,
// e não pintada no muro. Quem precisa (o site) recebe; o mundo não vê.
//
// Como rodar: node scripts/gerar-config.mjs
// =====================================================================
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const raiz = join(dirname(fileURLToPath(import.meta.url)), '..');

// Lê o arquivo .env (se existir) sem precisar instalar nenhum pacote.
const arquivoEnv = join(raiz, '.env');
if (existsSync(arquivoEnv)) {
  for (const linha of readFileSync(arquivoEnv, 'utf8').split(/\r?\n/)) {
    const achado = linha.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/);
    if (achado && !(achado[1] in process.env)) process.env[achado[1]] = achado[2].replace(/^["']|["']$/g, '');
  }
}

// trim() tira espaços e quebras de linha que às vezes vêm grudados no valor.
const url = (process.env.SUPABASE_URL || '').trim().replace(/\/+$/, '');
const chave = (process.env.SUPABASE_KEY || process.env.SUPABASE_ANON_KEY || '').trim();

if (!url || !chave) {
  console.error('ERRO: defina SUPABASE_URL e SUPABASE_KEY (arquivo .env ou variáveis da Vercel).');
  process.exit(1);
}
if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(url)) {
  console.error('ERRO: SUPABASE_URL deve ser algo como https://abcdefgh.supabase.co');
  process.exit(1);
}
// Proteção extra: recusa chaves secretas (elas dariam acesso total ao banco).
if (/^sb_secret_/.test(chave) || /service_role/.test(Buffer.from(chave.split('.')[1] || '', 'base64').toString())) {
  console.error('ERRO: essa é uma chave SECRETA. Use a chave pública (publishable/anon).');
  process.exit(1);
}

const conteudo = `// Gerado automaticamente por scripts/gerar-config.mjs. Não edite e não envie ao GitHub.
window.CAA_CONFIG = {
  supabaseUrl: ${JSON.stringify(url)},
  supabaseKey: ${JSON.stringify(chave)},
};
`;
writeFileSync(join(raiz, 'public', 'assets', 'js', 'config.js'), conteudo, 'utf8');
console.log('config.js gerado para ' + url);
