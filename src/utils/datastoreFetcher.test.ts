import { describe, it, expect } from 'vitest';
import * as DF from './datastoreFetcher';

describe('fetchTokenInfo', () => {
  it('should work correctly', async () => {
    const x = await DF.fetchTokenInfo(
      'AS1aDZio5S4EjZBrfqoWvsENYSjUYQhNJfPDWsojB9FeZbKna4mj'
    );
    expect(x.name).toBe('DEMO');
  });
});
