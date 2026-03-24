
/**
 * @jest-environment jsdom
 */
// tests/availability_form.test.js
// Automated tests for availability_form.js (form logic and saveAvailability)


// Form logic tests
describe('availability_form.js (form logic)', () => {
  let form, dateInput, resultDiv, user, saveAvailabilityMock;

  beforeEach(() => {
    document.body.innerHTML = `
      <form id="availability-form">
        <input type="hidden" name="date-times-json" value='[{"date":"2025-08-24","times":["18:00-19:00"]},{"date":"2025-08-25","times":["19:00-20:00"]}]'>
      </form>
      <input id="available-dates" value="2025-08-24,2025-08-25">
      <div id="result"></div>
    `;
    form = document.getElementById('availability-form');
    dateInput = document.getElementById('available-dates');
    resultDiv = document.getElementById('result');
    user = { email: 'test@example.com', uid: 'user123' };
    global.firebase = {
      auth: () => ({ currentUser: user }),
      firestore: jest.fn(),
    };
    saveAvailabilityMock = jest.fn(() => Promise.resolve());
    global.window.saveAvailability = saveAvailabilityMock;
    jest.resetModules();
    require('../src/availability_form');
  });

  afterEach(() => {
    jest.resetModules();
    delete global.window.saveAvailability;
    delete global.firebase;
  });

  it('submits selected dates and times and shows success', async () => {
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    await Promise.resolve();
    expect(saveAvailabilityMock).toHaveBeenCalledWith([
      { date: '2025-08-24', times: ['18:00-19:00'] },
      { date: '2025-08-25', times: ['19:00-20:00'] }
    ], 'test@example.com', 'user123');
    expect(resultDiv.textContent).toBe('Availability saved!');
  });

  it('shows error if not logged in', () => {
    global.firebase.auth = () => ({ currentUser: null });
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    expect(resultDiv.textContent).toBe('You must be logged in to submit availability.');
    expect(saveAvailabilityMock).not.toHaveBeenCalled();
  });

  it('shows error if no dates selected', () => {
    form.querySelector('input[name="date-times-json"]').value = '';
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    expect(resultDiv.textContent).toBe('Please select at least one date and time slot.');
    expect(saveAvailabilityMock).not.toHaveBeenCalled();
  });

  it('shows error if saveAvailability fails', async () => {
    saveAvailabilityMock.mockRejectedValueOnce(new Error('fail'));
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    // Wait for the DOM to update after the rejected promise
    await new Promise(r => setTimeout(r, 0));
    expect(resultDiv.textContent).toBe('Error: fail');
  });

  it('shows error for invalid JSON in date-times-json', () => {
    form.querySelector('input[name="date-times-json"]').value = '{not valid json}';
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    expect(resultDiv.textContent).toBe('Error: Invalid date/time data.');
    expect(saveAvailabilityMock).not.toHaveBeenCalled();
  });

  it('shows error if an entry has an empty times array', () => {
    form.querySelector('input[name="date-times-json"]').value = JSON.stringify([
      { date: '2025-08-24', times: [] }
    ]);
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    expect(resultDiv.textContent).toBe('Please add at least one time slot for 2025-08-24.');
    expect(saveAvailabilityMock).not.toHaveBeenCalled();
  });

  it('shows error if an entry has null times', () => {
    form.querySelector('input[name="date-times-json"]').value = JSON.stringify([
      { date: '2025-08-24', times: null }
    ]);
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    expect(resultDiv.textContent).toBe('Please add at least one time slot for 2025-08-24.');
    expect(saveAvailabilityMock).not.toHaveBeenCalled();
  });
});

