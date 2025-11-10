// src/services/firebaseService.ts

import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, set, update, remove, Unsubscribe, get } from 'firebase/database';
import { FirebaseData, Medicine, SyncCommand } from '../types';

const firebaseConfig = {
  apiKey: "AIzaSyDSwvmOYIJvi1yGUsptwjseRJlenYLJGzo",
  authDomain: "meditrack-24ee5.firebaseapp.com",
  databaseURL: "https://meditrack-24ee5-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "meditrack-24ee5",
  storageBucket: "meditrack-24ee5.appspot.com",
  messagingSenderId: "1044793149591",
  appId: "1:1044793149591:web:baceccc719e4dce0eb81d2"
};

const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

export const firebaseService = {
  // ===== MEDICINE UPDATES (existing) =====
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

  update: (data: FirebaseData) => {
    const dbRef = ref(database, 'medicine_updates');
    update(dbRef, data);
  },

  set: (data: FirebaseData) => {
    const dbRef = ref(database, 'medicine_updates');
    set(dbRef, data);
  },

  // ===== MEDICINE MANAGEMENT (new) =====
  
  // Get all medicines
  getMedicines: async (): Promise<Record<string, Medicine | null>> => {
    const dbRef = ref(database, 'medicines');
    const snapshot = await get(dbRef);
    return snapshot.val() || { slot_0: null, slot_1: null, slot_2: null };
  },

  // Listen to medicines changes
  onMedicinesChange: (callback: (medicines: Record<string, Medicine | null>) => void): Unsubscribe => {
    const dbRef = ref(database, 'medicines');
    return onValue(dbRef, (snapshot) => {
      const data = snapshot.val() || { slot_0: null, slot_1: null, slot_2: null };
      callback(data);
    });
  },

  // Save a medicine to a specific slot
  saveMedicine: async (slotId: string, medicine: Medicine) => {
    const dbRef = ref(database, `medicines/${slotId}`);
    await set(dbRef, medicine);
  },

  // Delete a medicine from a slot
  deleteMedicine: async (slotId: string) => {
    const dbRef = ref(database, `medicines/${slotId}`);
    await set(dbRef, null);
  },

  // Update all medicines at once
  updateAllMedicines: async (medicines: Record<string, Medicine | null>) => {
    const dbRef = ref(database, 'medicines');
    await set(dbRef, medicines);
  },

  // ===== SYNC COMMAND =====
  
  // Send sync command to Arduino
  sendSyncCommand: async () => {
    const dbRef = ref(database, 'sync_command');
    await set(dbRef, {
      reload: true,
      timestamp: Math.floor(Date.now() / 1000)
    });
  },

  // Clear sync command
  clearSyncCommand: async () => {
    const dbRef = ref(database, 'sync_command');
    await set(dbRef, {
      reload: false,
      timestamp: 0
    });
  },

  // Listen to sync command changes
  onSyncCommand: (callback: (command: SyncCommand) => void): Unsubscribe => {
    const dbRef = ref(database, 'sync_command');
    return onValue(dbRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        callback(data);
      }
    });
  },

  // ===== DISPENSE COMMAND (existing, enhanced) =====
  
  sendDispenseCommand: async (medicineId: string, scheduleId: string) => {
    const dbRef = ref(database, 'dispense_command');
    await set(dbRef, {
      medicineId,
      scheduleId,
      timestamp: Math.floor(Date.now() / 1000)
    });
  },

  clearDispenseCommand: async () => {
    const dbRef = ref(database, 'dispense_command');
    await remove(dbRef);
  },

  // ===== TESTING =====
  
  simulateArduinoUpdate: (medicineId: string, scheduleId: string, taken: boolean, time: string) => {
    const dbRef = ref(database, 'medicine_updates');
    set(dbRef, {
      medicineId,
      scheduleId,
      medicine_taken: taken,
      time,
      date: new Date().toLocaleDateString(),
      datetime: new Date().toLocaleString(),
      timestamp: Math.floor(Date.now() / 1000)
    });
  }
};