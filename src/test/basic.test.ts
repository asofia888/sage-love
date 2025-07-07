import { describe, it, expect } from 'vitest';

describe('Basic Test Suite', () => {
  it('should run basic arithmetic test', () => {
    expect(1 + 1).toBe(2);
  });

  it('should handle string operations', () => {
    expect('hello world').toContain('world');
  });

  it('should work with arrays', () => {
    const arr = [1, 2, 3];
    expect(arr).toHaveLength(3);
    expect(arr).toContain(2);
  });

  it('should handle async operations', async () => {
    const promise = new Promise(resolve => setTimeout(() => resolve('done'), 10));
    const result = await promise;
    expect(result).toBe('done');
  });

  it('should work with objects', () => {
    const obj = { name: '聖者の愛', version: '1.0.0' };
    expect(obj).toHaveProperty('name');
    expect(obj.name).toBe('聖者の愛');
  });
});