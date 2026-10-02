import { describe, expect, test } from 'vitest';
import { goalAccepts } from '../../src/lib/goalMatch';

describe('goalAccepts', () => {
  test('colorless goals accept everything', () => expect(goalAccepts(undefined, 'amber')).toBe(true));
  test('matching color accepted', () => expect(goalAccepts('azure', 'azure')).toBe(true));
  test('wrong color rejected', () => expect(goalAccepts('azure', 'amber')).toBe(false));
});