// saveAvailability unit tests
describe('saveAvailability (unit)', () => {
  let dbMock, docRefMock, FieldValueMock, saveAvailability;
  const userUid = 'user123';
  const userEmail = 'test@example.com';
  const datesWithTimes = [
    { date: '2025-08-24', times: ['18:00-19:00'] },
    { date: '2025-08-25', times: ['19:00-20:00'] }
  ];

  beforeEach(() => {
    FieldValueMock = {
      arrayUnion: jest.fn((...args) => args),
      serverTimestamp: jest.fn(() => 'timestamp')
    };
    docRefMock = {
      get: jest.fn(),
      update: jest.fn(() => Promise.resolve('updated')),
      set: jest.fn(() => Promise.resolve('set'))
    };
    dbMock = {
      collection: jest.fn(() => ({ doc: jest.fn(() => docRefMock) }))
    };
    function firestore() { return dbMock; }
    firestore.FieldValue = FieldValueMock;
    global.firebase = {
      firestore,
      auth: jest.fn(),
    };
    jest.resetModules();
    saveAvailability = require('../src/availability_form').saveAvailability;
  });

  afterEach(() => {
    delete global.firebase;
  });

  it('updates document if exists', async () => {
    docRefMock.get.mockResolvedValueOnce({ exists: true, data: () => ({ datesWithTimes: [ { date: '2025-08-24', times: ['17:00-18:00'] } ] }) });
    const result = await saveAvailability(datesWithTimes, userEmail, userUid);
    expect(docRefMock.update).toHaveBeenCalledWith({
      datesWithTimes: expect.any(Array),
      email: userEmail,
      timestamp: 'timestamp'
    });
    expect(result).toBe('updated');
  });

  it('sets document if not exists', async () => {
    docRefMock.get.mockResolvedValueOnce({ exists: false });
    const result = await saveAvailability(datesWithTimes, userEmail, userUid);
    expect(docRefMock.set).toHaveBeenCalledWith({
      datesWithTimes: datesWithTimes,
      email: userEmail,
      timestamp: 'timestamp'
    });
    expect(result).toBe('set');
  });

  it('handles errors from Firestore', async () => {
    docRefMock.get.mockRejectedValueOnce(new Error('db error'));
    await expect(saveAvailability(datesWithTimes, userEmail, userUid)).rejects.toThrow('db error');
  });

  it('uses empty array when datesWithTimes field is missing in existing doc', async () => {
    docRefMock.get.mockResolvedValueOnce({ exists: true, data: () => ({}) });
    await saveAvailability([{ date: '2025-08-24', times: ['18:00-19:00'] }], userEmail, userUid);
    const updateArg = docRefMock.update.mock.calls[0][0];
    expect(updateArg.datesWithTimes).toEqual([{ date: '2025-08-24', times: ['18:00-19:00'] }]);
  });

  it('deduplicates time slots when merging overlapping times for the same date', async () => {
    docRefMock.get.mockResolvedValueOnce({
      exists: true,
      data: () => ({ datesWithTimes: [{ date: '2025-08-24', times: ['18:00-19:00'] }] })
    });
    await saveAvailability(
      [{ date: '2025-08-24', times: ['18:00-19:00', '19:00-20:00'] }],
      userEmail, userUid
    );
    const updateArg = docRefMock.update.mock.calls[0][0];
    expect(updateArg.datesWithTimes[0].times).toHaveLength(2);
    expect(updateArg.datesWithTimes[0].times).toContain('18:00-19:00');
    expect(updateArg.datesWithTimes[0].times).toContain('19:00-20:00');
  });
});

