# =====================================================================
# limpar-figuras.py · LIMPEZA DAS FIGURAS PCS
# ---------------------------------------------------------------------
# As figuras foram recortadas de um PDF. Algumas vieram com "sujeira":
# pedaços de palavras cortadas, riscos da tabela do PDF e pontinhos
# soltos. Além disso, o desenho ocupava só ~70% do quadrado (muita
# margem branca), então parecia pequeno na tela.
#
# Este script parte SEMPRE das originais (backups/pcs-original) e:
#   1. apaga textos cortados no topo (lista conferida à mão);
#   2. apaga riscos finos horizontais soltos (restos da tabela do PDF);
#   3. apaga pontinhos ISOLADOS (sem nenhuma tinta perto deles);
#   4. recorta o quadrado em volta do desenho e centraliza (figura maior).
#
# Parábola: é o "tratamento de foto" antes de imprimir o álbum:
# tira o pó, corta as bordas sobrando e centraliza.
#
# Como rodar (precisa de Python com Pillow, NumPy e SciPy):
#   python scripts/limpar-figuras.py <pasta-originais> <pasta-destino>
# =====================================================================
import sys, glob, os
import numpy as np
from PIL import Image
from scipy import ndimage

ORIGEM, DESTINO = sys.argv[1], sys.argv[2]

# Figuras com texto impresso cortado no topo (conferidas olhando uma a uma).
TEXTO_TOPO = {'pcs-p01-36.png', 'pcs-p11-17.png', 'pcs-p11-24.png', 'pcs-p28-17.png'}
# Faixa exata do texto cortado quando ele encosta no desenho (y0, y1, x0, x1).
FAIXAS = {'pcs-p14-08.png': [(48, 63, 0, 256), (48, 65, 160, 190)],
          'pcs-p28-08.png': [(12, 38, 0, 256)],   # palavra "branco" acima do círculo
          'pcs-p28-09.png': [(12, 38, 0, 256)]}   # palavra "cinza" acima do círculo


def diferente_do_fundo(a, fundo, limite):
    return np.abs(a.astype(int) - fundo.astype(int)).sum(axis=2) > limite


def limpar(a):
    fundo = a[2, 2].copy()
    tinta = diferente_do_fundo(a, fundo, 12)       # até tinta bem clarinha
    apagar = np.zeros_like(tinta)
    h, w = tinta.shape

    # 2) riscos finos horizontais (até 3 px de altura, isolados), no topo ou no rodapé
    forte = diferente_do_fundo(a, fundo, 25)   # pega também riscos cinza-claro
    for y in list(range(0, int(h * .28))) + list(range(int(h * .72), h)):
        if forte[y].mean() > 0.25:
            y0 = y
            while y0 > 0 and forte[y0 - 1].mean() > 0.25: y0 -= 1
            y1 = y
            while y1 < h - 1 and forte[y1 + 1].mean() > 0.25: y1 += 1
            vazio_acima = forte[max(0, y0 - 3):y0].mean() < 0.02 if y0 > 0 else True
            vazio_abaixo = forte[y1 + 1:y1 + 4].mean() < 0.02 if y1 < h - 1 else True
            if y1 - y0 + 1 <= 3 and vazio_acima and vazio_abaixo:
                apagar[y0:y1 + 1] |= tinta[y0:y1 + 1]

    # 3) pontinhos isolados: pequenos e SEM tinta num raio de 14 px.
    #    Perto da borda (marcas de corte do PDF) aceita pontos um pouco maiores.
    lab, n = ndimage.label(tinta)
    for i, sl in enumerate(ndimage.find_objects(lab)):
        mascara = lab[sl] == i + 1
        area = int(mascara.sum())
        na_borda = sl[0].start < 20 or sl[1].start < 20 or sl[0].stop > h - 20 or sl[1].stop > w - 20
        if area > (90 if na_borda else 45):
            continue
        y0, y1 = max(0, sl[0].start - 14), min(h, sl[0].stop + 14)
        x0, x1 = max(0, sl[1].start - 14), min(w, sl[1].stop + 14)
        if int(tinta[y0:y1, x0:x1].sum()) - area == 0:
            apagar |= (lab == i + 1)

    a[apagar] = fundo
    return a


def apagar_texto_topo(a):
    fundo = a[2, 2].copy()
    tinta = diferente_do_fundo(a, fundo, 60)
    linhas = np.where(tinta.any(axis=1))[0]
    y = linhas[0]
    while y < a.shape[0] and tinta[y].any():
        y += 1
    a[:y][diferente_do_fundo(a[:y], fundo, 12)] = fundo
    return a


def recortar_e_centralizar(a):
    fundo = a[2, 2].copy()
    tinta = diferente_do_fundo(a, fundo, 30)
    ys, xs = np.where(tinta)
    y0, y1, x0, x1 = ys.min(), ys.max(), xs.min(), xs.max()
    lado = max(y1 - y0, x1 - x0) + 1
    margem = int(lado * 0.07)
    tamanho = lado + 2 * margem
    tela = Image.new('RGB', (tamanho, tamanho), tuple(int(v) for v in fundo))
    pedaco = Image.fromarray(a).crop((x0, y0, x1 + 1, y1 + 1))
    tela.paste(pedaco, (margem + (lado - (x1 - x0 + 1)) // 2, margem + (lado - (y1 - y0 + 1)) // 2))
    return tela.resize((256, 256), Image.LANCZOS)


# Círculos que o PDF cortou embaixo: como o círculo é simétrico,
# a metade de cima é espelhada para refazer a de baixo.
CIRCULOS_CORTADOS = {'pcs-p28-08.png', 'pcs-p28-09.png'}


def completar_circulo(img):
    a = np.asarray(img).copy()
    fundo = a[2, 2].copy()
    tinta = diferente_do_fundo(a, fundo, 60)
    ys, xs = np.where(tinta)
    topo, esq, dir_ = ys.min(), xs.min(), xs.max()
    raio = (dir_ - esq) / 2
    centro = int(round(topo + raio))
    metade_de_cima = a[topo:centro + 1][::-1]          # de cabeça para baixo
    fim = min(a.shape[0], centro + len(metade_de_cima))
    a[centro:fim] = metade_de_cima[:fim - centro]
    return recortar_e_centralizar(a)


os.makedirs(DESTINO, exist_ok=True)
for caminho in sorted(glob.glob(os.path.join(ORIGEM, '*.png'))):
    nome = os.path.basename(caminho)
    a = np.asarray(Image.open(caminho).convert('RGB')).copy()
    for (y0, y1, x0, x1) in FAIXAS.get(nome, []):
        a[y0:y1, x0:x1] = a[2, 2]
    if nome in TEXTO_TOPO:
        a = apagar_texto_topo(a)
    a = limpar(a)
    final = recortar_e_centralizar(a)
    if nome in CIRCULOS_CORTADOS:
        final = completar_circulo(final)
    final.save(os.path.join(DESTINO, nome), optimize=True)
print('figuras tratadas:', len(glob.glob(os.path.join(DESTINO, '*.png'))))
