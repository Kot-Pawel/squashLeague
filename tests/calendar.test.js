// tests/calendar.test.js
// Automated tests for calendar.js pure functions

const { getMinDate, getMaxDate, filterFutureDates } = require('../calendar');

describe('calendar.js pure functions', () => {
  describe('getMinDate', () => {
    it('returns tomorrow as the min date', () => {
      const today = new Date();
      const minDate = getMinDate();
      const expected = new Date();
      expected.setDate(today.getDate() + 1);
      expect(minDate.getFullYear()).toBe(expected.getFullYear());
      expect(minDate.getMonth()).toBe(expected.getMonth());
      expect(minDate.getDate()).toBe(expected.getDate());
    });
  });

  describe('getMaxDate', () => {
    it('returns 30 days from today as the max date', () => {
      const today = new Date();
      const maxDate = getMaxDate();
      const expected = new Date();
      expected.setDate(today.getDate() + 30);
      expect(maxDate.getFullYear()).toBe(expected.getFullYear());
      expect(maxDate.getMonth()).toBe(expected.getMonth());
      expect(maxDate.getDate()).toBe(expected.getDate());
    });
  });

  describe('filterFutureDates', () => {
    it('filters out past dates and keeps only future dates', () => {
      const today = new Date('2025-08-23');
      const dates = [
        '2025-08-20', // past
        '2025-08-23', // today
        '2025-08-24', // future
        '2025-09-01'  // future
      ];
      const result = filterFutureDates(dates, today);
      expect(result).toEqual(['2025-08-24', '2025-09-01']);
    });
    it('returns empty array if no future dates', () => {
      const today = new Date('2025-08-23');
      const dates = ['2025-08-20', '2025-08-21'];
      const result = filterFutureDates(dates, today);
      expect(result).toEqual([]);
    });
    it('returns empty array if input is undefined', () => {
      expect(filterFutureDates(undefined, new Date())).toEqual([]);
    });
  });
});
