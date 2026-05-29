import { onSchedule } from "firebase-functions/v2/scheduler";
import { onValueUpdated } from "firebase-functions/v2/database";
import { onRequest } from "firebase-functions/v2/https";
import * as admin from "firebase-admin";
import sgMail from "@sendgrid/mail";

admin.initializeApp();

// Get environment variables

const SENDGRID_KEY = process.env.SENDGRID_KEY || "";
const CAREGIVER_EMAIL = process.env.CAREGIVER_EMAIL || "";
const FROM_EMAIL = process.env.FROM_EMAIL || "";

// ... the rest of your helper functions stay exactly the same down below ...

// ✅ FIXED: Helper function to convert medicineId to slotId
function getSlotIdFromMedicineId(medicineId: string): string {
  // Handle two cases:
  // Case 1: Arduino sends "1", "2", "3" -> convert to slot_0, slot_1, slot_2
  // Case 2: Arduino sends "slot_0", "slot_1", "slot_2" -> use as is
  
  if (medicineId.startsWith("slot_")) {
    // Already in slot format, return as is
    console.log(`📦 MedicineId already in slot format: ${medicineId}`);
    return medicineId;
  }
  
  // Convert numeric medicineId to slot
  const slotNumber = parseInt(medicineId) - 1;
  const slotId = `slot_${slotNumber}`;
  console.log(`📦 Converted medicineId ${medicineId} to ${slotId}`);
  return slotId;
}

// ✅ FIXED: Helper function to get medicine data from Firebase
async function getMedicineData(medicineId: string): Promise<{
  name: string; 
  dosage: string; 
  schedules: any[];
  slotId: string;
} | null> {
  try {
    const db = admin.database();
    const slotId = getSlotIdFromMedicineId(medicineId);
    
    console.log(`🔍 Fetching medicine data for medicineId: "${medicineId}" -> slotId: "${slotId}"`);
    
    const medicineRef = db.ref(`/medicines/${slotId}`);
    const snapshot = await medicineRef.once("value");
    const medicine = snapshot.val();
    
    if (!medicine) {
      console.warn(`❌ No medicine found in database at path: /medicines/${slotId}`);
      
      // Debug: Let's see what's actually in the medicines node
      const allMedicinesRef = db.ref("/medicines");
      const allSnapshot = await allMedicinesRef.once("value");
      const allMedicines = allSnapshot.val();
      console.log("📋 Available medicines in database:", Object.keys(allMedicines || {}));
      
      return null;
    }
    
    console.log(`✅ Medicine found for medicineId ${medicineId}:`, {
      slotId,
      name: medicine.name,
      dosage: medicine.dosage,
      scheduleCount: medicine.schedules?.length || 0
    });
    
    return {
      name: medicine.name || `Medicine ${medicineId}`,
      dosage: medicine.dosage || "Unknown dosage",
      schedules: medicine.schedules || [],
      slotId
    };
  } catch (error) {
    console.error("❌ Error fetching medicine data:", error);
    return null;
  }
}

// ✅ Helper function to get all medicines from Firebase
async function getAllMedicines(): Promise<Array<{slotId: string; medicine: any}>> {
  try {
    const db = admin.database();
    const medicinesRef = db.ref("/medicines");
    const snapshot = await medicinesRef.once("value");
    const medicines = snapshot.val();
    
    if (!medicines) {
      return [];
    }
    
    const medicineList: Array<{slotId: string; medicine: any}> = [];
    Object.keys(medicines).forEach((slotId) => {
      if (medicines[slotId]) {
        medicineList.push({
          slotId,
          medicine: medicines[slotId]
        });
      }
    });
    
    return medicineList;
  } catch (error) {
    console.error("Error fetching all medicines:", error);
    return [];
  }
}

// ✅ FIXED: Helper function to find schedule time by ID
function findScheduleTime(schedules: any[], scheduleId: string): string {
  console.log(`🔍 Looking for scheduleId: "${scheduleId}" in schedules:`, schedules);
  
  const schedule = schedules.find((s: any) => {
    // Try exact match first
    if (s.id === scheduleId) return true;
    // Try string comparison (in case of type mismatch)
    if (String(s.id) === String(scheduleId)) return true;
    return false;
  });
  
  if (schedule) {
    console.log(`✅ Found schedule:`, schedule);
    return schedule.time;
  }
  
  console.warn(`⚠️ Schedule not found for ID: ${scheduleId}`);
  
  // Fallback: return first schedule time if available
  if (schedules.length > 0) {
    console.log(`⚠️ Using first schedule as fallback:`, schedules[0]);
    return schedules[0].time;
  }
  
  return "Unknown time";
}

