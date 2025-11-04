import {onSchedule} from "firebase-functions/v2/scheduler";
import {onValueUpdated} from "firebase-functions/v2/database";
import * as admin from "firebase-admin";
import sgMail from "@sendgrid/mail";
import {defineString} from "firebase-functions/params";

admin.initializeApp();

// Define environment parameters
const sendgridKey = defineString("SENDGRID_KEY");
const caregiverEmail = defineString("CAREGIVER_EMAIL");
const fromEmail = defineString("FROM_EMAIL");

// Medicine names mapping
const medicineNames: { [key: string]: string } = {
  "1": "Aspirin",
  "2": "Vitamin C",
  "3": "Blood Pressure Medication",
};

// Email Templates
function getMedicineTakenEmailHTML(
  medicineName: string,
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
  summaryData: Array<{name: string; time: string; status: string}>,
  date: string
): string {
  const rows = summaryData.map((item) => {
    const statusColor =
      item.status === "TAKEN" ? "#10b981" :
      item.status === "NOT TAKEN" ? "#ef4444" :
      "#f59e0b";
    
    return `
      <tr style="border-bottom: 1px solid #e5e7eb;">
        <td style="padding: 12px 0; color: #1f2937; font-size: 14px;">${item.name}</td>
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
  const adherenceRate = Math.round((takenCount / summaryData.length) * 100);

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

// Cloud Function: Trigger on medicine_updates change
export const onMedicineUpdate = onValueUpdated(
  {
    ref: "/medicine_updates",
    region: "asia-southeast1",
  },
  async (event) => {
    const newData = event.data.after.val();
    const oldData = event.data.before.val();

    // Prevent duplicate emails
    if (JSON.stringify(newData) === JSON.stringify(oldData)) {
      return null;
    }

    // Initialize SendGrid with the API key
    sgMail.setApiKey(sendgridKey.value());

    const medicineId = newData.medicineId;
    const medicineName = medicineNames[medicineId] || `Medicine ${medicineId}`;
    const status = newData.status;
    const taken = newData.medicine_taken;
    const time = newData.time;
    const date = newData.date;

    console.log("Medicine update detected:", {
      medicineId,
      medicineName,
      status,
      taken,
      time,
      date,
    });

    try {
      // Send email for "taken" status
      if (status === "taken" && taken === true) {
        const msg = {
          to: caregiverEmail.value(),
          from: fromEmail.value(),
          subject: `Medicine Taken: ${medicineName}`,
          html: getMedicineTakenEmailHTML(medicineName, time, date),
        };

        await sgMail.send(msg);
        console.log(`Medicine taken email sent for ${medicineName}`);
      }

      // Send email for "alert" status (not taken)
      if (status === "alert" && taken === false) {
        const msg = {
          to: caregiverEmail.value(),
          from: fromEmail.value(),
          subject: `ALERT: Missed Medicine - ${medicineName}`,
          html: getMissedMedicineEmailHTML(medicineName, time, date),
        };

        await sgMail.send(msg);
        console.log(`Missed medicine alert email sent for ${medicineName}`);
      }

      return null;
    } catch (error) {
      console.error("Error sending email:", error);
      return null;
    }
  }
);

// Cloud Function: Daily summary at 9 PM (21:00) Philippine Time
export const sendDailySummary = onSchedule(
  {
    schedule: "0 21 * * *",
    timeZone: "Asia/Manila",
    region: "asia-southeast1",
  },
  async () => {
    try {
      // Initialize SendGrid with the API key
      sgMail.setApiKey(sendgridKey.value());

      // Get today's date
      const today = new Date();
      const dateString = today.toISOString().split("T")[0];

      // Fetch medicine history for today
      const db = admin.database();
      const historyRef = db.ref("/medicine_history");
      const snapshot = await historyRef
        .orderByChild("date")
        .equalTo(dateString)
        .once("value");

      const historyData = snapshot.val();

      // Prepare summary data
      const summaryData = [
        {
          name: "Aspirin",
          time: "08:00",
          status: "PENDING",
        },
        {
          name: "Vitamin C",
          time: "12:00",
          status: "PENDING",
        },
        {
          name: "Blood Pressure Medication",
          time: "20:00",
          status: "PENDING",
        },
      ];

      // Update status based on history
      if (historyData) {
        Object.values(historyData).forEach((record: any) => {
          const medIndex = parseInt(record.medicineId) - 1;
          if (medIndex >= 0 && medIndex < 3) {
            summaryData[medIndex].status =
              record.medicine_taken === true ? "TAKEN" : "NOT TAKEN";
          }
        });
      }

      // Send daily summary email
      const msg = {
        to: caregiverEmail.value(),
        from: fromEmail.value(),
        subject: `Daily Medication Summary - ${dateString}`,
        html: getDailySummaryEmailHTML(summaryData, dateString),
      };

      await sgMail.send(msg);
      console.log("Daily summary email sent successfully");
    } catch (error) {
      console.error("Error sending daily summary:", error);
    }
  }
);