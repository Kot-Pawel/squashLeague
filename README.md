# Squash League

Squash League is a web app that helps squash players find partners and organize games. Users can:

- Register with email, password, and a custom screen name
- Log in and manage their weekly availability using a calendar
- See which dates they have picked and who else is available on those dates
- Use a "Find a Partner" calendar to view other available players for a selected date
- See a summary of their upcoming dates and potential partners for the next 14 days
- Enjoy a modern, mobile-friendly interface with a custom banner and Bootstrap styling

All user data is securely stored in Firebase (Firestore and Authentication). Screen names are used for privacy instead of emails. The app is designed for easy deployment on GitHub Pages.

## Security Note: Firebase API Key

This project uses Firebase for authentication and database. The Firebase API key is included in the client-side code. This is expected and safe for Firebase web apps:

- The API key is not a secret; it is required for the Firebase SDK to function in the browser.
- Security for your data is enforced by Firestore security rules, not by hiding the API key.
- Never include private keys, service account credentials, or admin secrets in client-side code.

For more information, see the [Firebase documentation](https://firebase.google.com/docs/projects/api-keys).

# Testing

This project uses [Jest](https://jestjs.io/) for automated testing of JavaScript code.

## Setup

1. Make sure you have [Node.js](https://nodejs.org/) installed.
2. Install project dependencies (including Jest):
	```sh
	npm install
	```

## Running Tests

To run all tests:

```sh
npm test
```

Test files are located in the `tests/` directory and should be named with the `.test.js` suffix.

## PowerShell Users

If you see an error about running scripts being disabled (e.g., `npm.ps1 cannot be loaded because running scripts is disabled on this system`), run this command in PowerShell:

```sh
Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned -Force
```

This allows npm scripts to run in your user environment.

## Adding New Tests

- Place new test files in the `tests/` directory.
- Use the `.test.js` extension (e.g., `myFunction.test.js`).
- See `tests/sample.test.js` for an example.

## Troubleshooting

- If you have issues, make sure dependencies are installed and your Node.js version is up to date.