// ✅ IMPROVED: Better date formatting with timezone awareness
function formatDate(dateString: string | undefined): string {
  if (!dateString || dateString === "0000-00-00" || dateString === "") {
    // Use Manila timezone for consistency
    const today = new Date();
    const manilaTime = new Date(today.toLocaleString("en-US", {timeZone: "Asia/Manila"}));
    const year = manilaTime.getFullYear();
    const month = String(manilaTime.getMonth() + 1).padStart(2, '0');
    const day = String(manilaTime.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  return dateString;
}

// ✅ Format date for display (e.g., "November 11, 2025")
function formatDateForDisplay(dateString: string): string {
  const date = new Date(dateString + 'T00:00:00');
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });
}

// ✅ NEW: Save to medicine history
async function saveMedicineHistory(data: {
  medicineId: string;
  scheduleId: string;
  medicine_taken: boolean;
  status: string;
  date: string;
  time: string;
  timestamp: number;
}) {
  try {
    const db = admin.database();
    const historyRef = db.ref("/medicine_history");
    const newHistoryRef = historyRef.push();
    
    await newHistoryRef.set({
      medicineId: data.medicineId,
      scheduleId: data.scheduleId,
      medicine_taken: data.medicine_taken,
      status: data.status,
      date: data.date,
      time: data.time,
      timestamp: data.timestamp || Date.now()
    });
    
    console.log(`✅ Medicine history saved: ${data.medicineId} - ${data.status}`);
  } catch (error) {
    console.error("❌ Error saving medicine history:", error);
  }
}

// Email Templates
function getMedicineTakenEmailHTML(
  medicineName: string,
  dosage: string,
  time: string,
  date: string
): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Medicine Taken Confirmation</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7f9;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f7f9; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow: hidden;">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">Medicine Taken Successfully</h1>
            </td>
          </tr>
          
          <!-- Success Icon -->
          <tr>
            <td style="padding: 30px; text-align: center;">
              <div style="width: 80px; height: 80px; background-color: #10b981; border-radius: 50%; margin: 0 auto; display: flex; align-items: center; justify-content: center;">
                <svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                  <polyline points="20 6 9 17 4 12"></polyline>
                </svg>
              </div>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 0 40px 30px 40px;">
              <h2 style="margin: 0 0 20px 0; color: #1f2937; font-size: 22px; font-weight: 600; text-align: center;">Confirmation Details</h2>
              
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border-radius: 6px; padding: 20px; margin-bottom: 20px;">
                <tr>
                  <td style="padding: 10px 0;">
                    <table width="100%">
                      <tr>
                        <td style="color: #6b7280; font-size: 14px; padding: 8px 0;">Medicine Name:</td>
                        <td style="color: #1f2937; font-size: 14px; font-weight: 600; text-align: right; padding: 8px 0;">${medicineName}</td>
                      </tr>
                      <tr>
                        <td style="color: #6b7280; font-size: 14px; padding: 8px 0;">Dosage:</td>
                        <td style="color: #1f2937; font-size: 14px; font-weight: 600; text-align: right; padding: 8px 0;">${dosage}</td>
                      </tr>
                      <tr>
                        <td style="color: #6b7280; font-size: 14px; padding: 8px 0;">Date:</td>
                        <td style="color: #1f2937; font-size: 14px; font-weight: 600; text-align: right; padding: 8px 0;">${date}</td>
                      </tr>
                      <tr>
                        <td style="color: #6b7280; font-size: 14px; padding: 8px 0;">Time Taken:</td>
                        <td style="color: #1f2937; font-size: 14px; font-weight: 600; text-align: right; padding: 8px 0;">${time}</td>
                      </tr>
                      <tr>
                        <td style="color: #6b7280; font-size: 14px; padding: 8px 0;">Status:</td>
                        <td style="color: #10b981; font-size: 14px; font-weight: 600; text-align: right; padding: 8px 0;">CONFIRMED</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <p style="margin: 20px 0; color: #4b5563; font-size: 14px; line-height: 1.6; text-align: center;">
                The patient has successfully taken their medication. This has been automatically confirmed by the MediTrack system.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 20px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #6b7280; font-size: 12px;">
                This is an automated notification from MediTrack System<br>
                Monitoring medication adherence for better health outcomes
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

