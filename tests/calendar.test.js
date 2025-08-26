/**
 * @jest-environment jsdom
 */
// DOM logic tests for calendar.js
describe('calendar.js DOM logic', () => {
  let flatpickrMock, firebaseMock, dateInput;
  beforeEach(() => {
    document.body.innerHTML = `<input id="available-dates">`;
    dateInput = document.getElementById('available-dates');
    flatpickrMock = jest.fn();
    window.flatpickr = flatpickrMock;
    // Mock firebase with new datesWithTimes structure
    firebaseMock = {
      auth: jest.fn(() => ({
        currentUser: null,
        onAuthStateChanged: jest.fn()
      })),
      firestore: jest.fn(() => ({
        collection: jest.fn(() => ({
          doc: jest.fn(() => ({
            get: jest.fn(() => Promise.resolve({ exists: true, data: () => ({ datesWithTimes: [ { date: '2025-08-24', times: ['18:00-19:00'] }, { date: '2025-08-25', times: ['19:00-20:00'] } ] }) }))
          }))
        }))
      }))
    };
    window.firebase = firebaseMock;
    jest.resetModules();
    require('../calendar');
    document.dispatchEvent(new Event('DOMContentLoaded', { bubbles: true, cancelable: true }));
  });

  afterEach(() => {
    jest.resetModules();
    delete window.flatpickr;
    delete window.firebase;
  });

  it('initializes flatpickr with default options when no user is logged in', () => {
    expect(flatpickrMock).toHaveBeenCalledWith(dateInput, expect.objectContaining({
      mode: 'multiple',
      dateFormat: 'Y-m-d',
    }));
  });

  it('initializes flatpickr with user dates when user is logged in', async () => {
    // Simulate user login
    const user = { uid: 'abc123', email: 'test@example.com' };
    firebaseMock.auth = jest.fn(() => ({
      currentUser: user,
      onAuthStateChanged: jest.fn(cb => cb(user))
    }));
    jest.resetModules();
    require('../calendar');
    document.dispatchEvent(new Event('DOMContentLoaded', { bubbles: true, cancelable: true }));
    // Wait for async initUserPicker
    await new Promise(r => setTimeout(r, 0));
    expect(flatpickrMock).toHaveBeenCalledWith(dateInput, expect.objectContaining({
      defaultDate: expect.any(Array),
      disable: expect.any(Array),
    }));
  });
});
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
