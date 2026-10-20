#!/usr/bin/env bash
# Faz os dois ficheiros que se enviam ao designer.
#
# São **dois** e não um porque servem para coisas diferentes e têm tamanhos muito
# diferentes: os ficheiros que ele edita cabem num email (~120 KB), as capturas não (~18 MB).
# Juntá-los obrigava a passar tudo por uma partilha de ficheiros só por causa das imagens.
set -euo pipefail
cd "$(dirname "$0")"

LINK="${LINK:-https://claude.ai/artifact/1e4hGsHhrJVAaUs8oMM61k}"
SAIDA="entrega"
rm -rf "$SAIDA"
mkdir -p "$SAIDA/trabalhar" "$SAIDA/capturas/componentes" "$SAIDA/capturas/ecras"

cp -R icones "$SAIDA/trabalhar/icones"
cp -R ../../web/static/escaloes "$SAIDA/trabalhar/escaloes"
rm -f "$SAIDA/trabalhar/escaloes"/*.png   # os PNG são cópias velhas; o que vale são os SVG
mkdir -p "$SAIDA/trabalhar/icone-da-app"
cp ../../web/static/icones/icone-192.png ../../web/static/icones/icone-512.png \
   ../../web/static/icones/icone-maskable-512.png "$SAIDA/trabalhar/icone-da-app/"
cp capturas/componentes/*.png "$SAIDA/capturas/componentes/"
cp capturas/*.png "$SAIDA/capturas/ecras/"

cat > "$SAIDA/trabalhar/LEIA-ME.txt" <<TXT
OK4Sticks — ficheiros para trabalhar
====================================

O catálogo completo, com os 25 ecrãs nos dois temas, as cores, as medidas e as regras
de entrega, está aqui:

    $LINK

Esta pasta tem só o que se substitui:

  icones/         os 26 ícones da aplicação, em SVG.
                  Grelha 20x20, traço 1.8, pontas e juntas redondas,
                  fill="none" e stroke="currentColor" — a cor NUNCA vai escrita
                  no desenho, vem de fora. Devolve com o mesmo nome de ficheiro.

  escaloes/       os 11 crachás de escalão, em SVG.
                  Aparecem a 18 px na barra do jogo e grandes no menu de
                  competições: têm de se ler nos dois tamanhos.

  icone-da-app/   o ícone da aplicação, nos três tamanhos em que é usado.
                  O que lá está é PROVISÓRIO — foi desenhado por um script.
                  Devolve um SVG quadrado ou um PNG de 1024x1024, com 20% de
                  margem à volta do desenho (no Android o sistema recorta-o
                  em círculo).

Três coisas que não podem entrar, por mais bonitas que sejam:
  - um tipo de letra (a app não carrega nada de fora, e está escrito na
    política de privacidade);
  - ícones em PNG ou em tipo de letra de ícones (só SVG de traço);
  - um ecrã desenhado só no tema claro (são os dois ou nenhum).

A medida de referência é 375 x 812.
TXT

cat > "$SAIDA/capturas/LEIA-ME.txt" <<TXT
OK4Sticks — capturas
====================

  componentes/   cada componente sozinho, recortado de onde ele vive na app.
                 O nome do ficheiro é
                     <identificador>-<nome>--<estado>--<tema>.png
                 por exemplo C09-linha-de-jogo--jogo-a-decorrer--escuro.png.
                 Ao devolveres um componente redesenhado, usa o MESMO
                 identificador no nome. É por ele que eu sei o que substituir.

  ecras/         os 25 ecrãs inteiros, a 375 x 812 em dupla densidade. Não são
                 para desenhar — são para veres onde é que cada peça encaixa e
                 quanta coisa há num ecrã ao mesmo tempo. A linha vermelha
                 tracejada marca os 812 px, onde o telemóvel corta; a barra de
                 baixo foi posta no fim da imagem para não atravessar o conteúdo.

Tudo a 375 px de largura e em dupla densidade: os ficheiros têm o dobro dos pixels.

O catálogo, com o que cada componente é, onde aparece, de que partes é feito e em que
estados tem de funcionar:
    $LINK
TXT

( cd "$SAIDA" && zip -rq ok4sticks-trabalhar.zip trabalhar && zip -rq ok4sticks-capturas.zip capturas )
rm -rf "$SAIDA/trabalhar" "$SAIDA/capturas"
ls -lh "$SAIDA"