function getMissedMedicineEmailHTML(
  medicineName: string,
  dosage: string,
  scheduledTime: string,
  date: string
): string {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Missed Medicine Alert</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7f9;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f7f9; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow: hidden;">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); padding: 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">Missed Medicine Alert</h1>
            </td>
          </tr>
          
          <!-- Alert Icon -->
          <tr>
            <td style="padding: 30px; text-align: center;">
              <div style="width: 80px; height: 80px; background-color: #ef4444; border-radius: 50%; margin: 0 auto; display: flex; align-items: center; justify-content: center;">
                <svg width="50" height="50" viewBox="0 0 24 24" fill="none" stroke="#ffffff" stroke-width="3" stroke-linecap="round" stroke-linejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
              </div>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 0 40px 30px 40px;">
              <h2 style="margin: 0 0 20px 0; color: #1f2937; font-size: 22px; font-weight: 600; text-align: center;">Action Required</h2>
              
              <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 15px; margin-bottom: 20px; border-radius: 4px;">
                <p style="margin: 0; color: #991b1b; font-size: 14px; font-weight: 600;">
                  ATTENTION: Patient has not taken their medication within the required timeframe.
                </p>
              </div>
              
              <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f9fafb; border-radius: 6px; padding: 20px; margin-bottom: 20px;">
                <tr>
                  <td style="padding: 10px 0;">
                    <table width="100%">
                      <tr>
                        <td style="color: #6b7280; font-size: 14px; padding: 8px 0;">Medicine Name:</td>
                        <td style="color: #1f2937; font-size: 14px; font-weight: 600; text-align: right; padding: 8px 0;">${medicineName}</td>
                      </tr>
                      <tr>
                        <td style="color: #6b7280; font-size: 14px; padding: 8px 0;">Dosage:</td>
                        <td style="color: #1f2937; font-size: 14px; font-weight: 600; text-align: right; padding: 8px 0;">${dosage}</td>
                      </tr>
                      <tr>
                        <td style="color: #6b7280; font-size: 14px; padding: 8px 0;">Date:</td>
                        <td style="color: #1f2937; font-size: 14px; font-weight: 600; text-align: right; padding: 8px 0;">${date}</td>
                      </tr>
                      <tr>
                        <td style="color: #6b7280; font-size: 14px; padding: 8px 0;">Scheduled Time:</td>
                        <td style="color: #1f2937; font-size: 14px; font-weight: 600; text-align: right; padding: 8px 0;">${scheduledTime}</td>
                      </tr>
                      <tr>
                        <td style="color: #6b7280; font-size: 14px; padding: 8px 0;">Status:</td>
                        <td style="color: #ef4444; font-size: 14px; font-weight: 600; text-align: right; padding: 8px 0;">NOT TAKEN</td>
                      </tr>
                    </table>
                  </td>
                </tr>
              </table>
              
              <div style="background-color: #fffbeb; border: 1px solid #fbbf24; padding: 15px; border-radius: 4px; margin-bottom: 20px;">
                <p style="margin: 0 0 10px 0; color: #92400e; font-size: 14px; font-weight: 600;">Recommended Actions:</p>
                <ul style="margin: 0; padding-left: 20px; color: #92400e; font-size: 13px; line-height: 1.6;">
                  <li>Check on the patient immediately</li>
                  <li>Verify if medication was taken manually</li>
                  <li>Assist patient with medication if needed</li>
                  <li>Document any issues or concerns</li>
                </ul>
              </div>
              
              <p style="margin: 20px 0 0 0; color: #6b7280; font-size: 12px; text-align: center;">
                The MediTrack system dispensed the medication but did not detect it being taken within the 1-minute monitoring window.
              </p>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 20px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #6b7280; font-size: 12px;">
                This is an automated alert from MediTrack System<br>
                Please respond to this notification as soon as possible
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

function getDailySummaryEmailHTML(
  summaryData: Array<{name: string; dosage: string; time: string; status: string; date: string}>,
  date: string
): string {
  const rows = summaryData.map((item) => {
    const statusColor =
      item.status === "TAKEN" ? "#10b981" :
      item.status === "NOT TAKEN" ? "#ef4444" :
      "#f59e0b";
    
    return `
      <tr style="border-bottom: 1px solid #e5e7eb;">
        <td style="padding: 12px 0; color: #1f2937; font-size: 14px;">
          ${item.name}<br>
          <span style="color: #6b7280; font-size: 12px;">${item.dosage}</span>
        </td>
        <td style="padding: 12px 0; color: #6b7280; font-size: 14px; text-align: center;">${item.time}</td>
        <td style="padding: 12px 0; text-align: right;">
          <span style="background-color: ${statusColor}20; color: ${statusColor}; padding: 4px 12px; border-radius: 12px; font-size: 12px; font-weight: 600;">
            ${item.status}
          </span>
        </td>
      </tr>
    `;
  }).join("");

  const takenCount = summaryData.filter((item) => item.status === "TAKEN").length;
  const missedCount = summaryData.filter((item) => item.status === "NOT TAKEN").length;
  const totalCount = summaryData.length || 1;
  const adherenceRate = Math.round((takenCount / totalCount) * 100);

  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Daily Medication Summary</title>
</head>
<body style="margin: 0; padding: 0; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background-color: #f4f7f9;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f7f9; padding: 40px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color: #ffffff; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.1); overflow: hidden;">
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); padding: 30px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 28px; font-weight: 600;">Daily Medication Summary</h1>
              <p style="margin: 10px 0 0 0; color: #dbeafe; font-size: 16px;">${date}</p>
            </td>
          </tr>
          
          <!-- Statistics -->
          <tr>
            <td style="padding: 30px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="33%" style="text-align: center; padding: 15px; background-color: #ecfdf5; border-radius: 8px;">
                    <div style="font-size: 32px; font-weight: 700; color: #10b981; margin-bottom: 5px;">${takenCount}</div>
                    <div style="font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Taken</div>
                  </td>
                  <td width="33%" style="text-align: center; padding: 15px; background-color: #fef2f2; border-radius: 8px;">
                    <div style="font-size: 32px; font-weight: 700; color: #ef4444; margin-bottom: 5px;">${missedCount}</div>
                    <div style="font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Missed</div>
                  </td>
                  <td width="33%" style="text-align: center; padding: 15px; background-color: #eff6ff; border-radius: 8px;">
                    <div style="font-size: 32px; font-weight: 700; color: #3b82f6; margin-bottom: 5px;">${adherenceRate}%</div>
                    <div style="font-size: 12px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px;">Adherence</div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          
          <!-- Medication Details -->
          <tr>
            <td style="padding: 0 40px 30px 40px;">
              <h2 style="margin: 0 0 15px 0; color: #1f2937; font-size: 18px; font-weight: 600;">Medication Details</h2>
              
              <table width="100%" cellpadding="0" cellspacing="0" style="border-top: 2px solid #e5e7eb;">
                <tr style="background-color: #f9fafb;">
                  <th style="padding: 12px 0; text-align: left; color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Medicine</th>
                  <th style="padding: 12px 0; text-align: center; color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Time</th>
                  <th style="padding: 12px 0; text-align: right; color: #6b7280; font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Status</th>
                </tr>
                ${rows}
              </table>
            </td>
          </tr>
          
          <!-- Notes Section -->
          <tr>
            <td style="padding: 0 40px 30px 40px;">
              <div style="background-color: #f0f9ff; border-left: 4px solid #3b82f6; padding: 15px; border-radius: 4px;">
                <p style="margin: 0; color: #1e40af; font-size: 13px; line-height: 1.6;">
                  <strong>Note:</strong> This summary includes all scheduled medications for today. 
                  ${missedCount > 0 ? "Please follow up on missed medications with the patient." : "All medications were taken as scheduled."}
                </p>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 20px 40px; text-align: center; border-top: 1px solid #e5e7eb;">
              <p style="margin: 0; color: #6b7280; font-size: 12px;">
                Daily Summary Report from MediTrack System<br>
                Generated automatically at end of day
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;
}

