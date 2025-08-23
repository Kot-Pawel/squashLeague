// tests/find_partner.test.js
// Automated tests for find_partner.js pure functions

const { filterDatesInRange, buildPartnerListHtml } = require('../find_partner');

describe('find_partner.js pure functions', () => {
  describe('filterDatesInRange', () => {
    it('filters dates within the given range', () => {
      const from = new Date('2025-08-23');
      const to = new Date('2025-09-01');
      const dates = [
        '2025-08-20', // before
        '2025-08-23', // start
        '2025-08-25', // in range
        '2025-09-01', // end
        '2025-09-02'  // after
      ];
      const result = filterDatesInRange(dates, from, to);
      expect(result).toEqual(['2025-08-23', '2025-08-25', '2025-09-01']);
    });
    it('returns empty array if no dates in range', () => {
      const from = new Date('2025-08-23');
      const to = new Date('2025-08-25');
      const dates = ['2025-08-20', '2025-08-21'];
      expect(filterDatesInRange(dates, from, to)).toEqual([]);
    });
    it('returns empty array if input is undefined', () => {
      expect(filterDatesInRange(undefined, new Date(), new Date())).toEqual([]);
    });
  });

  describe('buildPartnerListHtml', () => {
    it('returns comma-separated names for partners', () => {
      expect(buildPartnerListHtml(['Alice', 'Bob'])).toBe('Alice, Bob');
    });
    it('returns "No partners available" if empty', () => {
      expect(buildPartnerListHtml([])).toBe('No partners available');
      expect(buildPartnerListHtml(undefined)).toBe('No partners available');
    });
  });
});
