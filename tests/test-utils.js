// Common test utilities for jsdom + firebase mocking
function mockFirebase(overrides = {}) {
  const set = jest.fn(() => Promise.resolve());
  const get = jest.fn(() => Promise.resolve({ exists: false }));
  const doc = jest.fn(() => ({ get, set }));
  const collection = jest.fn(() => ({ doc }));
  const firestore = jest.fn(() => ({ collection }));

  const firebase = Object.assign({ firestore }, overrides);
  global.firebase = firebase;
  return { firebase, spies: { collection, doc, get, set, firestore } };
}

function clearDom() {
  document.body.innerHTML = '';
  // reset attributes
  document.documentElement.removeAttribute('data-theme');
  try { localStorage.clear(); } catch (_) {}
}

module.exports = { mockFirebase, clearDom };
