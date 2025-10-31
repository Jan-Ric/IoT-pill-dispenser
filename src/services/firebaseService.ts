// src/services/firebaseService.ts

import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, set, update, Unsubscribe } from 'firebase/database';
import { FirebaseData } from '../types';

// Your Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyDSwvmOYIJvi1yGUsptwjseRJlenYLJGzo",
  authDomain: "meditrack-24ee5.firebaseapp.com",
  databaseURL: "https://meditrack-24ee5-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "meditrack-24ee5",
  storageBucket: "meditrack-24ee5.appspot.com",
  messagingSenderId: "1044793149591",
  appId: "1:1044793149591:web:baceccc719e4dce0eb81d2"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// Firebase service object
export const firebaseService = {
  // Subscribe to medicine updates - now returns unsubscribe function
  onValue: (callback: (data: FirebaseData) => void): Unsubscribe => {
    const dbRef = ref(database, 'medicine_updates');
    const unsubscribe = onValue(dbRef, (snapshot) => {
      const data = snapshot.val();
      console.log('Firebase data received:', data);
      if (data) {
        callback(data);
      }
    });
    return unsubscribe;
  },

  // Update medicine data
  update: (data: FirebaseData) => {
    const dbRef = ref(database, 'medicine_updates');
    update(dbRef, data);
  },

  // Set initial data
  set: (data: FirebaseData) => {
    const dbRef = ref(database, 'medicine_updates');
    set(dbRef, data);
  },

  // For testing only (remove later)
  simulateArduinoUpdate: (medicineId: string, taken: boolean, time: string) => {
    const dbRef = ref(database, 'medicine_updates');
    set(dbRef, {
      medicineId: medicineId,
      medicine_taken: taken,
      time: time,
      date: new Date().toLocaleDateString(),
      datetime: new Date().toLocaleString(),
      timestamp: Math.floor(Date.now() / 1000)
    });
  }
};