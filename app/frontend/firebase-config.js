// Frontend Firebase Configuration
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getAnalytics } from 'firebase/analytics';

const firebaseConfig = {
  apiKey: "AIzaSyCZukwkWlqkaO46LlF865cyg_7TVpusvWY",
  authDomain: "salon-system-138.firebaseapp.com",
  projectId: "salon-system-138",
  storageBucket: "salon-system-138.appspot.com",
  messagingSenderId: "167894754021",
  appId: "1:167894754021:web:your-app-id",
  measurementId: "G-MEASUREMENT_ID"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const analytics = getAnalytics(app);

export default app;