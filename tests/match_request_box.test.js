/**
 * @jest-environment jsdom
 */

const fs = require('fs');
const path = require('path');

let firebaseMock, userMock, dbMock, matchRequestsMock, usersMock;
const scriptPath = path.resolve(__dirname, '../src/match_requests_box.js');

beforeEach(() => {
  document.body.innerHTML = `<div id="match-requests-list"></div>`;
  userMock = { uid: 'user1' };

  // Firestore mocks
  let matchRequestsData = {};
  let usersData = {};

  matchRequestsMock = {
  where: function (field, op, value) {
    // Start with the first filter
    const filters = [{ field, op, value }];
    // Chainable object
    const chain = {
      where: function (field2, op2, value2) {
        // Add new filter to the chain
        return chain._cloneWithFilter({ field: field2, op: op2, value: value2 });
      },
      _cloneWithFilter: function (newFilter) {
        const newChain = Object.create(chain);
        newChain._filters = (chain._filters || filters).concat([newFilter]);
        return newChain;
      },
      get: jest.fn().mockResolvedValue({
        forEach: cb => {
          let filtered = Object.entries(matchRequestsData)
            .map(([id, req]) => ({ id, data: () => req }));
          // Apply all filters
          const allFilters = chain._filters || filters;
          allFilters.forEach(f => {
            if (f.field === 'fromUserId' && f.op === 'in') {
              filtered = filtered.filter(doc => f.value.includes(doc.data().fromUserId));
            }
            if (f.field === 'toUserId' && f.op === '==') {
              filtered = filtered.filter(doc => doc.data().toUserId === f.value);
            }
            if (f.field === 'date' && f.op === '>=') {
              filtered = filtered.filter(doc => doc.data().date >= f.value);
            }
          });
          filtered.forEach(doc => cb(doc));
        },
      }),
    };
    chain._filters = filters;
    return chain;
  },
  doc: jest.fn(id => ({
    update: jest.fn(updateObj => {
      if (matchRequestsData[id]) {
        matchRequestsData[id] = { ...matchRequestsData[id], ...updateObj };
        return Promise.resolve();
      }
      return Promise.reject(new Error('Not found'));
    }),
  })),
};

  usersMock = {
    doc: jest.fn(id => ({
      get: jest.fn().mockResolvedValue({
        exists: !!usersData[id],
        data: () => usersData[id] || {},
      }),
    })),
  };

  dbMock = {
    collection: jest.fn(col => {
      if (col === 'matchRequests') return matchRequestsMock;
      if (col === 'users') return usersMock;
      throw new Error('Unknown collection');
    }),
  };

  firebaseMock = {
    auth: jest.fn(() => ({
      onAuthStateChanged: jest.fn(cb => {
        // Save cb for later use in tests
        firebaseMock._onAuthStateChanged = cb;
      }),
    })),
    firestore: jest.fn(() => dbMock),
  };

  global.firebase = firebaseMock;
  jest.resetModules();
  jest.clearAllMocks();

  // Attach data for each test
  firebaseMock._setData = ({ matchRequests, users }) => {
    matchRequestsData = { ...matchRequests };
    usersData = { ...users };
  };

  // Load script
  const scriptContent = fs.readFileSync(scriptPath, 'utf8');
  eval(scriptContent);
});

afterEach(() => {
  delete global.firebase;
});

