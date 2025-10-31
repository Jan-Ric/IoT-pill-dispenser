// src/types.ts

export interface MedicineSchedule {
  id: string;
  name: string;
  dosage: string;
  time: string;
  taken: boolean;
  takenAt?: string;
  takenDate?: string;
  dispensed?: boolean;
  alert?: boolean;  // Alert flag for untaken medicine after 2 minutes
  alertTime?: string;  // Time when alert was triggered
}

export interface HistoryRecord {
  id: string;
  name: string;
  dosage: string;
  scheduledTime: string;
  takenTime: string;
  date: string;
  status: 'taken' | 'missed';
}

export interface UserProfile {
  name: string;
  email: string;
  schedules: MedicineSchedule[];
}

export interface FirebaseData {
  medicineId?: string;
  medicine_taken?: boolean;
  status?: string;  // 'dispensed', 'taken', or 'alert'
  time?: string;
  date?: string;
  datetime?: string;
  timestamp?: number;
}