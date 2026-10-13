/**
 * O interruptor do botão de crítica.
 *
 * **Era temporário e deixou de ser, a 13/10/2026.** Nasceu para a fase de testes com pais e
 * treinadores, com data para sair; no dia em que a sugestão passou a virar registo no GitHub
 * sozinha — ver `functions/sugerir.js` e o `sugestoes.yml` — alimentar um pipeline diário a
 * partir de um botão marcado para sair deixou de fazer sentido. Fica.
 *
 * Por isso vive atrás de um interruptor só. Para o tirar do ar basta pôr isto a `false` e
 * publicar; para o apagar de vez, este ficheiro, o `Feedback.svelte` e a linha no
 * `+layout.svelte` são as três coisas a remover, e mais nada fica para trás.
 *
 * **O interruptor continua a existir**, e está no registo em `bandeiras.ts` marcado como
 * permanente. Não é esquecimento: é a forma de tirar o botão do ar numa linha se um dia a
 * caixa der problemas — e com ela passa a haver uma Function e um processo diário a depender
 * disto, por isso um interruptor único é mais valioso do que era.
 *
 * O endereço para onde a crítica vai **não** vive aqui, vive em `contacto.ts`: é o mesmo da
 * política de privacidade, e não pode desaparecer com este ficheiro.
 */
export const RECOLHER_FEEDBACK = true;
