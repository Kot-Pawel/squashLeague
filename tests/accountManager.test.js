// accountManager.test.js
// Automated tests for accountManager.js

const { updateScreenName, updateAppMode, updateAvatar } = require('../src/accountManager');

describe('updateScreenName', () => {
  let firestoreMock, collectionMock, docMock, updateMock;
  const userId = 'testUser';
  const newScreenName = 'newName';

  beforeAll(() => {
    updateMock = jest.fn().mockResolvedValue(undefined);
    docMock = jest.fn(() => ({ set: updateMock }));
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
    expect(updateMock).toHaveBeenCalledWith({ screenName: newScreenName }, { merge: true });
  });

  it('throws error if userId or newScreenName is missing', async () => {
    await expect(updateScreenName('', newScreenName)).rejects.toThrow();
    await expect(updateScreenName(userId, '')).rejects.toThrow();
  });

  describe('updateAppMode', () => {
    it('updates the appMode for a valid user and mode', async () => {
      await expect(updateAppMode(userId, 'dark')).resolves.toBeUndefined();
      expect(firestoreMock).toHaveBeenCalled();
      expect(collectionMock).toHaveBeenCalledWith('users');
      expect(docMock).toHaveBeenCalledWith(userId);
      expect(updateMock).toHaveBeenCalledWith({ appMode: 'dark' }, { merge: true });
    });

    it('accepts light mode as valid', async () => {
      updateMock.mockClear();
      await expect(updateAppMode(userId, 'light')).resolves.toBeUndefined();
      expect(updateMock).toHaveBeenCalledWith({ appMode: 'light' }, { merge: true });
    });

    it('throws error for missing userId or invalid mode', async () => {
      await expect(updateAppMode('', 'dark')).rejects.toThrow();
      await expect(updateAppMode(userId, 'blue')).rejects.toThrow();
    });
  });

  describe('updateAvatar', () => {
    it('saves avatarSeed for a valid user', async () => {
      updateMock.mockClear();
      await expect(updateAvatar(userId, 'Ace')).resolves.toBeUndefined();
      expect(collectionMock).toHaveBeenCalledWith('users');
      expect(docMock).toHaveBeenCalledWith(userId);
      expect(updateMock).toHaveBeenCalledWith({ avatarSeed: 'Ace' }, { merge: true });
    });

    it('throws if userId is missing', async () => {
      await expect(updateAvatar('', 'Ace')).rejects.toThrow();
    });

    it('throws if avatarId is missing', async () => {
      await expect(updateAvatar(userId, '')).rejects.toThrow();
    });
  });
});
