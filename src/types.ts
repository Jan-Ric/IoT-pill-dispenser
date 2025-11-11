// src/types.ts

export interface Schedule {
  id: string;
  time: string;
  dispensed: boolean;
  taken: boolean;
  alert: boolean;
  takenAt?: string;
  takenDate?: string;
  alertTime?: string;
}

export interface Medicine {
  id: string; // "slot_0", "slot_1", "slot_2"
  name: string;
  dosage: string;
  servoIndex: number; // 0, 1, or 2
  schedules: Schedule[];
}

export interface MedicineSchedule {
  id: string;
  name: string;
  dosage: string;
  time: string;
  taken: boolean;
  takenAt?: string;
  takenDate?: string;
  dispensed?: boolean;
  alert?: boolean;
  alertTime?: string;
}



export interface UserProfile {
  name: string;
  email: string;
  schedules: MedicineSchedule[];
}

export interface FirebaseData {
  medicineId?: string;
  scheduleId?: string;
  medicine_taken?: boolean;
  status?: string;
  time?: string;
  date?: string;
  datetime?: string;
  timestamp?: number;
}

export interface SyncCommand {
  reload: boolean;
  timestamp: number;
}