const { defineSecret } = require("firebase-functions/params");
const SENDGRID_KEY_SECRET = defineSecret("SENDGRID_KEY");
const CAREGIVER_EMAIL_SECRET = defineSecret("CAREGIVER_EMAIL");
const FROM_EMAIL_SECRET = defineSecret("FROM_EMAIL");

export const onMedicineUpdate = onValueUpdated(
  {
    ref: "/medicine_updates",
    region: "asia-southeast1",
    secrets: [SENDGRID_KEY_SECRET, CAREGIVER_EMAIL_SECRET, FROM_EMAIL_SECRET]
  },
  async (event) => {
    const SENDGRID_KEY = SENDGRID_KEY_SECRET.value();
    const newData = event.data.after.val();
    const oldData = event.data.before.val();

    console.log("📥 Medicine update triggered");
    console.log("New data:", JSON.stringify(newData, null, 2));
    console.log("Old data:", JSON.stringify(oldData, null, 2));

    // Prevent duplicate emails
    if (JSON.stringify(newData) === JSON.stringify(oldData)) {
      console.log("⏭️ No changes detected, skipping email");
      return null;
    }

    // Check if environment variables are set
    if (!SENDGRID_KEY || !CAREGIVER_EMAIL) {
      console.error("❌ Missing environment variables:", {
        hasSendGridKey: !!SENDGRID_KEY,
        hasCaregiverEmail: !!CAREGIVER_EMAIL,
        fromEmail: FROM_EMAIL,
      });
      return null;
    }

    // Initialize SendGrid with the API key
    sgMail.setApiKey(SENDGRID_KEY);

    const medicineId = newData.medicineId;
    const scheduleId = newData.scheduleId;
    const status = newData.status;
    const taken = newData.medicine_taken;
    const time = newData.time;
    const rawDate = newData.date;
    const formattedDate = formatDate(rawDate);
    const timestamp = newData.timestamp || Date.now();

    console.log("📋 Processing update:", {
      medicineId,
      scheduleId,
      status,
      taken,
      time,
      rawDate,
      formattedDate
    });

    // ✅ FETCH REAL MEDICINE DATA FROM FIREBASE
    const medicineData = await getMedicineData(medicineId);
    
    if (!medicineData) {
      console.error(`❌ Medicine data not found for ID: ${medicineId}`);
      return null;
    }

    const medicineName = medicineData.name;
    const medicineDosage = medicineData.dosage;
    const scheduledTime = findScheduleTime(medicineData.schedules, scheduleId);

    console.log("✅ Medicine data retrieved:", {
      medicineId,
      slotId: medicineData.slotId,
      medicineName,
      medicineDosage,
      scheduleId,
      scheduledTime,
      status,
      taken,
    });

    // ✅ SAVE TO HISTORY BEFORE SENDING EMAIL
    await saveMedicineHistory({
      medicineId,
      scheduleId,
      medicine_taken: taken,
      status,
      date: formattedDate,
      time: time || scheduledTime,
      timestamp
    });

    try {
      // Send email for "dispensed" status (medicine taken)
      if (status === "dispensed" && taken === true) {
        const displayDate = formatDateForDisplay(formattedDate);
        const msg = {
          to: CAREGIVER_EMAIL,
          from: FROM_EMAIL,
          subject: `✅ Medicine Taken: ${medicineName}`,
          html: getMedicineTakenEmailHTML(medicineName, medicineDosage, scheduledTime, displayDate),
        };

        await sgMail.send(msg);
        console.log(`✅ Medicine taken email sent for ${medicineName} (${medicineDosage}) at ${scheduledTime} on ${displayDate}`);
      }

      // Send email for "alert" status (not taken)
      if (status === "alert" && taken === false) {
        const displayDate = formatDateForDisplay(formattedDate);
        const msg = {
          to: CAREGIVER_EMAIL,
          from: FROM_EMAIL,
          subject: `⚠️ ALERT: Missed Medicine - ${medicineName}`,
          html: getMissedMedicineEmailHTML(medicineName, medicineDosage, scheduledTime, displayDate),
        };

        await sgMail.send(msg);
        console.log(`✅ Missed medicine alert email sent for ${medicineName} (${medicineDosage}) at ${scheduledTime} on ${displayDate}`);
      }

      return null;
    } catch (error) {
      console.error("❌ Error sending email:", error);
      if (error instanceof Error) {
        console.error("Error message:", error.message);
      }
      if (error && typeof error === 'object' && 'response' in error) {
        const sgError = error as any;
        console.error("SendGrid error details:", {
          statusCode: sgError.code,
          body: sgError.response?.body,
        });
      }
      return null;
    }
  }
);

