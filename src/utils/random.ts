export const rng = (): number => Math.random();
export const getRandomInt = (max: number): number => Math.floor(rng() * max);
