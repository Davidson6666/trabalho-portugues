/**
 * Canal simples entre o livro HTML e a cena 3D: o quanto uma página está
 * levantada (0 = deitada, 1 = em pé). A cena usa isso para mexer na luz.
 * É um objeto mutável (não estado React) para não re-renderizar a cada frame.
 */
export const flipSignal = { lift: 0 };
