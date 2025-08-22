# squashLeague

App to manage squash pairings and more

## Security Note: Firebase API Key

This project uses Firebase for authentication and database. The Firebase API key is included in the client-side code. This is expected and safe for Firebase web apps:

- The API key is not a secret; it is required for the Firebase SDK to function in the browser.
- Security for your data is enforced by Firestore security rules, not by hiding the API key.
- Never include private keys, service account credentials, or admin secrets in client-side code.

For more information, see the [Firebase documentation](https://firebase.google.com/docs/projects/api-keys).
