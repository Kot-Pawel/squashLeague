/**
 * @jest-environment jsdom
 */



  it('shows loading and partner results when a date is selected', async () => {
    // Mock Firestore to return two partners
    const mockGet = jest.fn(() => Promise.resolve({
      docs: [
  { id: 'user1', data: () => ({ dates: ['2025-08-25'], email: 'alice@example.com' }) },
  { id: 'user2', data: () => ({ dates: ['2025-08-25'], email: 'bob@example.com' }) }
      ]
    }));
    const flatpickrMock = jest.fn((el, opts) => {
      if (opts && typeof opts.onChange === 'function') {
        el._onChange = opts.onChange;
      }
      return {};
    });
    document.body.innerHTML = `
      <input id="find-partner-date">
      <div id="partner-results"></div>
      <div id="my-partner-summary"></div>
    `;
    window.flatpickr = flatpickrMock;
    window.firebase = {
      auth: jest.fn(() => ({ currentUser: { uid: 'me', email: 'me@example.com' }, onAuthStateChanged: jest.fn() })),
      firestore: jest.fn(() => ({
        collection: jest.fn(() => ({
          get: mockGet,
          doc: jest.fn(() => ({ get: jest.fn(() => Promise.resolve({ exists: false })) }))
        }))
      }))
    };
  jest.clearAllMocks();
  jest.resetModules();
    require('../find_partner');
    document.dispatchEvent(new Event('DOMContentLoaded', { bubbles: true, cancelable: true }));
    const dateInput = document.getElementById('find-partner-date');
    const resultsDiv = document.getElementById('partner-results');
    // Simulate selecting a date
    await dateInput._onChange([new Date('2025-08-25')], '2025-08-25', {});
    // Wait for async fetchPartners
    await new Promise(r => setTimeout(r, 0));
    expect(resultsDiv.innerHTML).toContain('Available users:');
    expect(resultsDiv.innerHTML).toContain('alice@example.com');
    expect(resultsDiv.innerHTML).toContain('bob@example.com');
  });



  it('shows error if fetching partners fails', async () => {
    const flatpickrMock = jest.fn((el, opts) => {
      if (opts && typeof opts.onChange === 'function') {
        el._onChange = opts.onChange;
      }
      return {};
    });
    document.body.innerHTML = `
      <input id="find-partner-date">
      <div id="partner-results"></div>
      <div id="my-partner-summary"></div>
    `;
    window.flatpickr = flatpickrMock;
    window.firebase = {
      auth: jest.fn(() => ({ currentUser: null, onAuthStateChanged: jest.fn() })),
      firestore: jest.fn(() => ({
        collection: jest.fn(() => ({
          get: jest.fn(() => { throw new Error('fail'); }),
          doc: jest.fn(() => ({ get: jest.fn(() => Promise.resolve({ exists: false })) }))
        }))
      }))
    };
    jest.resetModules();
    require('../find_partner');
    document.dispatchEvent(new Event('DOMContentLoaded', { bubbles: true, cancelable: true }));
    const dateInput = document.getElementById('find-partner-date');
    const resultsDiv = document.getElementById('partner-results');
    await dateInput._onChange([new Date('2025-08-24')], '2025-08-24', {});
    await new Promise(r => setTimeout(r, 0));
    expect(resultsDiv.textContent).toContain('Error fetching partners: fail');
  });



  it('shows no partners message if none found', async () => {
    const flatpickrMock = jest.fn((el, opts) => {
      if (opts && typeof opts.onChange === 'function') {
        el._onChange = opts.onChange;
      }
      return {};
    });
    document.body.innerHTML = `
      <input id="find-partner-date">
      <div id="partner-results"></div>
      <div id="my-partner-summary"></div>
    `;
    window.flatpickr = flatpickrMock;
    window.firebase = {
      auth: jest.fn(() => ({ currentUser: null, onAuthStateChanged: jest.fn() })),
      firestore: jest.fn(() => ({
        collection: jest.fn(() => ({
          get: jest.fn(() => Promise.resolve({ docs: [] })),
          doc: jest.fn(() => ({ get: jest.fn(() => Promise.resolve({ exists: false })) }))
        }))
      }))
    };
    jest.resetModules();
    require('../find_partner');
    document.dispatchEvent(new Event('DOMContentLoaded', { bubbles: true, cancelable: true }));
    const dateInput = document.getElementById('find-partner-date');
    const resultsDiv = document.getElementById('partner-results');
    await dateInput._onChange([new Date('2025-08-24')], '2025-08-24', {});
    await new Promise(r => setTimeout(r, 0));
    expect(resultsDiv.textContent).toContain('No other users are available on this date.');
  });

  it('shows summary for logged in user with dates and partners', async () => {
    // Mock user and Firestore
    const user = { uid: 'me', email: 'me@example.com' };
    window.firebase.auth = jest.fn(() => ({
      currentUser: user,
      onAuthStateChanged: jest.fn((cb) => cb(user))
    }));
    window.firebase.firestore = jest.fn(() => ({
      collection: jest.fn((name) => {
        if (name === 'availability') {
          return {
            doc: jest.fn(() => ({ get: jest.fn(() => Promise.resolve({ exists: true, data: () => ({ dates: ['2025-08-25'] }) })) })),
            get: jest.fn(() => Promise.resolve({
              docs: [
                { id: 'user2', data: () => ({ dates: ['2025-08-25'], email: 'bob@example.com' }) }
              ]
            }))
          };
        }
        if (name === 'users') {
          return {
            doc: jest.fn(() => ({ get: jest.fn(() => Promise.resolve({ exists: true, data: () => ({ screenName: 'Bob' }) })) }))
          };
        }
      })
    }));
    jest.resetModules();
    require('../find_partner');
    document.dispatchEvent(new Event('DOMContentLoaded', { bubbles: true, cancelable: true }));
    // Simulate auth state change
  window.firebase.auth().onAuthStateChanged(() => {});
  await new Promise(r => setTimeout(r, 0));
  const summaryDiv = document.getElementById('my-partner-summary');
  expect(summaryDiv.innerHTML).toContain('Your upcoming dates and potential partners:');
  expect(summaryDiv.innerHTML).toContain('Bob');
  });

  it('shows summary for logged out user as empty', async () => {
    window.firebase.auth = jest.fn(() => ({
      currentUser: null,
      onAuthStateChanged: jest.fn((cb) => cb(null))
    }));
    jest.resetModules();
    require('../find_partner');
    document.dispatchEvent(new Event('DOMContentLoaded', { bubbles: true, cancelable: true }));
  window.firebase.auth().onAuthStateChanged(() => {});
  await new Promise(r => setTimeout(r, 0));
  const summaryDiv = document.getElementById('my-partner-summary');
  expect(summaryDiv.innerHTML).toBe('');
  });
