import type { GenerationModelId } from '@packages/types';

import type { GenerationClient } from './generationErrors';
import { ClaudeGenerationClient } from './providers/claude';
import { GeminiGenerationClient } from './providers/gemini';
import { GptGenerationClient } from './providers/gpt';

export type { GenerationClient } from './generationErrors';
export { GenerationUnavailableError } from './generationErrors';

export type GenerationClientFactory = (
  model: GenerationModelId,
) => GenerationClient;

const DEFAULT_MODEL_ORDER: GenerationModelId[] = ['gemini', 'gpt', 'claude'];

export const getGenerationClient: GenerationClientFactory = (model) => {
  switch (model) {
    case 'gemini':
      return new GeminiGenerationClient();
    case 'gpt':
      return new GptGenerationClient();
    case 'claude':
      return new ClaudeGenerationClient();
    default: {
      const exhaustiveModel: never = model;
      throw new Error(`Unknown generation model: ${exhaustiveModel}`);
    }
  }
};

export function resolveDefaultGenerationModel(
  projectDefault?: unknown,
): GenerationModelId {
  if (
    projectDefault === 'gemini'
    || projectDefault === 'gpt'
    || projectDefault === 'claude'
  ) {
    return projectDefault;
  }
  for (const model of DEFAULT_MODEL_ORDER) {
    if (getGenerationClient(model).isAvailable()) {
      return model;
    }
  }
  return 'gemini';
}
