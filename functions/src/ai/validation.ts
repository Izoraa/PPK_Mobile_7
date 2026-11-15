import { AI_CATEGORIES, type AiCategory } from './contract.js';

export type ValidatedClassification = {
  category: AiCategory;
  modelVersion: string | null;
};

export class InvalidProviderResponseError extends Error {
  constructor() {
    super('AI_INVALID_RESPONSE');
    this.name = 'InvalidProviderResponseError';
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parseCategoryContent(content: unknown): AiCategory {
  if (typeof content !== 'string' || content.length === 0 || content.length > 4096) {
    throw new InvalidProviderResponseError();
  }

  let parsed: unknown;
  try {
    parsed = JSON.parse(content);
  } catch {
    throw new InvalidProviderResponseError();
  }

  if (!isObject(parsed)
    || Object.keys(parsed).length !== 1
    || typeof parsed.category !== 'string'
    || !AI_CATEGORIES.includes(parsed.category as AiCategory)) {
    throw new InvalidProviderResponseError();
  }

  return parsed.category as AiCategory;
}

export function validateProviderResponse(value: unknown): ValidatedClassification {
  if (!isObject(value) || !Array.isArray(value.choices) || value.choices.length !== 1) {
    throw new InvalidProviderResponseError();
  }
  const choice = value.choices[0];
  if (!isObject(choice) || !isObject(choice.message) || choice.finish_reason === 'length') {
    throw new InvalidProviderResponseError();
  }

  const category = parseCategoryContent(choice.message.content);
  const modelVersion = typeof value.model === 'string' && value.model.trim().length > 0
    ? value.model.slice(0, 200)
    : null;

  return { category, modelVersion };
}
