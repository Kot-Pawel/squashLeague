// Firebase App (the core Firebase SDK) is always required and must be listed first
// These scripts are loaded via CDN in index.html, so we can use the global 'firebase' object

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDc-cnfMWL_YkpaADfI6lzsJUJXxSjyGBk",
  authDomain: "squashleague-ff916.firebaseapp.com",
  projectId: "squashleague-ff916",
  storageBucket: "squashleague-ff916.firebasestorage.app",
  messagingSenderId: "7489941410",
  appId: "1:7489941410:web:b8498e235103af346eccfb",
  measurementId: "G-WKV3GFP0X0"
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
if (firebase.analytics) {
  firebase.analytics();
}