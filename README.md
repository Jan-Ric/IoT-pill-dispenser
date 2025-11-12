## MediTrack - Automated Medicine Pill Dispenser System
### OVERVIEW
### MediTrack is an IoT-based medication management system that combines Arduino hardware with Firebase cloud integration to ensure timely medicine intake and improve patient adherence. The system automatically dispenses medications at scheduled times, monitors intake using ultrasonic sensors, and provides real-time alerts to caregivers.
## SYSTEM OBJECTIVE
### Primary Goals:

Automate medication dispensing at scheduled times
Monitor medicine intake in real-time using sensors
Provide immediate audio and digital alerts for missed medications
Send automated email notifications to caregivers
Track adherence rates with comprehensive analytics
Enable remote monitoring via web dashboard

### Significance:
This system addresses medication non-adherence, a critical healthcare challenge affecting millions of patients worldwide. By combining automated dispensing, real-time monitoring, and caregiver notifications, MediTrack reduces the risk of missed medications and improves treatment outcomes.
TECHNOLOGIES AND SERVICES
#Frontend Framework:

React 18 with TypeScript
Tailwind CSS for styling
Vite for build tooling

### Backend Services:

Firebase Realtime Database (cloud data storage)
Firebase Cloud Functions (serverless backend)
SendGrid API (email notifications)

### Hardware Communication:

Firebase Realtime Database (IoT device integration)
NTP Time Synchronization
WiFi Communication (802.11)

### Data Processing:

SheetJS (XLSX) for Excel export
Papaparse for CSV handling
Lodash for data manipulation

## DEVELOPMENT ENVIRONMENT
### IDEs and Tools:

Visual Studio Code (frontend development)
Arduino IDE (hardware programming)
Firebase Console (database management)
Node.js runtime environment

### Version Control:

Git for source control
GitHub for repository hosting

### Package Management:

npm (Node Package Manager)
Arduino Library Manager

## HARDWARE COMPONENTS
### Microcontroller:

Arduino UNO R4 WiFi (main controller with built-in WiFi)

### Actuators:

6x SG90 Servo Motors (2 per medicine slot)
PCA9685 16-Channel PWM Servo Driver

### Sensors:

HC-SR04 Ultrasonic Sensor (distance measurement for intake detection)

### Output Devices:

16x2 I2C LCD Display (status information)
Active Buzzer Module (audio alerts)

### Input Devices:

Push Buttons (manual dispensing override)

##SOFTWARE ARCHITECTURE
#Web Dashboard (React + TypeScript):

Dashboard page for real-time monitoring
History page with Excel export capability
Account page for medicine schedule management
About page with system information

### Firebase Cloud Functions (Node.js):

Real-time medicine status updates handler
Automated email notification service
Daily summary report generator (9 PM schedule)

### Arduino Firmware (C++):

Schedule management and time synchronization
Servo motor control for dispensing
Ultrasonic sensor monitoring for intake detection
Firebase communication over WiFi
LCD display updates and buzzer alerts

### SYSTEM WORKFLOW
1. Schedule Configuration
Users configure medicine schedules through the web dashboard, specifying medicine names, dosages, and daily times for each of the three available slots.
2. Automated Dispensing
At the scheduled time, the Arduino triggers the appropriate servo motors to dispense medicine from the selected slot. The system updates Firebase with dispensing status.
3. Intake Monitoring
The HC-SR04 ultrasonic sensor continuously monitors the dispensing area for 60 seconds. If the distance increases beyond 8cm, the system detects that medicine has been removed.
4. Status Updates

Medicine Taken: System records success, updates Firebase, and sends confirmation email
Medicine Not Taken: System activates buzzer, triggers alert status, and sends warning email

5. Real-time Dashboard Updates
The web dashboard displays live status updates, showing which medicines have been dispensed, taken, or missed. Color-coded indicators provide instant visual feedback.
6. History and Analytics
All activities are logged to Firebase and displayed in the history page with:

Adherence rate calculations
Medicine-specific breakdowns
Date-filtered views
Excel export functionality

7. Email Notifications
Automated emails are sent to caregivers for:

Successful medicine intake (confirmation)
Missed medications (alerts)
Daily summary reports (9 PM)

## FIREBASE DATABASE STRUCTURE
/medicines
  /slot_0, /slot_1, /slot_2
    - name: string
    - dosage: string
    - servoIndex: number
    - schedules: array
      - id: string
      - time: string
      - dispensed: boolean
      - taken: boolean
      - alert: boolean

/medicine_updates
  - medicineId: string
  - scheduleId: string
  - medicine_taken: boolean
  - status: string
  - time: string
  - date: string
  - timestamp: number

/medicine_history
  - name: string
  - dosage: string
  - scheduledTime: string
  - takenTime: string
  - date: string
  - status: string
  - timestamp: number

/alerts
  - type: string
  - message: string
  - time: string
  - timestamp: number

/user_profile
  - fullName: string
  - email: string
  - phone: string
  - location: string

/dispense_command
  - servoIndex: string
  - medicineId: string
  - scheduleId: string
  - timestamp: number

/sync_command
  - reload: boolean
  - timestamp: number

/restart_command
  - restart: boolean
  - timestamp: number
## SETUP AND INSTALLATION
### Hardware Setup:

Connect servo motors to PCA9685 board (channels 0-5)
Wire HC-SR04 sensor (Trig/Echo pins)
Connect LCD display via I2C
Wire buzzer module to digital pin
Connect push buttons for manual control
Power Arduino via USB or external supply

### Software Setup:

Clone repository
Install Node.js dependencies: npm install
Configure Firebase credentials in firebaseService.ts
Set SendGrid API key in Firebase Functions environment
Upload Arduino sketch to UNO R4 WiFi
Start development server: npm run dev

### Firebase Functions Deployment:

Install Firebase CLI: npm install -g firebase-tools
Login to Firebase: firebase login
Initialize project: firebase init functions
Set environment variables:

firebase functions:config:set sendgrid.key="YOUR_KEY"
firebase functions:config:set caregiver.email="EMAIL"


Deploy functions: firebase deploy --only functions

## KEY FEATURES
### Hardware Capabilities:

Three independent medicine slots
Automated dispensing with dual-servo mechanism
Non-contact intake detection
Audio alert system
Manual override buttons
LCD status display

### Software Capabilities:

Real-time synchronization across devices
Persistent data storage in cloud
Automated email notifications with HTML templates
Excel export for medical records
Responsive web interface (desktop and mobile)
Historical data with filtering and analytics

### Safety Features:

Duplicate prevention for email notifications
Connection loss detection and alerts
Timestamp validation to prevent stale updates
Error handling and logging
Manual intervention options

## LIMITATIONS AND CONSTRAINTS

Maximum 3 medicines (hardware limitation)
1-minute monitoring window after dispensing
WiFi connection required for cloud features
Browser storage not used (Firebase-only persistence)
Email notifications require SendGrid account
Arduino must maintain NTP time synchronization

#### Copyright 2025 MediTrack Development Team. All rights reserved.
