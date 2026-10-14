import { describe, it, expect } from 'vitest';
import * as DF from './datastoreFetcher';

// Reads a token deployed on buildnet (see .env.test)
describe('fetchTokenInfo', () => {
  it('should work correctly', async () => {
    const x = await DF.fetchTokenInfo(
      'AS1aDZio5S4EjZBrfqoWvsENYSjUYQhNJfPDWsojB9FeZbKna4mj'
    );
    expect(x.symbol).toBe('DEMO');
    expect(x.name).toBe('Floor Token Demo');
  });
});
