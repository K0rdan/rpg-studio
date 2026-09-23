import type { GenerationClientRequest, RawGenerationResult } from '@packages/types';

import {
  GenerationUnavailableError,
  type GenerationClient,
} from '../generationErrors';

export class ClaudeGenerationClient implements GenerationClient {
  readonly model = 'claude' as const;

  isAvailable(): boolean {
    return false;
  }

  generate(request: GenerationClientRequest): Promise<RawGenerationResult> {
    void request;
    return Promise.reject(new GenerationUnavailableError(
      this.model,
      'not_supported',
      'Claude cannot generate images',
    ));
  }
}
