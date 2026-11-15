import {
  CLASSIFICATION_SYSTEM_PROMPT,
  DEFAULT_MAX_RESPONSE_BYTES,
  DEFAULT_UPSTREAM_TIMEOUT_MS,
} from './contract.js';
import { InvalidProviderResponseError, validateProviderResponse } from './validation.js';

export type Classification = {
  category: 'illness' | 'family' | 'academic' | 'other' | 'unclear';
  confidence: null;
  modelVersion: string | null;
};

export class ProviderFailure extends Error {
  constructor(
    readonly appCode: 'AI_TIMEOUT' | 'AI_UNAVAILABLE' | 'AI_INVALID_RESPONSE',
    readonly retryable: boolean,
    readonly httpStatus: number | null = null,
    readonly retryAfterMs: number | null = null,
  ) {
    super(appCode);
    this.name = 'ProviderFailure';
  }
}

function parsePositiveInteger(value: string | undefined, fallback: number): number {
  if (!value || !/^\d+$/.test(value)) return fallback;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) && parsed > 0 ? parsed : fallback;
}

function readRetryAfterMs(value: string | null): number | null {
  if (!value) return null;
  const seconds = Number(value);
  if (Number.isFinite(seconds) && seconds >= 0) return Math.min(seconds * 1000, 86_400_000);
  const date = Date.parse(value);
  if (!Number.isFinite(date)) return null;
  return Math.max(0, Math.min(date - Date.now(), 86_400_000));
}

async function readLimitedBody(response: Response, byteLimit: number): Promise<string> {
  const declaredLength = Number(response.headers.get('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > byteLimit) {
    throw new ProviderFailure('AI_INVALID_RESPONSE', true, response.status);
  }

  if (!response.body) return '';
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > byteLimit) {
      await reader.cancel();
      throw new ProviderFailure('AI_INVALID_RESPONSE', true, response.status);
    }
    chunks.push(value);
  }

  const joined = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    joined.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(joined);
}

function classifyMock(reason: string): Classification['category'] {
  const text = reason.toLocaleLowerCase('id-ID');
  if (/keluarga|ibu|ayah|orang tua|saudara|mendampingi/.test(text)) return 'family';
  if (/demam|sakit|dokter|rumah sakit|puskesmas|flu|cedera|kesehatan/.test(text)) return 'illness';
  if (/ujian|kuliah|akademik|mata kuliah|kelas lain/.test(text)) return 'academic';
  if (/kendaraan|mogok|transportasi/.test(text)) return 'other';
  return 'unclear';
}

async function classifyWithProvider(reason: string, apiKey: string | null): Promise<Classification> {
  const baseUrl = process.env.AI_BASE_URL?.trim();
  const model = process.env.AI_MODEL?.trim();
  const modelVerified = process.env.AI_MODEL_VERIFIED === 'true';
  if (!baseUrl || !model || !modelVerified || !apiKey?.trim()) {
    throw new ProviderFailure('AI_UNAVAILABLE', false, null);
  }

  let endpoint: URL;
  try {
    endpoint = new URL(`${baseUrl.replace(/\/+$/, '')}/chat/completions`);
    if (endpoint.protocol !== 'https:') throw new Error('https-required');
  } catch {
    throw new ProviderFailure('AI_UNAVAILABLE', false, null);
  }

  const timeoutMs = parsePositiveInteger(process.env.AI_TIMEOUT_MS, DEFAULT_UPSTREAM_TIMEOUT_MS);
  const maxBytes = parsePositiveInteger(process.env.AI_MAX_RESPONSE_BYTES, DEFAULT_MAX_RESPONSE_BYTES);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), Math.min(timeoutMs, DEFAULT_UPSTREAM_TIMEOUT_MS));

  try {
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey.trim()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        stream: false,
        messages: [
          {
            role: 'system',
            content: CLASSIFICATION_SYSTEM_PROMPT,
          },
          { role: 'user', content: JSON.stringify({ reason }) },
        ],
      }),
      signal: controller.signal,
      redirect: 'error',
    });

    if (response.status === 429 || response.status >= 500) {
      await response.body?.cancel();
      throw new ProviderFailure(
        'AI_UNAVAILABLE',
        true,
        response.status,
        response.status === 429 ? readRetryAfterMs(response.headers.get('retry-after')) : null,
      );
    }
    if (!response.ok) {
      await response.body?.cancel();
      throw new ProviderFailure('AI_UNAVAILABLE', false, response.status);
    }

    const text = await readLimitedBody(response, maxBytes);
    let body: unknown;
    try {
      body = JSON.parse(text);
    } catch {
      throw new InvalidProviderResponseError();
    }
    const result = validateProviderResponse(body);
    return {
      category: result.category,
      confidence: null,
      modelVersion: result.modelVersion,
    };
  } catch (error) {
    if (error instanceof ProviderFailure) throw error;
    if (error instanceof InvalidProviderResponseError) {
      throw new ProviderFailure('AI_INVALID_RESPONSE', true, null);
    }
    if (controller.signal.aborted) throw new ProviderFailure('AI_TIMEOUT', true, null);
    throw new ProviderFailure('AI_UNAVAILABLE', true, null);
  } finally {
    clearTimeout(timeout);
  }
}

export async function classifyReason(reason: string, apiKey: string | null): Promise<Classification> {
  const mode = process.env.AI_PROVIDER_MODE?.trim() || 'mock';
  if (mode === 'mock') {
    return {
      category: classifyMock(reason),
      confidence: null,
      modelVersion: 'mock/labcheckin-leave-v1',
    };
  }
  if (mode !== 'live') throw new ProviderFailure('AI_UNAVAILABLE', false, null);
  return classifyWithProvider(reason, apiKey);
}
