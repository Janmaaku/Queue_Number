// Import the functions you need from the SDKs you need
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/12.13.0/firebase-analytics.js";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBNVlxUjdrqWSqjFxFRmHS0pjDeWRYj2o8",
  authDomain: "queue-number-a70f0.firebaseapp.com",
  projectId: "queue-number-a70f0",
  storageBucket: "queue-number-a70f0.firebasestorage.app",
  messagingSenderId: "135302326058",
  appId: "1:135302326058:web:9d7e16ace295003ac06053",
  measurementId: "G-8TEVZ0KR1K",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
