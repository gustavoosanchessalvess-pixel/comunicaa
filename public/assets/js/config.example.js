// =====================================================================
// config.example.js · MODELO DE CONFIGURAÇÃO
// ---------------------------------------------------------------------
// O arquivo de verdade (config.js) NÃO vai para o GitHub (.gitignore).
// Ele é criado automaticamente pelo script scripts/gerar-config.mjs,
// que lê as variáveis de ambiente SUPABASE_URL e SUPABASE_KEY
// (do arquivo .env no computador, ou das configurações da Vercel).
//
// Para testar no computador sem o script, copie este arquivo como
// config.js e troque os valores abaixo pelos do seu projeto Supabase
// (Painel do Supabase > Project Settings > API Keys).
//
// ATENÇÃO: aqui entra SÓ a chave PÚBLICA (publishable/anon).
// A chave "service_role"/"secret" NUNCA pode ir para o navegador.
// =====================================================================
window.CAA_CONFIG = {
  supabaseUrl: 'https://SEU-PROJETO.supabase.co',
  supabaseKey: 'sua-chave-publica-aqui',
};
