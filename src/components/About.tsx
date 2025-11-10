import {
  Users,
  Target,
  Workflow,
  Cpu,
  Wifi,
  Database,
  Globe,
  Pill,
  Bell,
  Clock,
  CheckCircle,
  ArrowRight,
  Mail,
} from "lucide-react";

function About() {
  const teamMembers = [
    {
      name: "Kent Jules C. Niones",
      role: "Project Leader & Front-End Developer",
      description:
        "Leads the development team and coordinates software design tasks. Responsible for the web dashboard interface, system integration, and overall project planning.",
    },
    {
      name: "Jay Francis M. De Leon",
      role: "Research & Documentation Officer",
      description:
        "Handles research documentation, data gathering, and technical reports. Ensures complete project records, academic compliance, and system documentation.",
    },
    {
      name: "Gerald Ivan T. Salazar",
      role: "Hardware Developer & System Integrator",
      description:
        "Designs and implements hardware components including Arduino programming, basic circuit setup, and integration of mechanical parts for the dispensing unit.",
    },
    {
      name: "Sean Andrei H. Vidanes",
      role: "Hardware Tester & Troubleshooting Specialist",
      description:
        "Assists in testing and optimizing the hardware system. Provides solutions for technical issues, ensuring proper functionality and reliability of hardware components.",
    },
  ];

  const systemFlow = [
    {
      step: 1,
      title: "Schedule Configuration",
      description:
        "Set up medicine schedules with specific times for each medication through the dashboard.",
      icon: <Clock className="w-8 h-8 text-teal-600" />,
    },
    {
      step: 2,
      title: "Automated Dispensing",
      description:
        "At scheduled time, Arduino triggers servo motors to dispense the correct medicine.",
      icon: <Pill className="w-8 h-8 text-purple-600" />,
    },
    {
      step: 3,
      title: "Ultrasonic Monitoring",
      description:
        "HC-SR04 sensor monitors if medicine is taken within 1 minute. Distance >8cm indicates medicine removed.",
      icon: <Wifi className="w-8 h-8 text-blue-600" />,
    },
    {
      step: 4,
      title: "Alert System",
      description:
        "If medicine not taken after 1 minute, buzzer activates and alert is sent to dashboard via Firebase.",
      icon: <Bell className="w-8 h-8 text-rose-600" />,
    },
    {
      step: 5,
      title: "Email Notification",
      description:
        "When medicine is not taken within the 1-minute monitoring period, an automated email notification is sent to caregivers with details about the missed medication.",
      icon: <Mail className="w-8 h-8 text-orange-600" />,
    },
    {
      step: 6,
      title: "Data Logging",
      description:
        "All activities (dispensed, taken, missed) are logged to Firebase and displayed in real-time.",
      icon: <Database className="w-8 h-8 text-purple-600" />,
    },
    {
      step: 7,
      title: "Confirmation",
      description:
        "Dashboard updates status showing medicine taken, adherence rates, and complete history.",
      icon: <CheckCircle className="w-8 h-8 text-teal-600" />,
    },
  ];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="bg-gradient-to-br from-teal-500 to-teal-600 rounded-3xl shadow-sm p-8 text-white border border-teal-400">
        <div className="flex items-center space-x-4 mb-4">
          <div className="bg-white p-3 rounded-2xl shadow-sm">
            <img
              src="/logo_meditrack.png"
              alt="MediTrack Logo"
              className="w-10 h-10 object-contain"
            />
          </div>
          <div>
            <h1 className="text-4xl font-bold">MediTrack</h1>
            <p className="text-teal-50 text-lg">
              Automated Medicine Pill Dispenser System
            </p>
          </div>
        </div>
        <p className="text-teal-50 leading-relaxed">
          An IoT-based medication management system that combines Arduino
          hardware with Firebase cloud integration to ensure timely medicine
          intake and improve patient adherence.
        </p>
      </div>

      {/* Project Objective */}
      <div className="bg-white rounded-3xl shadow-sm p-6 border border-gray-100">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-12 h-12 bg-gradient-to-br from-teal-50 to-teal-100 rounded-2xl flex items-center justify-center shadow-sm">
            <Target className="w-6 h-6 text-teal-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-800">Project Objective</h2>
        </div>
        <div className="text-gray-700 space-y-4">
          <p>
            The MediTrack system aims to address the critical challenge of
            medication non-adherence, which affects millions of patients
            worldwide. Our primary objectives include:
          </p>
          <div className="space-y-3">
            <div className="flex items-start space-x-3 p-3 bg-teal-50 rounded-xl border border-teal-100">
              <CheckCircle className="w-5 h-5 text-teal-600 mt-0.5 flex-shrink-0" />
              <div>
                <span className="font-semibold text-gray-800">
                  Automated Dispensing:
                </span>
                <span className="text-gray-600">
                  {" "}
                  Eliminate manual tracking by automatically dispensing
                  medications at scheduled times
                </span>
              </div>
            </div>
            <div className="flex items-start space-x-3 p-3 bg-purple-50 rounded-xl border border-purple-100">
              <CheckCircle className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
              <div>
                <span className="font-semibold text-gray-800">
                  Real-time Monitoring:
                </span>
                <span className="text-gray-600">
                  {" "}
                  Use ultrasonic sensors to verify medicine intake within a
                  specified timeframe
                </span>
              </div>
            </div>
            <div className="flex items-start space-x-3 p-3 bg-rose-50 rounded-xl border border-rose-100">
              <CheckCircle className="w-5 h-5 text-rose-600 mt-0.5 flex-shrink-0" />
              <div>
                <span className="font-semibold text-gray-800">
                  Alert Notifications:
                </span>
                <span className="text-gray-600">
                  {" "}
                  Provide immediate audio and digital alerts when medications
                  are not taken
                </span>
              </div>
            </div>
            <div className="flex items-start space-x-3 p-3 bg-orange-50 rounded-xl border border-orange-100">
              <CheckCircle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
              <div>
                <span className="font-semibold text-gray-800">
                  Email Notifications:
                </span>
                <span className="text-gray-600">
                  {" "}
                  Send automated email alerts to caregivers when medications are
                  missed after the 1-minute monitoring period
                </span>
              </div>
            </div>
            <div className="flex items-start space-x-3 p-3 bg-blue-50 rounded-xl border border-blue-100">
              <CheckCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
              <div>
                <span className="font-semibold text-gray-800">
                  Data Analytics:
                </span>
                <span className="text-gray-600">
                  {" "}
                  Track adherence rates and provide comprehensive medication
                  history for healthcare providers
                </span>
              </div>
            </div>
            <div className="flex items-start space-x-3 p-3 bg-teal-50 rounded-xl border border-teal-100">
              <CheckCircle className="w-5 h-5 text-teal-600 mt-0.5 flex-shrink-0" />
              <div>
                <span className="font-semibold text-gray-800">
                  Remote Access:
                </span>
                <span className="text-gray-600">
                  {" "}
                  Enable caregivers to monitor patient medication compliance
                  from anywhere via web dashboard
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Team Members */}
      <div className="bg-white rounded-3xl shadow-sm p-6 border border-gray-100">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl flex items-center justify-center shadow-sm">
            <Users className="w-6 h-6 text-purple-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-800">Development Team</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {teamMembers.map((member, index) => (
            <div
              key={index}
              className="border-2 border-gray-100 rounded-2xl p-5 hover:border-teal-200 transition-all hover:shadow-md bg-gradient-to-br from-white to-gray-50"
            >
              <h3 className="text-lg font-bold text-gray-800 mb-1">
                {member.name}
              </h3>
              <p className="text-teal-600 font-semibold text-sm mb-3">
                {member.role}
              </p>
              <p className="text-gray-600 text-sm leading-relaxed">
                {member.description}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* System Flow */}
      <div className="bg-white rounded-3xl shadow-sm p-6 border border-gray-100">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-50 to-blue-100 rounded-2xl flex items-center justify-center shadow-sm">
            <Workflow className="w-6 h-6 text-blue-600" />
          </div>
          <h2 className="text-xl font-bold text-gray-800">System Workflow</h2>
        </div>
        <p className="text-gray-600 mb-6">
          The MediTrack system follows a comprehensive workflow to ensure
          reliable medication management:
        </p>

        <div className="space-y-4">
          {systemFlow.map((flow, index) => (
            <div key={index}>
              <div className="flex items-start space-x-4 p-5 border-2 border-gray-100 rounded-2xl hover:border-gray-200 transition-colors">
                <div className="flex-shrink-0">
                  <div className="bg-gradient-to-br from-gray-50 to-gray-100 w-14 h-14 rounded-xl flex items-center justify-center border border-gray-200">
                    {flow.icon}
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <span className="bg-teal-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                      STEP {flow.step}
                    </span>
                    <h3 className="text-base font-bold text-gray-800">
                      {flow.title}
                    </h3>
                  </div>
                  <p className="text-gray-600 text-sm leading-relaxed">
                    {flow.description}
                  </p>
                </div>
              </div>

              {index < systemFlow.length - 1 && (
                <div className="flex justify-center my-3">
                  <ArrowRight className="w-5 h-5 text-gray-300 transform rotate-90" />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Technical Specifications */}
      <div className="bg-white rounded-3xl shadow-sm p-6 border border-gray-100">
        <h2 className="text-xl font-bold text-gray-800 mb-5">
          Technical Specifications
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="bg-gradient-to-br from-teal-50 to-teal-100 border-2 border-teal-200 rounded-2xl p-5">
            <h3 className="font-bold text-gray-800 mb-3 flex items-center space-x-2">
              <Cpu className="w-5 h-5 text-teal-600" />
              <span>Hardware Components</span>
            </h3>
            <ul className="text-sm text-gray-700 space-y-2">
              <li className="flex items-start space-x-2">
                <span className="text-teal-600 font-bold">•</span>
                <span>Arduino UNO R4 WiFi</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-teal-600 font-bold">•</span>
                <span>PCA9685 16-Channel PWM Servo Driver</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-teal-600 font-bold">•</span>
                <span>6x SG90 Servo Motors (2 per medicine)</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-teal-600 font-bold">•</span>
                <span>HC-SR04 Ultrasonic Sensor</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-teal-600 font-bold">•</span>
                <span>Active Buzzer Module</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-teal-600 font-bold">•</span>
                <span>16x2 I2C LCD Display</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-teal-600 font-bold">•</span>
                <span>Push Buttons (Manual Dispense)</span>
              </li>
            </ul>
          </div>
          <div className="bg-gradient-to-br from-purple-50 to-purple-100 border-2 border-purple-200 rounded-2xl p-5">
            <h3 className="font-bold text-gray-800 mb-3 flex items-center space-x-2">
              <Globe className="w-5 h-5 text-purple-600" />
              <span>Software Stack</span>
            </h3>
            <ul className="text-sm text-gray-700 space-y-2">
              <li className="flex items-start space-x-2">
                <span className="text-purple-600 font-bold">•</span>
                <span>Arduino IDE (C++)</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-purple-600 font-bold">•</span>
                <span>React + TypeScript (Frontend)</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-purple-600 font-bold">•</span>
                <span>Firebase Realtime Database</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-purple-600 font-bold">•</span>
                <span>Email Notification Service</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-purple-600 font-bold">•</span>
                <span>NTP Time Synchronization</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-purple-600 font-bold">•</span>
                <span>WiFi Communication (802.11)</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-purple-600 font-bold">•</span>
                <span>Tailwind CSS (UI Framework)</span>
              </li>
              <li className="flex items-start space-x-2">
                <span className="text-purple-600 font-bold">•</span>
                <span>LocalStorage (Client-side Persistence)</span>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-gradient-to-br from-teal-50 to-teal-100 border-2 border-teal-200 rounded-2xl p-5">
        <p className="text-sm text-teal-800 text-center">
          <strong>MediTrack © 2025</strong> - Developed as an IoT project for
          automated healthcare solutions. For more information, contact the
          development team.
        </p>
      </div>
    </div>
  );
}

export default About;
