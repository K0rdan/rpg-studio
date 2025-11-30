export class GameLoop {
  private lastTime: number = 0;
  private running: boolean = false;
  private callback: (deltaTime: number) => void;
  private frameId: number | null = null;

  constructor(callback: (deltaTime: number) => void) {
    this.callback = callback;
  }

  public start() {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.frameId = requestAnimationFrame(this.loop);
  }

  public stop() {
    this.running = false;
    if (this.frameId !== null) {
      cancelAnimationFrame(this.frameId);
      this.frameId = null;
    }
  }

  private loop = (time: number) => {
    if (!this.running) return;
    const deltaTime = time - this.lastTime;
    this.lastTime = time;
    this.callback(deltaTime);
    this.frameId = requestAnimationFrame(this.loop);
  };
}
