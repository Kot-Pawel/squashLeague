// Avatar system — fixed set of DiceBear avatars (bottts-neutral style)

const AVATAR_SEEDS = [
  'Ace', 'Smash', 'Rally', 'Lob', 'Drop', 'Spin',
  'Champion', 'Contender', 'Rival', 'Striker', 'Hawk', 'Blitz',
  'Viper', 'Falcon', 'Storm', 'Flash'
];

const DICEBEAR_STYLE = 'adventurer-neutral';

/**
 * Returns the DiceBear CDN URL for the given seed.
 * @param {string} seed - A seed string (one of AVATAR_SEEDS or any fallback string).
 * @returns {string} Full URL to the SVG avatar.
 */
function getAvatarUrl(seed) {
  return `https://api.dicebear.com/9.x/${DICEBEAR_STYLE}/svg?seed=${encodeURIComponent(seed)}`;
}

// Expose globally in the browser
if (typeof window !== 'undefined') {
  window.AVATAR_SEEDS = AVATAR_SEEDS;
  window.getAvatarUrl = getAvatarUrl;
}

// Export for Jest
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { AVATAR_SEEDS, DICEBEAR_STYLE, getAvatarUrl };
}
