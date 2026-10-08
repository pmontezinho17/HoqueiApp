# observador

Mede uma janela de jogos pelo lado de quem usa a app. Lê só o nosso CDN — nunca a APL.

```bash
npx wrangler deploy                 # publicar
curl "$URL/"                        # o relatório de hoje
curl "$URL/?dia=2026-10-11"         # o de outro dia
curl "$URL/observar"                # força uma leitura agora, sem esperar o cron
```

Existe porque um observador no portátil do dono morre quando o Mac adormece, e aí ficamos sem
medição e sem saber que a perdemos.

**É um Worker à parte do `relogio` de propósito.** O relógio é o que mantém a app viva ao fim
de semana; um defeito aqui não pode parar aquele.

O que mede e o que **não** mede está no topo do `src/index.js`. O resumo: mede a cadência de
publicação, as mudanças de resultado, as marcas de "ao vivo" e os erros do CDN. Não mede
quanto tempo um golo leva desde que foi marcado — isso exige alguém no pavilhão com um
cronómetro, como a 03/10/2026.
