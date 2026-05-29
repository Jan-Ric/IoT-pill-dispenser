MediTrack - Automated Medicine Pill Dispenser System

OVERVIEW

MediTrack is a production-grade IoT medication management system that combines Arduino hardware with a secure Firebase serverless backend to ensure timely medicine intake and improve patient adherence. The system automatically dispenses medications at scheduled times, monitors intake using ultrasonic sensors, and provides real-time alerts and AI-driven insights to caregivers.

SYSTEM OBJECTIVE
Primary Goals:
Automate medication dispensing at scheduled times.

Monitor medicine intake in real-time using non-contact sensors.

Provide immediate audio and digital alerts for missed medications.

Send automated email notifications to caregivers with AI-powered health recommendations.

Track adherence rates with comprehensive analytics.

Enable secure remote monitoring via a cloud-hosted web dashboard.

Significance:
This system addresses medication non-adherence, a critical healthcare challenge affecting millions of patients worldwide. By combining automated dispensing, real-time monitoring, and intelligent caregiver notifications, MediTrack reduces the risk of missed medications and improves treatment outcomes.

TECHNOLOGIES AND SERVICES
Frontend Framework (/client):
React 18 with TypeScript

Tailwind CSS for styling

Vite for build tooling

Hosted securely on Vercel

Backend Services (/functions):
Firebase Realtime Database (Cloud data persistence)

Firebase Cloud Functions V2 (Serverless Node.js backend)

Google Cloud Secret Manager (Secure API key vault)

SendGrid API (Email routing)

Upcoming: Chatbot AI API (Intelligent caregiver recommendations)

Hardware Communication (/hardware):
Arduino C++ Firmware

Firebase Realtime Database REST API integration

NTP Time Synchronization (Asia/Manila)

WiFi Communication (802.11)

SOFTWARE ARCHITECTURE (MONOREPO)

The project follows a modern, decoupled monorepo architecture, ensuring strict security boundaries between the user interface and hardware commands.

/client (Web Dashboard): A stateless React application that reads live data from Firebase. It does not communicate directly with the hardware; instead, it securely triggers serverless functions via HTTP requests.

/functions (Cloud Backend): Acts as the secure middleman. Validates frontend requests, writes hardware commands to the database, processes real-time medicine status updates, and handles email generation.

/hardware (Arduino Firmware): The physical execution layer. It constantly polls the database for secure dispense_command payloads, manages a localized task queue to prevent power surges, controls servos, and utilizes ultrasonic sensors to verify intake.

SYSTEM WORKFLOW
Schedule Configuration: Users configure medicine schedules through the web dashboard, specifying medicine names, dosages, and daily times for each of the three available slots.

Secure Command Routing: When a manual dispense is triggered, the frontend securely calls the triggerDispense Cloud Function, which validates the request and writes a secure payload to the database.

Automated Dispensing & Hardware Queuing: The Arduino pulls scheduled or manual dispense tasks into a local queue. It triggers the appropriate servo motors to dispense medicine sequentially, ensuring hardware stability.

Intake Monitoring: The HC-SR04 ultrasonic sensor continuously monitors the dispensing area for 60 seconds. If the distance increases beyond the threshold, the system verifies the medicine has been removed.

Status Updates & AI Email Notifications:

Medicine Taken: System records success, updates Firebase, and sends a confirmation email.

Medicine Not Taken: System activates buzzer, flags an alert, and sends a warning email.

AI Caregiver Insights (In Development): Emails will soon be enriched via an AI Chatbot API. Based on the specific medicine, dosage (grams), and schedule, the AI will generate contextual, personalized care recommendations for the caregiver to ensure optimal patient health.

Real-time Dashboard Updates: The web dashboard displays live status updates, showing which medicines have been dispensed, taken, or missed via color-coded indicators.

SETUP AND INSTALLATION

1. Hardware Setup
Connect 6x SG90 servo motors to PCA9685 board (channels 0-5).

Wire HC-SR04 sensor (Trig: Pin 7, Echo: Pin 8).

Connect 16x2 LCD display via I2C.

Wire active buzzer module to digital pin 9.

Power Arduino UNO R4 WiFi via USB or 5V/2A external supply.

Update WiFi credentials in the .ino file and upload to the board.

2. Backend Setup (/functions)
Bash
cd functions
npm install
Install Firebase CLI and authenticate:

Bash
npm install -g firebase-tools
firebase login
firebase init functions
Set up Google Cloud Secret Manager for secure environment variables:

Bash
firebase functions:secrets:set SENDGRID_KEY
firebase functions:secrets:set CAREGIVER_EMAIL
firebase functions:secrets:set FROM_EMAIL
Deploy the backend:

Bash
firebase deploy --only functions
3. Frontend Setup (/client)
Bash
cd client
npm install
Create a .env file in the client/ directory and add your deployed Firebase Function URL:

Code snippet
VITE_API_BASE_URL=https://your-region-project-id.cloudfunctions.net
Start the development server:

Bash
npm run dev

KEY FEATURES

Hardware Task Queueing: Intelligent C++ queue system prevents simultaneous servo movements and power supply crashes.

Non-Contact Intake Detection: Ultrasonic verification prevents false positives.

Transactional Safeguards: Prevents duplicate dispensing and duplicate email alerts.

AI-Enhanced Reporting: Automated HTML email reports with upcoming AI-driven caregiver context.

Excel Export Data: Full history export via SheetJS for medical record keeping.

HARDWARE CONSTRAINTS

Hardware Capacity: The physical dispenser design is limited to a maximum of 3 distinct medicines (controlled via 6 dedicated servo channels).

Monitoring Timeout: The ultrasonic sensor utilizes a strict 1-minute monitoring window. If the medicine is not removed within this timeframe, the system flags it as a missed dose.

Network Dependency: The Arduino hardware requires a constant 2.4GHz WiFi connection to sync with Firebase.

Time Synchronization: The hardware heavily relies on continuous NTP (Network Time Protocol) server synchronization to match physical dispensing with cloud schedules.

ARCHITECTURAL DECISIONS

Stateless Frontend (Cloud-First): The React client intentionally bypasses local browser storage (Local/Session Storage). Firebase Realtime Database acts as the absolute single source of truth. This ensures real-time cross-device synchronization and prevents sensitive medication schedules from being exposed in a user's local browser cache.

Secret Manager over .env files: Backend API keys are stored in Google Cloud's encrypted Secret Manager rather than plain-text environment variables, significantly elevating the security of the application.

Serverless Backend: All business logic, email routing, and hardware command validation are securely handled via Firebase Cloud Functions V2, isolating the frontend UI from the IoT command layer.

Copyright © 2026 MediTrack Development Team. All rights reserved.
