// Handles user account management, including screenName updates

/**
 * Updates the user's screenName in the database.
 * @param {string} userId - The user's unique ID.
 * @param {string} newScreenName - The new screen name to set.
 * @returns {Promise<void>}
 */
async function updateScreenName(userId, newScreenName) {
  if (!userId || !newScreenName) throw new Error('Missing userId or newScreenName');
  await firebase.firestore().collection('users').doc(userId).set({
    screenName: newScreenName
  }, { merge: true });
}

/**
 * Persists the user's preferred app colour mode ('dark' | 'light') to Firestore.
 * @param {string} userId
 * @param {'dark'|'light'} mode
 * @returns {Promise<void>}
 */
async function updateAppMode(userId, mode) {
  if (!userId) throw new Error('Missing userId');
  if (mode !== 'dark' && mode !== 'light') throw new Error('Invalid mode: ' + mode);
  await firebase.firestore().collection('users').doc(userId).set({
    appMode: mode
  }, { merge: true });
}

module.exports = { updateScreenName, updateAppMode };
