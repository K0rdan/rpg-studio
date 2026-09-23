import type {
  GenerationClientRequest,
  GenerationModelId,
  GenerationUnavailableReason,
  RawGenerationResult,
} from '@packages/types';

export interface GenerationClient {
  readonly model: GenerationModelId;
  isAvailable(): boolean;
  generate(request: GenerationClientRequest): Promise<RawGenerationResult>;
}

export class GenerationUnavailableError extends Error {
  readonly model: GenerationModelId;
  readonly reason: GenerationUnavailableReason;

  constructor(
    model: GenerationModelId,
    reason: GenerationUnavailableReason,
    message: string,
    options?: ErrorOptions,
  ) {
    super(message, options);
    this.name = 'GenerationUnavailableError';
    this.model = model;
    this.reason = reason;
  }
}
