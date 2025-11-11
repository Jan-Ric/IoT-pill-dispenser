// src/services/firebaseService.ts

import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, set, update, remove, Unsubscribe, get, push } from 'firebase/database';
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

export const app = initializeApp(firebaseConfig);
export const database = getDatabase(app);

export interface HistoryRecord {
  id: string;
  name: string;
  dosage: string;
  scheduledTime: string;
  takenTime: string;
  date: string;
  status: 'taken' | 'missed';
  timestamp: number;
}

export interface Alert {
  id: string;
  type: 'missed' | 'connection' | 'dispensed' | 'taken';
  message: string;
  time: string;
  timestamp: number;
}

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

  // ===== MEDICINE MANAGEMENT (existing) =====
  
  getMedicines: async (): Promise<Record<string, Medicine | null>> => {
    const dbRef = ref(database, 'medicines');
    const snapshot = await get(dbRef);
    return snapshot.val() || { slot_0: null, slot_1: null, slot_2: null };
  },

  onMedicinesChange: (callback: (medicines: Record<string, Medicine | null>) => void): Unsubscribe => {
    const dbRef = ref(database, 'medicines');
    return onValue(dbRef, (snapshot) => {
      const data = snapshot.val() || { slot_0: null, slot_1: null, slot_2: null };
      callback(data);
    });
  },

  saveMedicine: async (slotId: string, medicine: Medicine) => {
    const dbRef = ref(database, `medicines/${slotId}`);
    await set(dbRef, medicine);
  },

  deleteMedicine: async (slotId: string) => {
    const dbRef = ref(database, `medicines/${slotId}`);
    await set(dbRef, null);
  },

  updateAllMedicines: async (medicines: Record<string, Medicine | null>) => {
    const dbRef = ref(database, 'medicines');
    await set(dbRef, medicines);
  },

  // ===== HISTORY MANAGEMENT (NEW) =====
  
  // Add a history record
  addHistoryRecord: async (record: Omit<HistoryRecord, 'id'>) => {
    const dbRef = ref(database, 'medicine_history');
    const newRecordRef = push(dbRef);
    await set(newRecordRef, {
      ...record,
      id: newRecordRef.key
    });
  },

  // Get all history records
  getHistory: async (): Promise<HistoryRecord[]> => {
    const dbRef = ref(database, 'medicine_history');
    const snapshot = await get(dbRef);
    const data = snapshot.val();
    if (!data) return [];
    
    const records: HistoryRecord[] = [];
    Object.values(data).forEach((value: any) => {
      if (value && typeof value === 'object') {
        records.push(value as HistoryRecord);
      }
    });
    
    return records.sort((a, b) => b.timestamp - a.timestamp);
  },

  // Listen to history changes
  onHistoryChange: (callback: (history: HistoryRecord[]) => void): Unsubscribe => {
    const dbRef = ref(database, 'medicine_history');
    return onValue(dbRef, (snapshot) => {
      const data = snapshot.val();
      if (!data) {
        callback([]);
        return;
      }
      
      const records: HistoryRecord[] = [];
      Object.values(data).forEach((value: any) => {
        if (value && typeof value === 'object') {
          records.push(value as HistoryRecord);
        }
      });
      
      const sortedRecords = records.sort((a, b) => b.timestamp - a.timestamp);
      callback(sortedRecords);
    });
  },

  // Clear all history
  clearHistory: async () => {
    const dbRef = ref(database, 'medicine_history');
    await set(dbRef, null);
  },

  // ===== ALERTS MANAGEMENT (NEW) =====
  
  // Add an alert
  addAlert: async (alert: Omit<Alert, 'id'>) => {
    const dbRef = ref(database, 'recent_alerts');
    const snapshot = await get(dbRef);
    const currentAlerts = snapshot.val() || [];
    
    const newAlert: Alert = {
      ...alert,
      id: Date.now().toString()
    };
    
    // Keep only the last 10 alerts
    const updatedAlerts = [newAlert, ...currentAlerts].slice(0, 10);
    await set(dbRef, updatedAlerts);
  },

  // Get recent alerts
  getAlerts: async (): Promise<Alert[]> => {
    const dbRef = ref(database, 'recent_alerts');
    const snapshot = await get(dbRef);
    return snapshot.val() || [];
  },

  // Listen to alerts changes
  onAlertsChange: (callback: (alerts: Alert[]) => void): Unsubscribe => {
    const dbRef = ref(database, 'recent_alerts');
    return onValue(dbRef, (snapshot) => {
      const data = snapshot.val();
      callback(data || []);
    });
  },

  // Clear alerts
  clearAlerts: async () => {
    const dbRef = ref(database, 'recent_alerts');
    await set(dbRef, []);
  },

  // ===== SYNC COMMAND (existing) =====
  
  sendSyncCommand: async () => {
    const dbRef = ref(database, 'sync_command');
    await set(dbRef, {
      reload: true,
      timestamp: Math.floor(Date.now() / 1000)
    });
  },

  clearSyncCommand: async () => {
    const dbRef = ref(database, 'sync_command');
    await set(dbRef, {
      reload: false,
      timestamp: 0
    });
  },

  onSyncCommand: (callback: (command: SyncCommand) => void): Unsubscribe => {
    const dbRef = ref(database, 'sync_command');
    return onValue(dbRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        callback(data);
      }
    });
  },

  // ===== DISPENSE COMMAND (existing) =====
  
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

  // ===== TESTING (existing) =====
  
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