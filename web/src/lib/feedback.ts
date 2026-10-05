/**
 * O botão de crítica é **temporário**: existe para a fase de testes com pais e treinadores
 * e sai quando ela acabar.
 *
 * Por isso vive atrás de um interruptor só. Para o tirar do ar basta pôr isto a `false` e
 * publicar; para o apagar de vez, este ficheiro, o `Feedback.svelte` e a linha no
 * `+layout.svelte` são as três coisas a remover, e mais nada fica para trás.
 *
 * O endereço para onde a crítica vai **não** vive aqui, vive em `contacto.ts`: é o mesmo da
 * política de privacidade, e não pode desaparecer com este ficheiro.
 */
export const RECOLHER_FEEDBACK = true;
