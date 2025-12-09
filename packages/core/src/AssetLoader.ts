export interface AssetLoadResult {
  success: boolean;
  asset?: HTMLImageElement;
  error?: string;
  path: string;
}

export interface AssetLoaderOptions {
  fallbackImage?: string;
  timeout?: number;
  retries?: number;
}

export class AssetLoader {
  private cache: Map<string, HTMLImageElement> = new Map();
  private loadingPromises: Map<string, Promise<AssetLoadResult>> = new Map();

  /**
   * Load an image with error handling, caching, and fallback support
   */
  public async loadImage(
    path: string, 
    options: AssetLoaderOptions = {}
  ): Promise<AssetLoadResult> {
    const { 
      fallbackImage = this.createFallbackImage(), 
      timeout = 10000,
      retries = 2
    } = options;

    // Check cache first
    if (this.cache.has(path)) {
      console.log(`AssetLoader: Using cached image: ${path}`);
      return {
        success: true,
        asset: this.cache.get(path)!,
        path
      };
    }

    // Check if already loading
    if (this.loadingPromises.has(path)) {
      console.log(`AssetLoader: Image already loading, waiting: ${path}`);
      return this.loadingPromises.get(path)!;
    }

    // Create new loading promise
    const loadPromise = this.loadImageWithRetry(path, retries, timeout, fallbackImage);
    this.loadingPromises.set(path, loadPromise);

    try {
      const result = await loadPromise;
      
      // Cache successful loads
      if (result.success && result.asset) {
        this.cache.set(path, result.asset);
      }
      
      return result;
    } finally {
      this.loadingPromises.delete(path);
    }
  }

  private async loadImageWithRetry(
    path: string,
    retries: number,
    timeout: number,
    fallbackImage: string
  ): Promise<AssetLoadResult> {
    let lastError: string = '';

    for (let attempt = 0; attempt <= retries; attempt++) {
      if (attempt > 0) {
        console.warn(`AssetLoader: Retry ${attempt}/${retries} for ${path}`);
        await this.delay(1000 * attempt); // Exponential backoff
      }

      try {
        const result = await this.loadImageOnce(path, timeout);
        console.log(`✅ AssetLoader: Successfully loaded ${path}${attempt > 0 ? ` (attempt ${attempt + 1})` : ''}`);
        return result;
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);
        console.warn(`AssetLoader: Failed to load ${path} (attempt ${attempt + 1}): ${lastError}`);
      }
    }

    // All retries failed, use fallback
    console.error(`❌ AssetLoader: Failed to load ${path} after ${retries + 1} attempts. Using fallback.`);
    
    try {
      const fallbackResult = await this.loadImageOnce(fallbackImage, timeout);
      return {
        success: false,
        asset: fallbackResult.asset,
        error: `Failed to load ${path}: ${lastError}. Using fallback.`,
        path
      };
    } catch (fallbackError) {
      // Even fallback failed, create a programmatic fallback
      return {
        success: false,
        asset: this.createProgrammaticFallback(),
        error: `Failed to load ${path} and fallback: ${lastError}`,
        path
      };
    }
  }

  private loadImageOnce(path: string, timeout: number): Promise<AssetLoadResult> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      let timeoutId: NodeJS.Timeout;

      const cleanup = () => {
        clearTimeout(timeoutId);
        img.onload = null;
        img.onerror = null;
      };

      img.onload = () => {
        cleanup();
        resolve({
          success: true,
          asset: img,
          path
        });
      };

      img.onerror = (error) => {
        cleanup();
        reject(new Error(`Image load error: ${error}`));
      };

      // Set timeout
      timeoutId = setTimeout(() => {
        cleanup();
        reject(new Error(`Image load timeout after ${timeout}ms`));
      }, timeout);

      // Start loading
      img.src = path;
    });
  }

  private createFallbackImage(): string {
    // Create a simple colored rectangle as data URL
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 128;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
      // Checkerboard pattern
      ctx.fillStyle = '#ff00ff'; // Magenta to indicate missing asset
      ctx.fillRect(0, 0, 128, 128);
      ctx.fillStyle = '#000000';
      ctx.fillRect(0, 0, 64, 64);
      ctx.fillRect(64, 64, 64, 64);
      
      // Text
      ctx.fillStyle = '#ffffff';
      ctx.font = '16px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('MISSING', 64, 64);
    }
    
    return canvas.toDataURL();
  }

  private createProgrammaticFallback(): HTMLImageElement {
    const img = new Image();
    img.src = this.createFallbackImage();
    return img;
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Preload multiple images
   */
  public async preloadImages(paths: string[]): Promise<AssetLoadResult[]> {
    console.log(`AssetLoader: Preloading ${paths.length} images...`);
    const results = await Promise.all(paths.map(path => this.loadImage(path)));
    
    const successful = results.filter(r => r.success).length;
    console.log(`AssetLoader: Preloaded ${successful}/${paths.length} images successfully`);
    
    return results;
  }

  /**
   * Clear the cache
   */
  public clearCache(): void {
    this.cache.clear();
    console.log('AssetLoader: Cache cleared');
  }

  /**
   * Get cache stats
   */
  public getCacheStats(): { size: number; paths: string[] } {
    return {
      size: this.cache.size,
      paths: Array.from(this.cache.keys())
    };
  }
}
