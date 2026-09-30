// =====================================================================
// base.js · A "CAIXA DE FERRAMENTAS" DO SITE
// ---------------------------------------------------------------------
// Todas as telas carregam este arquivo primeiro. Ele:
//   1. conecta o site ao Supabase (nosso banco de dados na nuvem);
//   2. oferece pequenas ferramentas usadas em todo lugar
//      (criar elementos, mostrar avisos, formatar datas...).
//
// Parábola: o Supabase é um BANCO de verdade (tipo agência bancária).
// O "cliente" criado aqui é o nosso CARTÃO do banco: com ele o site
// consegue pedir coisas (ler figuras, salvar frases). Mas quem decide
// o que pode ou não é o próprio banco (as regras RLS do SQL).
// =====================================================================
'use strict';

// "window.CAA" é uma mochila única onde guardamos tudo do projeto.
// Assim os nomes não se misturam com os de outras bibliotecas.
window.CAA = window.CAA || {};

(function () {
  // -------------------------------------------------------------------
  // 1. CONEXÃO COM O SUPABASE
  // O endereço e a chave PÚBLICA vêm de config.js (gerado a partir das
  // variáveis de ambiente, nunca escrito direto no código do GitHub).
  // A chave pública pode aparecer no navegador: ela só abre o "portão";
  // quem protege os dados é o RLS.
  // -------------------------------------------------------------------
  const config = window.CAA_CONFIG || {};
  const configurado = Boolean(config.supabaseUrl && config.supabaseKey) &&
    !String(config.supabaseUrl).includes('SEU-PROJETO');

  CAA.configurado = configurado;

  if (configurado && window.supabase) {
    CAA.db = window.supabase.createClient(config.supabaseUrl, config.supabaseKey, {
      auth: {
        // PKCE = um "código secreto de ida e volta" que deixa o login
        // com Google mais seguro contra intercepção.
        flowType: 'pkce',
        persistSession: true,       // continua logado ao fechar a aba
        autoRefreshToken: true,     // renova o crachá sozinho
        detectSessionInUrl: true,   // lê o código que o Google devolve na URL
      },
    });
  }

  // -------------------------------------------------------------------
  // 2. CRIAR ELEMENTOS COM SEGURANÇA
  // Usamos textContent (e não innerHTML) para textos. Assim, se alguém
  // digitar "<script>" no nome, aparece como texto e NÃO vira código.
  // -------------------------------------------------------------------
  CAA.el = function (tag, classe, texto) {
    const elemento = document.createElement(tag);
    if (classe) elemento.className = classe;
    if (texto !== undefined && texto !== null) elemento.textContent = texto;
    return elemento;
  };

  // Ícone da biblioteca Bootstrap Icons, ex.: CAA.icone('house') -> <i class="bi bi-house">
  CAA.icone = function (nome) {
    const i = document.createElement('i');
    i.className = 'bi bi-' + nome;
    i.setAttribute('aria-hidden', 'true');
    return i;
  };

  // -------------------------------------------------------------------
  // 3. PREFERÊNCIAS DO APARELHO (localStorage)
  // Coisas de "gosto pessoal" deste aparelho (modo foco, voz escolhida)
  // ficam no próprio navegador. Dados importantes (frases) vão ao banco.
  // try/catch = "tenta; se der erro, não quebra a tela".
  // -------------------------------------------------------------------
  CAA.prefs = {
    ler(chave, padrao) {
      try {
        const valor = localStorage.getItem('caa-' + chave);
        return valor === null ? padrao : JSON.parse(valor);
      } catch (erro) {
        return padrao;
      }
    },
    salvar(chave, valor) {
      try { localStorage.setItem('caa-' + chave, JSON.stringify(valor)); } catch (erro) { /* navegador bloqueou: seguimos sem salvar */ }
    },
  };

  // -------------------------------------------------------------------
  // 4. AVISO FLUTUANTE ("toast"), igual notificação de celular.
  // -------------------------------------------------------------------
  let temporizador_toast;
  CAA.toast = function (mensagem, tipo) {
    let caixa = document.getElementById('toast');
    if (!caixa) {
      caixa = CAA.el('div', 'toast');
      caixa.id = 'toast';
      caixa.setAttribute('role', 'status');
      caixa.setAttribute('aria-live', 'polite');
      document.body.append(caixa);
    }
    caixa.textContent = mensagem;
    caixa.classList.toggle('erro', tipo === 'erro');
    // requestAnimationFrame = "espera o próximo quadro da tela" para a animação funcionar.
    requestAnimationFrame(() => caixa.classList.add('visivel'));
    clearTimeout(temporizador_toast);
    temporizador_toast = setTimeout(() => caixa.classList.remove('visivel'), 3200);
  };

  // -------------------------------------------------------------------
  // 5. TRADUZIR ERROS TÉCNICOS PARA PORTUGUÊS SIMPLES
  // -------------------------------------------------------------------
  CAA.mensagemErro = function (erro) {
    const texto = String((erro && (erro.message || erro.error_description)) || erro || '');
    if (/Failed to fetch|NetworkError|Load failed/i.test(texto)) return 'Sem conexão com a internet. Confira o Wi-Fi e tente de novo.';
    if (/Invalid login credentials/i.test(texto)) return 'E-mail ou senha incorretos.';
    if (/Email not confirmed/i.test(texto)) return 'Confirme seu e-mail pelo link que enviamos antes de entrar.';
    if (/User already registered/i.test(texto)) return 'Este e-mail já tem conta. Use "Entrar".';
    if (/Password should be|password.*characters/i.test(texto)) return 'A senha precisa ter pelo menos 8 caracteres.';
    if (/rate limit|too many/i.test(texto)) return 'Muitas tentativas seguidas. Espere um minuto e tente de novo.';
    if (/provider is not enabled|Unsupported provider/i.test(texto)) return 'O login com Google ainda não foi ativado no Supabase.';
    if (/JWT|session/i.test(texto)) return 'Sua sessão expirou. Entre novamente.';
    if (texto) return texto;
    return 'Algo deu errado. Tente novamente.';
  };

  // -------------------------------------------------------------------
  // 6. DATAS EM PORTUGUÊS
  // -------------------------------------------------------------------
  CAA.formatarData = function (iso) {
    const data = new Date(iso);
    return data.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) + ' · ' +
      data.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  // "Chave do dia" no fuso do aparelho, ex.: 2026-09-30 (usada no progresso).
  CAA.chaveDia = function (data) {
    const d = new Date(data);
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  };

  // Tira acentos e deixa minúsculo: "Água" -> "agua" (para a busca achar).
  CAA.normalizar = function (texto) {
    return String(texto).toLocaleLowerCase('pt-BR').normalize('NFD').replace(/[̀-ͯ]/g, '');
  };

  // Primeiro nome, para cumprimentar: "Ana Clara Souza" -> "Ana"
  CAA.primeiroNome = function (nome) {
    return String(nome || '').trim().split(/\s+/)[0] || 'Amigo';
  };

  // -------------------------------------------------------------------
  // 7. TELA DE "CARREGANDO" (as três bolinhas pulando)
  // -------------------------------------------------------------------
  CAA.esconderCarregando = function () {
    const tela = document.getElementById('carregando');
    if (!tela) return;
    tela.classList.add('sumindo');
    setTimeout(() => tela.remove(), 300);
  };
})();