// deleteAvailabilityDate unit tests
describe('deleteAvailabilityDate', () => {
  let deleteAvailabilityDateFn, resultDiv;
  let docRefMock, batchMock, matchReqQueryMock, dbMock;
  const user = { email: 'test@example.com', uid: 'user123' };

  beforeEach(() => {
    document.body.innerHTML = '<div id="result"></div>';
    resultDiv = document.getElementById('result');

    batchMock = {
      delete: jest.fn(),
      commit: jest.fn(() => Promise.resolve())
    };

    const mockDoc = { ref: 'mockDocRef' };
    const populatedSnap = { forEach: jest.fn((cb) => cb(mockDoc)) };
    matchReqQueryMock = {
      where: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          get: jest.fn(() => Promise.resolve(populatedSnap))
        })
      })
    };

    docRefMock = {
      get: jest.fn(),
      update: jest.fn(() => Promise.resolve())
    };

    dbMock = {
      collection: jest.fn((name) => {
        if (name === 'availability') return { doc: jest.fn(() => docRefMock) };
        return matchReqQueryMock;
      }),
      batch: jest.fn(() => batchMock)
    };

    global.firebase = {
      auth: () => ({ currentUser: user }),
      firestore: () => dbMock
    };

    jest.resetModules();
    require('../src/availability_form');
    deleteAvailabilityDateFn = window.deleteAvailabilityDate;
  });

  afterEach(() => {
    jest.resetModules();
    delete global.firebase;
  });

  it('shows error if not logged in', () => {
    global.firebase.auth = () => ({ currentUser: null });
    deleteAvailabilityDateFn('2025-08-24');
    expect(resultDiv.textContent).toBe('You must be logged in to delete availability.');
    expect(docRefMock.get).not.toHaveBeenCalled();
  });

  it('removes date, deletes related match requests, and calls onSuccess', async () => {
    docRefMock.get.mockResolvedValueOnce({
      exists: true,
      data: () => ({ datesWithTimes: [{ date: '2025-08-24', times: ['18:00-19:00'] }] })
    });
    const onSuccess = jest.fn();
    deleteAvailabilityDateFn('2025-08-24', onSuccess);
    await new Promise(r => setTimeout(r, 0));
    expect(docRefMock.update).toHaveBeenCalledWith({ datesWithTimes: [] });
    expect(batchMock.commit).toHaveBeenCalled();
    expect(resultDiv.textContent).toBe('Date removed!');
    expect(onSuccess).toHaveBeenCalled();
  });

  it('works correctly without an onSuccess callback', async () => {
    docRefMock.get.mockResolvedValueOnce({
      exists: true,
      data: () => ({ datesWithTimes: [{ date: '2025-08-24', times: ['18:00-19:00'] }] })
    });
    deleteAvailabilityDateFn('2025-08-24');
    await new Promise(r => setTimeout(r, 0));
    expect(resultDiv.textContent).toBe('Date removed!');
  });

  it('skips availability update if doc does not exist', async () => {
    docRefMock.get.mockResolvedValueOnce({ exists: false });
    deleteAvailabilityDateFn('2025-08-24');
    await new Promise(r => setTimeout(r, 0));
    expect(docRefMock.update).not.toHaveBeenCalled();
    expect(batchMock.commit).toHaveBeenCalled();
    expect(resultDiv.textContent).toBe('Date removed!');
  });

  it('shows error if a Firestore operation fails', async () => {
    docRefMock.get.mockRejectedValueOnce(new Error('delete error'));
    deleteAvailabilityDateFn('2025-08-24');
    await new Promise(r => setTimeout(r, 0));
    expect(resultDiv.textContent).toBe('Error: delete error');
  });
});

// DOMContentLoaded path
describe('availability_form.js DOMContentLoaded path', () => {
  afterEach(() => {
    Object.defineProperty(document, 'readyState', { value: 'complete', configurable: true });
    jest.resetModules();
    delete global.firebase;
    delete global.window.saveAvailability;
  });

  it('attaches submit listener via DOMContentLoaded when readyState is loading', async () => {
    Object.defineProperty(document, 'readyState', { value: 'loading', configurable: true });
    document.body.innerHTML = `
      <form id="availability-form">
        <input type="hidden" name="date-times-json" value='[{"date":"2025-08-24","times":["18:00-19:00"]}]'>
      </form>
      <div id="result"></div>
    `;
    const saveAvailabilityMock = jest.fn(() => Promise.resolve());
    global.firebase = {
      auth: () => ({ currentUser: { email: 'test@example.com', uid: 'user123' } }),
      firestore: jest.fn()
    };
    global.window.saveAvailability = saveAvailabilityMock;

    jest.resetModules();
    require('../src/availability_form');

    // Listener is not attached yet — fire DOMContentLoaded to trigger attachListener
    document.dispatchEvent(new Event('DOMContentLoaded'));

    document.getElementById('availability-form').dispatchEvent(
      new Event('submit', { bubbles: true, cancelable: true })
    );
    await Promise.resolve();

    expect(saveAvailabilityMock).toHaveBeenCalledWith(
      [{ date: '2025-08-24', times: ['18:00-19:00'] }],
      'test@example.com',
      'user123'
    );
  });
});