describe('match_requests_box.js', () => {
  it('shows login message if user not logged in', async () => {
    firebaseMock._setData({ matchRequests: {}, users: {} });
    // Simulate DOMContentLoaded
    document.dispatchEvent(new Event('DOMContentLoaded'));
    // Simulate auth state change with null user
    await firebaseMock._onAuthStateChanged(null);
    expect(document.getElementById('match-requests-list').innerHTML)
      .toContain('Please log in');
  });

  it('shows no requests message if no requests', async () => {
    firebaseMock._setData({ matchRequests: {}, users: {} });
    document.dispatchEvent(new Event('DOMContentLoaded'));
    await firebaseMock._onAuthStateChanged(userMock);
    expect(document.getElementById('match-requests-list').innerHTML)
      .toContain('No match requests yet.');
  });

  it('renders pending, accepted, and rejected requests', async () => {
  // Generate future dates based on today
  const today = new Date();
  function futureDate(daysAhead) {
    const d = new Date(today);
    d.setDate(d.getDate() + daysAhead);
    return d.toISOString().slice(0, 10);
  }

  firebaseMock._setData({
    matchRequests: {
      'req1': { fromUserId: 'user1', toUserId: 'user2', date: futureDate(1), timeSlot: '10:00', status: 'pending' },
      'req2': { fromUserId: 'user2', toUserId: 'user1', date: futureDate(2), timeSlot: '11:00', status: 'accepted' },
      'req3': { fromUserId: 'user3', toUserId: 'user1', date: futureDate(3), timeSlot: '12:00', status: 'rejected' },
    },
    users: {
      'user2': { screenName: 'Alice' },
      'user3': { screenName: 'Bob' },
    },
  });
  document.dispatchEvent(new Event('DOMContentLoaded'));
  await firebaseMock._onAuthStateChanged(userMock);

  const html = document.getElementById('match-requests-list').innerHTML;
  expect(html).toContain('pending');
  expect(html).toContain('accepted');
  expect(html).toContain('rejected');
  expect(html).toContain('Alice');
  expect(html).toContain('Bob');
  expect(html).toContain(futureDate(1));
  expect(html).toContain(futureDate(2));
  expect(html).toContain(futureDate(3));
});

it('shows accept/reject buttons for pending requests to current user', async () => {
  // Use a future date so the request is not filtered out
  const today = new Date();
  function futureDate(daysAhead) {
    const d = new Date(today);
    d.setDate(d.getDate() + daysAhead);
    return d.toISOString().slice(0, 10);
  }

  firebaseMock._setData({
    matchRequests: {
      'req1': { fromUserId: 'user2', toUserId: 'user1', date: futureDate(1), timeSlot: '10:00', status: 'pending' },
    },
    users: { 'user2': { screenName: 'Alice' } },
  });
  document.dispatchEvent(new Event('DOMContentLoaded'));
  await firebaseMock._onAuthStateChanged(userMock);

  const listDiv = document.getElementById('match-requests-list');
  expect(listDiv.querySelector('.accept-match-btn')).not.toBeNull();
  expect(listDiv.querySelector('.reject-match-btn')).not.toBeNull();
});

  it('accepts a match request and updates UI', async () => {
  // Use a future date so the request is not filtered out
  const today = new Date();
  function futureDate(daysAhead) {
    const d = new Date(today);
    d.setDate(d.getDate() + daysAhead);
    return d.toISOString().slice(0, 10);
  }

  firebaseMock._setData({
    matchRequests: {
      'req1': { fromUserId: 'user2', toUserId: 'user1', date: futureDate(1), timeSlot: '10:00', status: 'pending' },
    },
    users: { 'user2': { screenName: 'Alice' } },
  });
  document.dispatchEvent(new Event('DOMContentLoaded'));
  await firebaseMock._onAuthStateChanged(userMock);

  const btn = document.querySelector('.accept-match-btn');
  expect(btn).not.toBeNull();
  // Simulate click
  await btn.click();
  expect(btn.textContent).toMatch(/Accepting|Accepted/);
});

  it('rejects a match request and updates UI', async () => {
    // Use a future date so the request is not filtered out
  const today = new Date();
  function futureDate(daysAhead) {
    const d = new Date(today);
    d.setDate(d.getDate() + daysAhead);
    return d.toISOString().slice(0, 10);
  }
  
    firebaseMock._setData({
      matchRequests: {
        'req1': { fromUserId: 'user2', toUserId: 'user1', date: futureDate(1), timeSlot: '10:00', status: 'pending' },
      },
      users: { 'user2': { screenName: 'Alice' } },
    });
    document.dispatchEvent(new Event('DOMContentLoaded'));
    await firebaseMock._onAuthStateChanged(userMock);

    const btn = document.querySelector('.reject-match-btn');
    expect(btn).not.toBeNull();
    // Simulate click
    await btn.click();
    expect(btn.textContent).toMatch(/Rejecting|Rejected/);
  });

  it('shows error message if Firestore throws', async () => {
    // Patch matchRequestsMock to throw
    matchRequestsMock.where = jest.fn(() => ({
      get: jest.fn().mockRejectedValue(new Error('Firestore error')),
    }));
    firebaseMock._setData({ matchRequests: {}, users: {} });
    document.dispatchEvent(new Event('DOMContentLoaded'));
    await firebaseMock._onAuthStateChanged(userMock);
    expect(document.getElementById('match-requests-list').innerHTML)
      .toContain('Error loading match requests');
  });
});