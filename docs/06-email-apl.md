# Email à Associação de Patinagem de Lisboa (L7.1)

Rascunho para enviares. **Lê antes de mandar** — há escolhas aqui que são tuas, estão marcadas.

> 📋 **Para copiar e colar:** usa [`email-apl.txt`](email-apl.txt), que é texto simples. Copiado
> daqui (markdown renderizado) vem formatação atrás — fundo, tipos de letra — e cola mal no
> cliente de email.

**Para:** `info@aplisboa.pt`
**Assunto:** `Aplicação não oficial de resultados — pedido de parecer`

---

Exmos. Senhores,

Chamo-me Pedro Montezinho. Sou pai de um atleta do [**CLUBE**] e trabalho na área de software.

Nos últimos tempos construí, por iniciativa própria e sem qualquer fim comercial, uma aplicação
web que apresenta os resultados, calendários e classificações das competições da APL, a partir
da informação que a Associação já publica na sua plataforma pública:

**https://hoquei.pages.dev**

Escrevo-vos por duas razões: para vos dar conhecimento, e para pedir o vosso parecer antes de a
divulgar junto de outros pais e clubes.

**Como funciona.** A aplicação lê a página pública da APL algumas vezes por dia — de duas em
duas horas aos fins de semana e de seis em seis nos dias úteis — e apresenta a informação de
forma pensada para telemóvel. Não altera nada, não cria conteúdo próprio e identifica a APL como
fonte. Faz um pedido por cada intervalo, independentemente do número de utilizadores, para não
sobrecarregar o vosso servidor.

**O que gostaria de perguntar:**

1. **Veem algum inconveniente em que esta aplicação exista** e seja partilhada com pais,
   atletas e clubes?

2. **Nomes de atletas.** As fichas de jogo da vossa plataforma incluem os nomes dos atletas em
   todos os escalões, incluindo os de formação, e a aplicação apresenta-os tal como lá estão.
   Tenho consciência de que republicar e tornar pesquisáveis nomes de menores é diferente de os
   mostrar no sítio da Associação. **Se preferirem que os nomes dos escalões de formação não
   apareçam, consigo retirá-los no próprio dia** — a aplicação já está preparada para isso.

3. **Emblemas dos clubes.** A aplicação mostra os emblemas que constam da vossa plataforma. Sei
   que são marca de cada clube e não da Associação. Se entenderem que devo pedir autorização aos
   clubes, ou simplesmente retirá-los, digam-me.

4. **Acesso aos dados — e esta pergunta não precisa de resposta agora.** Hoje a aplicação lê a
   página pública, que é a única forma disponível. Preferia muito mais receber a informação de
   uma forma estruturada, por duas razões: seria mais fiável para mim e muito mais leve para o
   vosso servidor, que deixaria de servir páginas HTML completas a um programa. Se a vossa
   plataforma — ou o fornecedor dela — disponibilizar, hoje ou no futuro, uma ligação de dados
   para este efeito, teria todo o gosto em passar a usá-la. Se não existir, continuo como estou,
   com o mesmo cuidado de não sobrecarregar o serviço.

Se houver qualquer aspecto que queiram ver alterado, ou se preferirem que a aplicação deixe de
estar disponível, faço-o sem qualquer problema. O objectivo é apenas facilitar a vida a quem
acompanha o hóquei em patins da região, e preferia fazê-lo com o vosso conhecimento e acordo.

Fico ao dispor para qualquer esclarecimento, ou para uma conversa se acharem útil.

Com os melhores cumprimentos,
**Pedro Montezinho**
[telefone] · info.ok4sticks@gmail.com

---

## Notas sobre o rascunho

**O endereço mudou a 05/10/2026**, e a assinatura acima já traz o novo —
`info.ok4sticks@gmail.com` — para o caso de voltares a usar este texto numa insistência. Mas
o email que **saiu** a 01/10 ia assinado com o `pedro.montezinho@gmail.com`: é para lá que a
APL responde, se responder. Não é problema, porque essa caixa continua tua; é só saber onde
olhar.

**Porque é que diz que já está online.** Porque está, e fingir que se pede autorização prévia
seria pior do que não escrever: eles podem abrir o link em dez segundos. Ser directo sobre isso
é o que torna o resto credível.

**Porque é que levanta os nomes dos menores sem eles perguntarem.** Três razões. É o ponto onde
há risco real. Levantá-lo primeiro mostra que pensaste no assunto. E a oferta concreta de
remover no próprio dia transforma uma preocupação numa decisão fácil para eles.

**Sobre o pedido de acesso aos dados (ponto 4), acrescentado a 01/10.**

O instinto de pedir é bom e eu tinha-o deixado de fora. Mas há dois factos que mudam a *forma*
como se pede:

1. **A APL provavelmente não pode conceder.** A plataforma é da **Assys Software**, um
   fornecedor espanhol, e a APL é um inquilino como a FPP e a AP Setúbal. Uma ligação de dados é
   decisão de produto do fornecedor, não da Associação. Pedir à APL uma API é pedir-lhes uma
   coisa que teriam de ir buscar ao fornecedor deles.
2. **Não há sinal de que exista.** Na investigação à plataforma não encontrei qualquer endpoint
   de dados, e o fornecedor não tem presença pública para programadores. A plataforma é ASP
   clássico a servir HTML.

Por isso o ponto 4 está escrito com três cuidados: diz explicitamente que **não precisa de
resposta agora**, apresenta-se como **benefício para eles** (menos carga no servidor) e não
como favor pedido, e termina a dizer que **se não existir, continuo como estou** — para que a
ausência de resposta não fique a parecer um impasse.

A razão é prática: a pergunta 1 é um sim/não que um dirigente responde hoje. Um pedido de API é
um projecto. Se forem no mesmo saco, o email arrisca ficar num "temos de ver isso" indefinido e
perde-se a resposta fácil que já se tinha.

**O que continua de fora de propósito:**

- Falar de planos futuros (notificações, competições nacionais). Responde-se à pergunta que
  fizerem, não à que não fizeram.
- Falar da FPP. Hoje a aplicação só usa dados da APL. Quando usar competições nacionais, manda-se
  um email semelhante à FPP — e o parecer da APL ajuda nessa conversa.

**Escolhas tuas, marcadas no texto:**

- `[CLUBE]` — o clube do teu filho. Dá contexto e mostra que não és um estranho.
- `[telefone]` — opcional; torna a resposta mais fácil e o pedido menos anónimo.

**Se não responderem.** O silêncio não é autorização, mas também não é recusa. Ao fim de duas ou
três semanas vale a pena um telefonema curto — `213 931 710`, que está no sítio deles. Uma
conversa de dois minutos resolve mais do que três emails.
