const { AVATAR_SEEDS, DICEBEAR_STYLE, getAvatarUrl } = require('../src/avatar');

describe('AVATAR_SEEDS', () => {
  it('contains exactly 16 seeds', () => {
    expect(AVATAR_SEEDS).toHaveLength(16);
  });

  it('contains only non-empty strings', () => {
    AVATAR_SEEDS.forEach(seed => {
      expect(typeof seed).toBe('string');
      expect(seed.length).toBeGreaterThan(0);
    });
  });
});

describe('getAvatarUrl', () => {
  it('returns a DiceBear URL for a given seed', () => {
    const url = getAvatarUrl('Ace');
    expect(url).toBe(`https://api.dicebear.com/9.x/${DICEBEAR_STYLE}/svg?seed=Ace`);
  });

  it('URL-encodes seeds that contain special characters', () => {
    const url = getAvatarUrl('Hello World');
    expect(url).toContain('Hello%20World');
  });

  it('all AVATAR_SEEDS produce URLs containing the seed', () => {
    AVATAR_SEEDS.forEach(seed => {
      const url = getAvatarUrl(seed);
      expect(url).toContain(encodeURIComponent(seed));
      expect(url).toContain('api.dicebear.com');
    });
  });

  it('uses the adventurer-neutral style', () => {
    const url = getAvatarUrl('Smash');
    expect(url).toContain('adventurer-neutral');
  });
});
