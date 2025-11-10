// IMPORTANT: Import compat libraries for the CDN versions
import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import 'firebase/compat/auth';
import 'firebase/compat/storage';

// Your web app's Firebase configuration
// REPLACE THIS WITH YOUR ACTUAL CONFIG FROM THE FIREBASE CONSOLE
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_AUTH_DOMAIN",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_STORAGE_BUCKET",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);

const firestore = app.firestore();
const auth = firebase.auth();
const storage = firebase.storage();

// Enable Firestore offline persistence
// This must be done after initialization but before any other Firestore calls
try {
  // FIX: Use the compat version of enablePersistence.
  // The modular `enableIndexedDbPersistence` was being used with a compat `firestore` instance, causing a type mismatch on line 29.
  firestore.enablePersistence()
    .then(() => console.log("Firebase offline persistence enabled."))
    .catch((err) => {
      if (err.code == 'failed-precondition') {
        console.warn("Firebase persistence failed. Multiple tabs open?");
      } else if (err.code == 'unimplemented') {
        console.warn("The current browser does not support all of the features required to enable persistence.");
      }
    });
} catch (error) {
    console.error("Error enabling Firebase persistence:", error);
}


export { firestore, auth, storage, firebase };