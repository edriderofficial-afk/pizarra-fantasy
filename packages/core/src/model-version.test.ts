import { describe, expect, it } from 'vitest';
import { MODEL_VERSION } from './model-version';

describe('MODEL_VERSION', () => {
  it('is a semver string', () => {
    expect(MODEL_VERSION).toMatch(/^\d+\.\d+\.\d+$/);
  });
});
