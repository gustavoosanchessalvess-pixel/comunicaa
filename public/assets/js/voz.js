// =====================================================================
// voz.js · O "LOCUTOR" DO CAA (texto -> fala)
// ---------------------------------------------------------------------
// Usamos a Web Speech API, que já vem dentro do navegador: é gratuita,
// funciona sem servidor e não envia a frase da criança para empresas.
//
// O segredo da voz "profissional" é ESCOLHER BEM a voz. Cada aparelho
// tem várias; algumas são robóticas e outras são neurais (naturais).
// Este arquivo dá uma NOTA para cada voz em português e escolhe a
// melhor automaticamente:
//   * Edge / Windows ....... "Microsoft Francisca/Thalita Online (Natural)"  -> neurais, as melhores
//   * Chrome ................ "Google português do Brasil"                    -> muito boa
//   * iPhone / iPad / Mac ... "Luciana (Aprimorada)", vozes "Premium"          -> muito boas
//   * Android ............... voz do Google no aparelho                        -> boa
//
// Parábola: é um "teste de elenco". Todas as vozes fazem teste, a que
// tirar a maior nota ganha o papel de narradora do CAA.
// =====================================================================
'use strict';

(function () {
  const sintetizador = 'speechSynthesis' in window ? window.speechSynthesis : null;
  let vozes = [];

  // Velocidades oferecidas nos ajustes (1 = velocidade normal do aparelho).
  const VELOCIDADES = { devagar: 0.75, normal: 0.92, rapido: 1.1 };

  // ------------------------------------------------------------------
  // NOTA DE CADA VOZ (quanto maior, melhor)
  // ------------------------------------------------------------------
  function nota(voz) {
    const idioma = String(voz.lang || '').toLowerCase().replace('_', '-');
    const nome = String(voz.name || '').toLowerCase();
    let pontos = 0;

    if (idioma === 'pt-br') pontos += 100;       // português do Brasil
    else if (idioma.startsWith('pt')) pontos += 40; // português de Portugal (serve, mas soa diferente)
    else return -1;                              // outros idiomas ficam de fora

    if (/natural|neural|online/.test(nome)) pontos += 60;         // vozes neurais (Edge/Windows)
    if (/premium|enhanced|aprimorad|melhorad/.test(nome)) pontos += 45; // vozes melhoradas (Apple)
    if (/google/.test(nome)) pontos += 35;                          // Chrome / Android
    if (/francisca|thalita|luciana|fernanda|vit[oó]ria|camila|let[ií]cia|maria/.test(nome)) pontos += 10; // vozes femininas claras
    if (/compact|eloquence|espeak/.test(nome)) pontos -= 30;        // vozes mais robóticas
    return pontos;
  }

  function carregarVozes() {
    if (!sintetizador) return [];
    vozes = sintetizador.getVoices()
      .filter((voz) => nota(voz) >= 0)
      .sort((a, b) => nota(b) - nota(a));
    return vozes;
  }

  // Voz escolhida: a que a pessoa marcou nos ajustes, ou a de maior nota.
  function vozAtual() {
    const preferida = CAA.prefs.ler('voz-nome', '');
    return vozes.find((voz) => voz.voiceURI === preferida) || vozes[0] || null;
  }

  // ------------------------------------------------------------------
  // LIMPAR O TEXTO ANTES DE FALAR
  // Os cartões têm textos como "Bom/bem" ou "Outro (a)". Lidos ao pé da
  // letra, a voz diria "bom barra bem". Aqui deixamos natural.
  // ------------------------------------------------------------------
  const TROCAS = {
    'TO': 'terapeuta ocupacional',
    'Máq. lavar': 'máquina de lavar',
    'Ed. física': 'educação física',
    'Ç': 'cê cedilha',
    '20___': 'dois mil e',
  };
  function textoParaFala(texto) {
    let t = String(texto || '').trim();
    if (TROCAS[t]) return TROCAS[t];
    t = t.replace(/\bc\/\s*/gi, 'com ');    // "Água c/ gás" -> "Água com gás"
    t = t.replace(/\s*\([^)]*\)/g, '');     // "Outro (a)" -> "Outro"
    t = t.split(/\s*\/\s*/)[0];             // "Bom/bem" -> "Bom"
    t = t.replace(/´/g, "'");               // "Mc Donald´s" -> "Mc Donald's"
    return t;
  }

  // ------------------------------------------------------------------
  // FALAR
  //   falar('Eu quero água')
  //   falar(texto, { aoPassarPalavra: (indiceDoCaractere) => ... })
  // ------------------------------------------------------------------
  function falar(texto, opcoes) {
    opcoes = opcoes || {};
    if (!sintetizador) {
      CAA.toast('Este navegador não tem voz. A mensagem continua na tela.', 'erro');
      return Promise.resolve(false);
    }
    if (!vozes.length) carregarVozes();

    return new Promise((resolver) => {
      // cancel() = interrompe a fala anterior. Toques rápidos não acumulam falas.
      sintetizador.cancel();
      const fala = new SpeechSynthesisUtterance(texto);
      const voz = vozAtual();
      if (voz) fala.voice = voz;
      fala.lang = voz ? voz.lang : 'pt-BR';
      fala.rate = VELOCIDADES[CAA.prefs.ler('voz-velocidade', 'normal')] || VELOCIDADES.normal;
      fala.pitch = 1.05; // um tiquinho mais aguda: soa mais acolhedora
      fala.volume = 1;
      if (opcoes.aoPassarPalavra) {
        // "boundary" avisa quando a voz chega em cada palavra (nem toda voz avisa).
        fala.onboundary = (evento) => { if (evento.name === 'word' || evento.name === undefined) opcoes.aoPassarPalavra(evento.charIndex); };
      }
      fala.onend = () => resolver(true);
      fala.onerror = (evento) => {
        if (!['canceled', 'interrupted'].includes(evento.error)) {
          CAA.toast('Não consegui falar agora. Confira o volume e as vozes do aparelho.', 'erro');
        }
        resolver(false);
      };
      // Pequena pausa após o cancel(): evita um defeito conhecido do Chrome
      // em que a fala nova é engolida pela anterior.
      setTimeout(() => {
        if (sintetizador.paused) sintetizador.resume();
        sintetizador.speak(fala);
      }, 60);
    });
  }

  function parar() { if (sintetizador) sintetizador.cancel(); }

  // As vozes chegam "atrasadas" em alguns navegadores (Chrome).
  // Quando chegam, o evento voiceschanged avisa e recarregamos a lista.
  if (sintetizador) {
    carregarVozes();
    sintetizador.addEventListener('voiceschanged', () => {
      carregarVozes();
      document.dispatchEvent(new CustomEvent('caa:vozes'));
    });
  }

  // O que os outros arquivos podem usar: CAA.voz.falar(...), etc.
  CAA.voz = {
    disponivel: Boolean(sintetizador),
    falar,
    parar,
    textoParaFala,
    vozAtual,
    lista: () => (vozes.length ? vozes : carregarVozes()),
    VELOCIDADES,
  };
})();