/**
 * @jest-environment jsdom
 */
// DOM logic tests for find_partner.js
describe('find_partner.js DOM logic', () => {
  let flatpickrMock, firebaseMock, dateInput, resultsDiv, summaryDiv;
  beforeEach(() => {
    document.body.innerHTML = `
      <input id="find-partner-date">
      <div id="partner-results"></div>
      <div id="my-partner-summary"></div>
    `;
    dateInput = document.getElementById('find-partner-date');
    resultsDiv = document.getElementById('partner-results');
    summaryDiv = document.getElementById('my-partner-summary');
    flatpickrMock = jest.fn((el, opts) => {
      // Simulate onChange call for testing
      if (opts && typeof opts.onChange === 'function') {
        el._onChange = opts.onChange;
      }
      return {};
    });
    window.flatpickr = flatpickrMock;
    // Mock firebase
    firebaseMock = {
      auth: jest.fn(() => ({
        currentUser: null,
        onAuthStateChanged: jest.fn()
      })),
      firestore: jest.fn(() => ({
        collection: jest.fn(() => ({
          doc: jest.fn(() => ({
            get: jest.fn(() => Promise.resolve({ exists: true, data: () => ({ dates: ['2025-08-24', '2025-08-25'] }) }))
          })),
          get: jest.fn(() => Promise.resolve({ docs: [], forEach: jest.fn() }))
        }))
      }))
    };
    window.firebase = firebaseMock;
    jest.resetModules();
    require('../find_partner');
    document.dispatchEvent(new Event('DOMContentLoaded', { bubbles: true, cancelable: true }));
  });

  afterEach(() => {
    jest.resetModules();
    delete window.flatpickr;
    delete window.firebase;
  });

  it('initializes flatpickr for find-partner-date input', () => {
    expect(flatpickrMock).toHaveBeenCalledWith(dateInput, expect.objectContaining({
      mode: 'single',
      dateFormat: 'Y-m-d',
    }));
  });

  it('shows empty results when no date is selected', () => {
    // Simulate onChange with empty date
    dateInput._onChange([], '', {});
    expect(resultsDiv.textContent).toBe('');
  });
});
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
