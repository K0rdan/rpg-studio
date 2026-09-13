export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number;
  private height: number;

  constructor(canvas: HTMLCanvasElement) {
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Could not get 2D context');
    }
    this.canvas = canvas;
    this.ctx = context;
    this.width = canvas.width;
    this.height = canvas.height;
  }

  public getContext(): CanvasRenderingContext2D {
    return this.ctx;
  }

  public getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }

  public setSize(width: number, height: number): void {
    if (width <= 0 || height <= 0) return;

    const canvas = this.getCanvas();
    canvas.width = width;
    canvas.height = height;
    this.width = width;
    this.height = height;
  }

  public clear() {
    this.ctx.resetTransform();
    this.ctx.clearRect(0, 0, this.width, this.height);
  }

  public drawRect(x: number, y: number, width: number, height: number, color: string) {
    this.ctx.fillStyle = color;
    this.ctx.fillRect(x, y, width, height);
  }

  public drawImage(image: CanvasImageSource, x: number, y: number, width?: number, height?: number) {
    if (width !== undefined && height !== undefined) {
      this.ctx.drawImage(image, x, y, width, height);
    } else {
      this.ctx.drawImage(image, x, y);
    }
  }

  public setAlpha(alpha: number) {
    this.ctx.globalAlpha = alpha;
  }

  public drawTile(
    image: CanvasImageSource,
    sx: number, sy: number, sWidth: number, sHeight: number,
    dx: number, dy: number, dWidth: number, dHeight: number
  ) {
    this.ctx.drawImage(image, sx, sy, sWidth, sHeight, dx, dy, dWidth, dHeight);
  }
}
