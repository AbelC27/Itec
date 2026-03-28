declare module "canvas-confetti" {
  type ConfettiOptions = Record<string, unknown>;
  type ConfettiInstance = (options?: ConfettiOptions) => Promise<null> | null;

  const confetti: ConfettiInstance;
  export default confetti;
}
