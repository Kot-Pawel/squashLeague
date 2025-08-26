
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
    require('../availability_form');
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
    saveAvailability = require('../availability_form').saveAvailability;
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
});