// Handles user account management, including screenName updates

/**
 * Updates the user's screenName in the database.
 * @param {string} userId - The user's unique ID.
 * @param {string} newScreenName - The new screen name to set.
 * @returns {Promise<void>}
 */
async function updateScreenName(userId, newScreenName) {
  if (!userId || !newScreenName) throw new Error('Missing userId or newScreenName');
  // Use the global firebase object
  await firebase.firestore().collection('users').doc(userId).update({
    screenName: newScreenName
  });
}

module.exports = { updateScreenName };
