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
    require('../src/calendar');
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
    require('../src/calendar');
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

const { getMinDate, getMaxDate, filterFutureDates } = require('../src/calendar');

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

// Additional DOM coverage tests
describe('calendar.js additional DOM coverage', () => {
  let flatpickrMock, dateInput;

  beforeEach(() => {
    document.body.innerHTML = `<input id="available-dates">`;
    dateInput = document.getElementById('available-dates');
    flatpickrMock = jest.fn();
    window.flatpickr = flatpickrMock;
    window.firebase = {
      auth: jest.fn(() => ({
        currentUser: null,
        onAuthStateChanged: jest.fn()
      })),
      firestore: jest.fn(() => ({
        collection: jest.fn(() => ({
          doc: jest.fn(() => ({
            get: jest.fn(() => Promise.resolve({
              exists: true,
              data: () => ({ datesWithTimes: [{ date: '2030-01-01', times: ['18:00-19:00'] }] })
            }))
          }))
        }))
      }))
    };
    jest.resetModules();
  });

  afterEach(() => {
    jest.resetModules();
    delete window.flatpickr;
    delete window.firebase;
    delete window.deleteAvailabilityDate;
  });

  function loadModule() {
    require('../src/calendar');
    document.dispatchEvent(new Event('DOMContentLoaded', { bubbles: true, cancelable: true }));
  }

  it('returns early when #available-dates input is missing', () => {
    document.body.innerHTML = '';
    loadModule();
    expect(flatpickrMock).not.toHaveBeenCalled();
  });

  it('returns early when window.flatpickr is not defined', () => {
    delete window.flatpickr;
    loadModule();
    expect(flatpickrMock).not.toHaveBeenCalled();
  });

  it('destroys existing _flatpickr instance before initDefaultPicker', () => {
    const destroyMock = jest.fn();
    dateInput._flatpickr = { destroy: destroyMock };
    loadModule();
    expect(destroyMock).toHaveBeenCalled();
  });

  it('calls initDefaultPicker when auth state changes to null user', () => {
    window.firebase.auth = jest.fn(() => ({
      currentUser: null,
      onAuthStateChanged: jest.fn(cb => cb(null))
    }));
    loadModule();
    expect(flatpickrMock.mock.calls.length).toBeGreaterThan(0);
    expect(flatpickrMock.mock.calls[0][1]).not.toHaveProperty('defaultDate');
  });

  it('calls initUserPicker immediately when currentUser is already set at load', async () => {
    const user = { uid: 'preloaded', email: 'pre@test.com' };
    window.firebase.auth = jest.fn(() => ({
      currentUser: user,
      onAuthStateChanged: jest.fn()
    }));
    loadModule();
    await new Promise(r => setTimeout(r, 0));
    expect(flatpickrMock).toHaveBeenCalledWith(dateInput, expect.objectContaining({
      defaultDate: expect.any(Array)
    }));
  });

  it('uses empty userDates when Firestore doc does not exist', async () => {
    const user = { uid: 'noDoc', email: 'x@y.com' };
    window.firebase.auth = jest.fn(() => ({
      currentUser: user,
      onAuthStateChanged: jest.fn(cb => cb(user))
    }));
    window.firebase.firestore = jest.fn(() => ({
      collection: jest.fn(() => ({
        doc: jest.fn(() => ({
          get: jest.fn(() => Promise.resolve({ exists: false }))
        }))
      }))
    }));
    loadModule();
    await new Promise(r => setTimeout(r, 0));
    expect(flatpickrMock).toHaveBeenCalledWith(dateInput, expect.objectContaining({ defaultDate: [] }));
  });

  it('uses old-format "dates" array from Firestore', async () => {
    const user = { uid: 'oldFmt', email: 'o@p.com' };
    const futureDates = ['2030-01-01', '2030-06-15'];
    window.firebase.auth = jest.fn(() => ({
      currentUser: user,
      onAuthStateChanged: jest.fn(cb => cb(user))
    }));
    window.firebase.firestore = jest.fn(() => ({
      collection: jest.fn(() => ({
        doc: jest.fn(() => ({
          get: jest.fn(() => Promise.resolve({ exists: true, data: () => ({ dates: futureDates }) }))
        }))
      }))
    }));
    loadModule();
    await new Promise(r => setTimeout(r, 0));
    expect(flatpickrMock).toHaveBeenCalledWith(dateInput, expect.objectContaining({ defaultDate: futureDates }));
  });

  it('uses empty dates when Firestore doc has unknown field format', async () => {
    const user = { uid: 'noFmt', email: 'n@m.com' };
    window.firebase.auth = jest.fn(() => ({
      currentUser: user,
      onAuthStateChanged: jest.fn(cb => cb(user))
    }));
    window.firebase.firestore = jest.fn(() => ({
      collection: jest.fn(() => ({
        doc: jest.fn(() => ({
          get: jest.fn(() => Promise.resolve({ exists: true, data: () => ({ foo: 'bar' }) }))
        }))
      }))
    }));
    loadModule();
    await new Promise(r => setTimeout(r, 0));
    expect(flatpickrMock).toHaveBeenCalledWith(dateInput, expect.objectContaining({ defaultDate: [] }));
  });

  it('handles Firestore error gracefully and still initializes flatpickr with empty dates', async () => {
    const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    const user = { uid: 'errUser', email: 'e@f.com' };
    window.firebase.auth = jest.fn(() => ({
      currentUser: user,
      onAuthStateChanged: jest.fn(cb => cb(user))
    }));
    window.firebase.firestore = jest.fn(() => ({
      collection: jest.fn(() => ({
        doc: jest.fn(() => ({
          get: jest.fn(() => Promise.reject(new Error('Firestore error')))
        }))
      }))
    }));
    loadModule();
    await new Promise(r => setTimeout(r, 0));
    expect(consoleSpy).toHaveBeenCalledWith('Error fetching user availability:', expect.any(Error));
    expect(flatpickrMock).toHaveBeenCalledWith(dateInput, expect.objectContaining({ defaultDate: [] }));
    consoleSpy.mockRestore();
  });

  it('destroys existing _flatpickr in user picker before re-init', async () => {
    const destroyMock = jest.fn();
    const user = { uid: 'destroyUser', email: 'd@e.com' };
    window.firebase.auth = jest.fn(() => ({
      currentUser: null,
      onAuthStateChanged: jest.fn(cb => {
        dateInput._flatpickr = { destroy: destroyMock };
        cb(user);
      })
    }));
    loadModule();
    await new Promise(r => setTimeout(r, 0));
    expect(destroyMock).toHaveBeenCalled();
  });

  describe('onDayCreate callback', () => {
    const futureDateStr = '2030-01-01';
    let onDayCreate;

    beforeEach(async () => {
      const user = { uid: 'dayCreate', email: 'd@c.com' };
      window.firebase.auth = jest.fn(() => ({
        currentUser: user,
        onAuthStateChanged: jest.fn(cb => cb(user))
      }));
      require('../src/calendar');
      document.dispatchEvent(new Event('DOMContentLoaded', { bubbles: true, cancelable: true }));
      await new Promise(r => setTimeout(r, 0));
      const lastCall = flatpickrMock.mock.calls[flatpickrMock.mock.calls.length - 1];
      onDayCreate = lastCall[1].onDayCreate;
    });

    it('does nothing when day does not have flatpickr-disabled class', () => {
      const dayElem = document.createElement('div');
      const fp = { formatDate: jest.fn(() => futureDateStr) };
      onDayCreate([], '', fp, dayElem);
      expect(dayElem.classList.contains('picked-date')).toBe(false);
      expect(dayElem.querySelector('.remove-date-btn')).toBeNull();
    });

    it('does nothing when date is not in userDates', () => {
      const dayElem = document.createElement('div');
      dayElem.classList.add('flatpickr-disabled');
      dayElem.dateObj = new Date('2030-02-01');
      const fp = { formatDate: jest.fn(() => '2030-02-01') };
      onDayCreate([], '', fp, dayElem);
      expect(dayElem.classList.contains('picked-date')).toBe(false);
    });

    it('does nothing when dateObj is falsy', () => {
      const dayElem = document.createElement('div');
      dayElem.classList.add('flatpickr-disabled');
      dayElem.dateObj = null;
      const fp = { formatDate: jest.fn() };
      onDayCreate([], '', fp, dayElem);
      expect(dayElem.classList.contains('picked-date')).toBe(false);
    });

    it('marks date and adds remove button for user-picked dates', () => {
      const dayElem = document.createElement('div');
      dayElem.classList.add('flatpickr-disabled');
      dayElem.dateObj = new Date(futureDateStr);
      const fp = { formatDate: jest.fn(() => futureDateStr) };
      onDayCreate([], '', fp, dayElem);
      expect(dayElem.title).toBe('You already picked this date');
      expect(dayElem.classList.contains('picked-date')).toBe(true);
      const btn = dayElem.querySelector('.remove-date-btn');
      expect(btn).not.toBeNull();
      expect(btn.textContent).toBe('🗑️');
    });

    it('calls deleteAvailabilityDate when remove button is clicked', () => {
      window.deleteAvailabilityDate = jest.fn();
      const dayElem = document.createElement('div');
      dayElem.classList.add('flatpickr-disabled');
      dayElem.dateObj = new Date(futureDateStr);
      const fp = { formatDate: jest.fn(() => futureDateStr) };
      onDayCreate([], '', fp, dayElem);
      dayElem.querySelector('.remove-date-btn').click();
      expect(window.deleteAvailabilityDate).toHaveBeenCalledWith(futureDateStr, expect.any(Function));
    });

    it('does not throw when deleteAvailabilityDate is not defined', () => {
      delete window.deleteAvailabilityDate;
      const dayElem = document.createElement('div');
      dayElem.classList.add('flatpickr-disabled');
      dayElem.dateObj = new Date(futureDateStr);
      const fp = { formatDate: jest.fn(() => futureDateStr) };
      onDayCreate([], '', fp, dayElem);
      expect(() => dayElem.querySelector('.remove-date-btn').click()).not.toThrow();
    });

    it('refresh callback from deleteAvailabilityDate triggers initUserPicker', async () => {
      let refreshCb;
      window.deleteAvailabilityDate = jest.fn((dateStr, cb) => { refreshCb = cb; });
      const dayElem = document.createElement('div');
      dayElem.classList.add('flatpickr-disabled');
      dayElem.dateObj = new Date(futureDateStr);
      const fp = { formatDate: jest.fn(() => futureDateStr) };
      onDayCreate([], '', fp, dayElem);
      const callsBefore = flatpickrMock.mock.calls.length;
      dayElem.querySelector('.remove-date-btn').click();
      refreshCb();
      await new Promise(r => setTimeout(r, 0));
      expect(flatpickrMock.mock.calls.length).toBeGreaterThan(callsBefore);
    });
  });
});
