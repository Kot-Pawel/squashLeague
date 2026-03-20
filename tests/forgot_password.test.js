/**
 * @jest-environment jsdom
 */
// Tests for the forgot-password flow in src/auth.js
describe('forgot password flow (compat fallback)', () => {
  beforeEach(() => {
    // Minimal DOM needed for the flow
    document.body.innerHTML = `
      <form id="login-form">
        <input id="login-email" value="prefill@example.com">
        <input id="login-password" value="pw">
        <div id="login-result"></div>
      </form>
      <a href="#" id="forgot-password-link">Forgot password?</a>
      <!-- modal markup is present in app but bootstrap isn't loaded in tests -->
      <div class="modal fade" id="forgotPasswordModal" tabindex="-1" aria-hidden="true">
        <div class="modal-dialog">
          <div class="modal-content">
            <div class="modal-body">
              <div id="forgot-modal-alert"></div>
              <form id="forgot-password-form" novalidate>
                <input type="email" id="forgot-email-input">
              </form>
            </div>
            <div class="modal-footer">
              <button type="button" id="forgot-send-btn">Send reset email</button>
            </div>
          </div>
        </div>
      </div>
    `;

    // Mock firebase compat auth
    const sendMock = jest.fn(() => Promise.resolve());
    window.firebase = {
      auth: jest.fn(() => ({
        sendPasswordResetEmail: sendMock,
        sendPasswordResetEmail: sendMock // ensure property present
      }))
    };

    // Prevent auth observer from running (we don't test auth state here)
    window.observeAuthState = jest.fn();

    // Mock prompt fallback
    window.prompt = jest.fn(() => 'user@example.com');

    jest.resetModules();
    require('../src/auth');
    // trigger DOMContentLoaded
    document.dispatchEvent(new Event('DOMContentLoaded', { bubbles: true, cancelable: true }));
  });

  afterEach(() => {
    jest.resetModules();
    delete window.firebase;
    delete window.prompt;
  });

  it('calls sendPasswordResetEmail via prompt fallback and shows success message', async () => {
    const forgot = document.getElementById('forgot-password-link');
    forgot.click();
    // wait for microtasks
    await new Promise(r => setTimeout(r, 0));
    // firebase.auth().sendPasswordResetEmail should have been called
    const auth = window.firebase.auth();
    expect(auth.sendPasswordResetEmail).toHaveBeenCalledWith('user@example.com');
    // login-result should contain success alert
    const loginResult = document.getElementById('login-result');
    expect(loginResult.innerHTML).toMatch(/password reset email has been sent/i);
  });

  it('shows success message even when sendPasswordResetEmail rejects', async () => {

  // Replace mock to reject
  const sendMock = jest.fn(() => Promise.reject(new Error('network')));
  window.firebase = { auth: jest.fn(() => ({ sendPasswordResetEmail: sendMock })) };
  // ensure observeAuthState is still mocked after module reset
  window.observeAuthState = jest.fn();
  jest.resetModules();
  require('../src/auth');
  document.dispatchEvent(new Event('DOMContentLoaded', { bubbles: true, cancelable: true }));

  // Ensure prompt returns an email
  window.prompt = jest.fn(() => 'fail@example.com');

    const forgot = document.getElementById('forgot-password-link');
    forgot.click();
    await new Promise(r => setTimeout(r, 0));
    const auth = window.firebase.auth();
    expect(auth.sendPasswordResetEmail).toHaveBeenCalledWith('fail@example.com');
    const loginResult = document.getElementById('login-result');
    expect(loginResult.innerHTML).toMatch(/password reset email has been sent/i);
  });
});
