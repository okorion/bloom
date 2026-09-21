export class BloomAnimation {
  private frame = 0;
  private generation = 0;
  constructor(
    private readonly draw: (progress: number) => void,
    private readonly request = (callback: FrameRequestCallback) =>
      requestAnimationFrame(callback),
    private readonly cancel = (id: number) => cancelAnimationFrame(id),
  ) {}
  stop() {
    this.generation++;
    this.cancel(this.frame);
  }
  start(reduced: boolean) {
    this.stop();
    const generation = this.generation;
    if (reduced) {
      this.draw(1);
      return;
    }
    let start: number | undefined;
    const tick = (now: number) => {
      if (generation !== this.generation) return;
      start ??= now;
      const progress = Math.min(1, (now - start) / 3000);
      this.draw(progress);
      if (progress < 1) this.frame = this.request(tick);
    };
    this.draw(0);
    this.frame = this.request(tick);
  }
}
