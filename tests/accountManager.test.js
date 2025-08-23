// accountManager.test.js
// Automated tests for accountManager.js

const { updateScreenName } = require('../accountManager');

describe('updateScreenName', () => {
  let firestoreMock, collectionMock, docMock, updateMock;
  const userId = 'testUser';
  const newScreenName = 'newName';

  beforeAll(() => {
    updateMock = jest.fn().mockResolvedValue(undefined);
    docMock = jest.fn(() => ({ update: updateMock }));
    collectionMock = jest.fn(() => ({ doc: docMock }));
    firestoreMock = jest.fn(() => ({ collection: collectionMock }));
    global.firebase = { firestore: firestoreMock };
  });

  afterAll(() => {
    delete global.firebase;
  });

  it('updates the screenName for a valid user', async () => {
    await expect(updateScreenName(userId, newScreenName)).resolves.toBeUndefined();
    expect(firestoreMock).toHaveBeenCalled();
    expect(collectionMock).toHaveBeenCalledWith('users');
    expect(docMock).toHaveBeenCalledWith(userId);
    expect(updateMock).toHaveBeenCalledWith({ screenName: newScreenName });
  });

  it('throws error if userId or newScreenName is missing', async () => {
    await expect(updateScreenName('', newScreenName)).rejects.toThrow();
    await expect(updateScreenName(userId, '')).rejects.toThrow();
  });
});