// ✅ Cloud Function - Daily summary at 9 PM (21:00) Philippine Time
export const sendDailySummary = onSchedule(
  {
    schedule: "0 21 * * *",
    timeZone: "Asia/Manila",
    region: "asia-southeast1",
  },
  async () => {
    try {
      console.log("📊 Starting daily summary generation...");
      
      // Check if environment variables are set
      if (!SENDGRID_KEY || !CAREGIVER_EMAIL) {
        console.error("❌ Missing environment variables for daily summary");
        return;
      }

      // Initialize SendGrid with the API key
      sgMail.setApiKey(SENDGRID_KEY);

      // Get today's date in Manila timezone
      const today = new Date();
      const manilaTime = new Date(today.toLocaleString("en-US", {timeZone: "Asia/Manila"}));
      const dateString = manilaTime.toISOString().split("T")[0];
      const displayDate = formatDateForDisplay(dateString);

      console.log(`📅 Generating summary for: ${dateString} (${displayDate})`);

      // ✅ GET ALL MEDICINES FROM FIREBASE
      const allMedicines = await getAllMedicines();
      
      if (allMedicines.length === 0) {
        console.log("⚠️ No medicines configured, skipping daily summary");
        return;
      }

      console.log(`💊 Found ${allMedicines.length} configured medicines`);

      // Fetch medicine history for today
      const db = admin.database();
      const historyRef = db.ref("/medicine_history");
      const snapshot = await historyRef
        .orderByChild("date")
        .equalTo(dateString)
        .once("value");

      const historyData = snapshot.val();
      console.log("📜 History data for today:", historyData ? Object.keys(historyData).length + " records" : "No records");

      // ✅ BUILD SUMMARY DATA FROM ACTUAL MEDICINES AND THEIR SCHEDULES
      const summaryData: Array<{name: string; dosage: string; time: string; status: string; date: string}> = [];
      
      allMedicines.forEach(({slotId, medicine}) => {
        // Convert slot_0 -> 1, slot_1 -> 2, slot_2 -> 3
        const slotNumber = parseInt(slotId.split("_")[1]) + 1;
        
        console.log(`Processing ${medicine.name} (${slotId} -> medicineId: ${slotNumber})`);
        
        medicine.schedules.forEach((schedule: any) => {
          const summaryItem = {
            name: medicine.name,
            dosage: medicine.dosage,
            time: schedule.time,
            status: "PENDING",
            date: dateString,
          };
          
          // Check if this schedule was taken today from history
          if (historyData) {
            Object.values(historyData).forEach((record: any) => {
              // Match by medicineId and scheduleId
              if (record.medicineId === slotNumber.toString() && 
                  record.scheduleId === schedule.id) {
                summaryItem.status = record.medicine_taken === true ? "TAKEN" : "NOT TAKEN";
                if (record.date) {
                  summaryItem.date = formatDate(record.date);
                }
                console.log(`✓ Found history: ${medicine.name} at ${schedule.time} - ${summaryItem.status}`);
              }
            });
          }
          
          summaryData.push(summaryItem);
        });
      });

      if (summaryData.length === 0) {
        console.log("⚠️ No schedules found for today, skipping daily summary");
        return;
      }

      console.log(`📋 Summary prepared with ${summaryData.length} scheduled doses`);
      console.log("Summary data:", JSON.stringify(summaryData, null, 2));

      // Send daily summary email
      const msg = {
        to: CAREGIVER_EMAIL,
        from: FROM_EMAIL,
        subject: `📊 Daily Medication Summary - ${displayDate}`,
        html: getDailySummaryEmailHTML(summaryData, displayDate),
      };

      await sgMail.send(msg);
      console.log("✅ Daily summary email sent successfully");
    } catch (error) {
      console.error("❌ Error sending daily summary:", error);
      if (error instanceof Error) {
        console.error("Error details:", error.message);
      }
      if (error && typeof error === 'object' && 'response' in error) {
        const sgError = error as any;
        console.error("SendGrid error details:", {
          statusCode: sgError.code,
          body: sgError.response?.body,
        });
      }
    }
  }
);

// ✅ NEW: Secure HTTP Endpoint to trigger the Arduino dispenser
export const triggerDispense = onRequest(
  async (req, res) => {
    // 1. Only allow POST requests
    if (req.method !== "POST") {
      res.status(405).json({ error: "Method not allowed" });
      return;
    }

    try {
      const { medicineId, scheduleId, servoIndex, scheduledTime } = req.body;

      // 2. Validate the payload
      if (!medicineId || !scheduleId || servoIndex === undefined) {
        res.status(400).json({ error: "Missing required fields" });
        return;
      }

      const timestamp = Math.floor(Date.now() / 1000);
      const db = admin.database();
      
      // 3. Securely write the command to the Realtime Database for the Arduino
      await db.ref("dispense_command").set({
        medicineId,
        scheduleId,
        servoIndex: String(servoIndex),
        scheduledTime,
        timestamp,
      });

      console.log(`✅ Dispense command securely issued for ${medicineId}`);
      res.status(200).json({ message: "Dispense command issued successfully" });
    } catch (error) {
      console.error("❌ Error issuing dispense command:", error);
      res.status(500).json({ error: "Internal server error" });
    }
  }
);