const fs = require('fs');
const path = require('path');

// match_requests_box.test.js
/**
 * @jest-environment jsdom
 */

let firebaseMock, userMock, dbMock, matchRequestsMock, usersMock;
const scriptPath = path.resolve(__dirname, '../match_requests_box.js');

beforeEach(() => {
  document.body.innerHTML = `<div id="match-requests-list"></div>`;
  userMock = { uid: 'user1' };

  // Firestore mocks
  let matchRequestsData = {};
  let usersData = {};

  matchRequestsMock = {
    where: jest.fn(function (field, op, value) {
      let filtered = [];
      if (field === 'fromUserId' && op === 'in') {
        filtered = Object.entries(matchRequestsData)
          .filter(([id, req]) => value.includes(req.fromUserId))
          .map(([id, req]) => ({ id, data: () => req }));
      }
      if (field === 'toUserId' && op === '==') {
        filtered = Object.entries(matchRequestsData)
          .filter(([id, req]) => req.toUserId === value)
          .map(([id, req]) => ({ id, data: () => req }));
      }
      return {
        get: jest.fn().mockResolvedValue({
          forEach: cb => filtered.forEach(doc => cb(doc)),
        }),
      };
    }),
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
      .toContain('No match requests yet');
  });

  it('renders pending, accepted, and rejected requests', async () => {
    firebaseMock._setData({
      matchRequests: {
        'req1': { fromUserId: 'user1', toUserId: 'user2', date: '2024-06-01', timeSlot: '10:00', status: 'pending' },
        'req2': { fromUserId: 'user2', toUserId: 'user1', date: '2024-06-02', timeSlot: '11:00', status: 'accepted' },
        'req3': { fromUserId: 'user3', toUserId: 'user1', date: '2024-06-03', timeSlot: '12:00', status: 'rejected' },
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
    expect(html).toContain('2024-06-01');
    expect(html).toContain('2024-06-02');
    expect(html).toContain('2024-06-03');
  });

  it('shows accept/reject buttons for pending requests to current user', async () => {
    firebaseMock._setData({
      matchRequests: {
        'req1': { fromUserId: 'user2', toUserId: 'user1', date: '2024-06-01', timeSlot: '10:00', status: 'pending' },
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
    firebaseMock._setData({
      matchRequests: {
        'req1': { fromUserId: 'user2', toUserId: 'user1', date: '2024-06-01', timeSlot: '10:00', status: 'pending' },
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
    firebaseMock._setData({
      matchRequests: {
        'req1': { fromUserId: 'user2', toUserId: 'user1', date: '2024-06-01', timeSlot: '10:00', status: 'pending' },
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