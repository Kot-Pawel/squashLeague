// tests/firebase.test.js
// Automated tests for firebase.js
// Note: This file uses Jest and mocks Firebase globals



// Mock Firebase global with firestore as both a function and an object
const mockUpdate = jest.fn(() => Promise.resolve('updated'));
const mockSet = jest.fn(() => Promise.resolve('created'));
const mockGetExists = (exists) => jest.fn(() => Promise.resolve({ exists }));
const mockArrayUnion = (...dates) => dates;
const mockServerTimestamp = () => 'timestamp';

function makeFirebaseMock(getExistsFn) {
  const firestoreFn = jest.fn(() => ({
    collection: jest.fn(() => ({
      doc: jest.fn(() => ({
        get: getExistsFn,
        update: mockUpdate,
        set: mockSet
      }))
    }))
  }));
  firestoreFn.FieldValue = {
    arrayUnion: mockArrayUnion,
    serverTimestamp: mockServerTimestamp
  };
  return {
    firestore: firestoreFn,
    auth: () => ({
      currentUser: { email: 'test@example.com', uid: 'user123' }
    }),
    analytics: jest.fn(),
    initializeApp: jest.fn()
  };
}



describe('saveAvailability', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();
  });

  it('should update existing document with new dates', async () => {
    // Arrange
    global.firebase = makeFirebaseMock(mockGetExists(true));
    const { saveAvailability } = require('../firebase');

    // Act
    const result = await saveAvailability(['2025-08-23'], 'test@example.com', 'user123');

    // Assert
    expect(mockUpdate).toHaveBeenCalledWith({
      dates: ['2025-08-23'],
      email: 'test@example.com',
      timestamp: 'timestamp'
    });
    expect(result).toBe('updated');
  });

  it('should create a new document if it does not exist', async () => {
    // Arrange
    global.firebase = makeFirebaseMock(mockGetExists(false));
    const { saveAvailability } = require('../firebase');

    // Act
    const result = await saveAvailability(['2025-08-24'], 'test2@example.com', 'user456');

    // Assert
    expect(mockSet).toHaveBeenCalledWith({
      dates: ['2025-08-24'],
      email: 'test2@example.com',
      timestamp: 'timestamp'
    });
    expect(result).toBe('created');
  });
});