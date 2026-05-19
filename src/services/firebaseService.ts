// src/services/firebaseService.ts

import { initializeApp } from 'firebase/app';
import { getDatabase, ref, onValue, set, update, remove, Unsubscribe, get, push } from 'firebase/database';
import { FirebaseData, Medicine, SyncCommand } from '../types';

const firebaseConfig = {
  apiKey: "**",
  authDomain: "**",
  databaseURL: "**",
  projectId: "**",
  storageBucket: "**",
  messagingSenderId: "**",
  appId: "**"
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

// Add alert to Firebase
addAlert: async (alert: Omit<Alert, "id">) => {
  const alertId = `alert_${Date.now()}`;
  const alertRef = ref(database, `alerts/${alertId}`);
  await set(alertRef, {
    id: alertId,
    ...alert,
  });
},

// Get all alerts
getAlerts: async (): Promise<Alert[]> => {
  const alertsRef = ref(database, "alerts");
  const snapshot = await get(alertsRef);
  
  if (!snapshot.exists()) return [];
  
  const alertsData = snapshot.val();
  return Object.values(alertsData).sort(
    (a: any, b: any) => b.timestamp - a.timestamp
  ) as Alert[];
},

// Listen to alerts changes
onAlertsChange: (callback: (alerts: Alert[]) => void): Unsubscribe => {
  const alertsRef = ref(database, "alerts");
  
  return onValue(alertsRef, (snapshot) => {
    if (!snapshot.exists()) {
      callback([]);
      return;
    }
    
    const alertsData = snapshot.val();
    const alerts = Object.values(alertsData).sort(
      (a: any, b: any) => b.timestamp - a.timestamp
    );
    callback(alerts as Alert[]);
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

  sendRestartCommand: async () => {
  const restartRef = ref(database, 'restart_command');
  await set(restartRef, {
    restart: true,
    timestamp: Date.now()
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
