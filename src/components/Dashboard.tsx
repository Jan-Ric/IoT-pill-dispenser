import { useEffect, useState, useRef } from "react";
import {
  Pill,
  Clock,
  CheckCircle,
  Bell,
  AlertTriangle,
  WifiOff,
  RefreshCw,
} from "lucide-react";
import { firebaseService } from "../services/firebaseService";
import type { Medicine, Schedule } from "../types";
import type { Alert } from "../services/firebaseService";

interface FirebaseUpdate {
  medicineId?: string;
  scheduleId?: string;
  medicine_taken?: boolean;
  status?: string;
  date?: string;
  time?: string;
  datetime?: string;
  timestamp?: number;
}

function Dashboard() {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [lastUpdate, setLastUpdate] = useState<string>("");
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [notification, setNotification] = useState<string>("");
  const [notificationType, setNotificationType] = useState<
    "success" | "warning" | "error"
  >("success");
  const [recentAlerts, setRecentAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const lastProcessedTimestamp = useRef<number>(0);
  const isFirstLoad = useRef<boolean>(true);
  const connectionLostTime = useRef<number | null>(null);

  // Load recent alerts from Firebase
  useEffect(() => {
    const loadAlerts = async () => {
      const alerts = await firebaseService.getAlerts();
      setRecentAlerts(alerts);
    };
    loadAlerts();

    // Listen to alerts changes in real-time
    const unsubscribe = firebaseService.onAlertsChange((alerts) => {
      setRecentAlerts(alerts);
    });

    return () => unsubscribe();
  }, []);

  // Add alert to Firebase
  const addAlert = async (
    type: "missed" | "connection" | "dispensed" | "taken",
    message: string
  ) => {
    await firebaseService.addAlert({
      type,
      message,
      time: new Date().toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      timestamp: Date.now(),
    });
  };

  // Monitor connection status
  useEffect(() => {
    if (!isConnected && connectionLostTime.current === null) {
      connectionLostTime.current = Date.now();
    } else if (isConnected && connectionLostTime.current !== null) {
      const disconnectedDuration = Date.now() - connectionLostTime.current;
      const minutes = Math.floor(disconnectedDuration / 60000);
      if (minutes > 0) {
        addAlert(
          "connection",
          `Connection lost for ${minutes} min${minutes > 1 ? "s" : ""}`
        );
      }
      connectionLostTime.current = null;
    }
  }, [isConnected]);

  // Load medicines from Firebase on mount
  useEffect(() => {
    loadMedicines();
  }, []);

  const loadMedicines = async () => {
    setIsLoading(true);
    try {
      const medicinesData = await firebaseService.getMedicines();
      const loadedMedicines = Object.values(medicinesData).filter(
        (m): m is Medicine => m !== null
      );
      setMedicines(loadedMedicines);
      setIsConnected(true);
      console.log("Loaded medicines from Firebase:", loadedMedicines);
    } catch (error) {
      console.error("Error loading medicines:", error);
      setIsConnected(false);
      setNotification("❌ Failed to load medicines from Firebase");
      setNotificationType("error");
      setTimeout(() => setNotification(""), 3000);
    } finally {
      setIsLoading(false);
    }
  };

  // Firebase listener for medicine updates
  useEffect(() => {
    setIsConnected(true);
    let unsubscribe: (() => void) | null = null;
    let medicinesUnsubscribe: (() => void) | null = null;

    try {
      // Listen to medicines structure changes (add/remove/edit medicines)
      medicinesUnsubscribe = firebaseService.onMedicinesChange(
        (medicinesData) => {
          const meds = Object.values(medicinesData).filter(
            (m): m is Medicine => m !== null
          );
          setMedicines(meds);
          console.log("Medicines updated:", meds);
        }
      );

      // Listen to medicine_updates for real-time status changes (taken/dispensed/alert)
      unsubscribe = firebaseService.onValue((data: FirebaseUpdate) => {
        console.log("Firebase update received:", data);

        if (isFirstLoad.current) {
          console.log("First load - ignoring initial Firebase snapshot");
          isFirstLoad.current = false;

          if (data.timestamp) {
            lastProcessedTimestamp.current = data.timestamp;
          }
          return;
        }

        if (
          data.timestamp &&
          data.timestamp <= lastProcessedTimestamp.current
        ) {
          console.log("Duplicate or old update detected, skipping...");
          return;
        }

        const now = Math.floor(Date.now() / 1000);
        if (data.timestamp && now - data.timestamp > 10) {
          console.log("Old update detected (>10 seconds), skipping...");
          return;
        }

        if (data.timestamp) {
          lastProcessedTimestamp.current = data.timestamp;
        }

        if (data.medicineId && data.scheduleId && data.status) {
          handleFirebaseUpdate(data);
        }
      });
    } catch (error) {
      console.error("Firebase listener error:", error);
      setIsConnected(false);
    }

    return () => {
      console.log("Cleaning up Firebase listeners");
      if (unsubscribe) {
        unsubscribe();
      }
      if (medicinesUnsubscribe) {
        medicinesUnsubscribe();
      }
      setIsConnected(false);
      isFirstLoad.current = true;
    };
  }, []);

  const handleFirebaseUpdate = async (data: FirebaseUpdate) => {
    const {
      medicineId,
      scheduleId,
      status,
      time = "",
      date = "",
      datetime = "",
    } = data;

    setMedicines((prev) => {
      const updated = prev.map((med) => {
        if (med.id === medicineId) {
          const updatedSchedules = med.schedules.map((sched) => {
            if (sched.id === scheduleId) {
              if (status === "dispensed") {
                addAlert("dispensed", `${med.name} (${sched.time}) dispensed`);
                return {
                  ...sched,
                  dispensed: true,
                  taken: false,
                  alert: false,
                };
              } else if (status === "taken") {
                addAlert(
                  "taken",
                  `${med.name} (${sched.time}) taken at ${time}`
                );

                // Add to history
                firebaseService.addHistoryRecord({
                  name: med.name,
                  dosage: med.dosage,
                  scheduledTime: sched.time,
                  takenTime: time,
                  date: date,
                  status: "taken",
                  timestamp: Date.now(),
                });

                return {
                  ...sched,
                  dispensed: true,
                  taken: true,
                  alert: false,
                };
              } else if (status === "alert") {
                addAlert("missed", `${med.name} (${sched.time}) at ${time}`);

                // Add to history as missed
                firebaseService.addHistoryRecord({
                  name: med.name,
                  dosage: med.dosage,
                  scheduledTime: sched.time,
                  takenTime: time,
                  date: date,
                  status: "missed",
                  timestamp: Date.now(),
                });

                return {
                  ...sched,
                  dispensed: true,
                  taken: false,
                  alert: true,
                };
              }
            }
            return sched;
          });

          const medicine = { ...med, schedules: updatedSchedules };
          const schedule = medicine.schedules.find((s) => s.id === scheduleId);
          if (schedule) {
            showNotification(medicine, schedule, status || "", time, date);
          }

          return medicine;
        }
        return med;
      });

      setLastUpdate(datetime);
      return updated;
    });
  };

  const showNotification = (
    medicine: Medicine,
    schedule: Schedule,
    status: string,
    time: string,
    date: string
  ) => {
    const medicineName = `${medicine.name} (${schedule.time})`;

    if (status === "dispensed") {
      setNotification(`💊 ${medicineName} dispensed - monitoring started`);
      setNotificationType("success");
      setTimeout(() => setNotification(""), 5000);
    } else if (status === "taken") {
      setNotification(`✓ ${medicineName} taken at ${time} on ${date}`);
      setNotificationType("success");
      setTimeout(() => setNotification(""), 5000);
    } else if (status === "alert") {
      setNotification(`⚠️ ALERT: ${medicineName} NOT taken after 1 minute!`);
      setNotificationType("error");
      setTimeout(() => setNotification(""), 8000);
    }
  };

  const handleScheduleToggle = async (
    medicineId: string,
    scheduleId: string
  ) => {
    const medicine = medicines.find((m) => m.id === medicineId);
    if (!medicine) return;

    const schedule = medicine.schedules.find((s) => s.id === scheduleId);
    if (!schedule) return;

    const timestamp = Math.floor(Date.now() / 1000);

    // If not dispensed yet, send dispense command to Arduino
    if (!schedule.dispensed && !schedule.taken) {
      try {
        const servoIndex = medicine.servoIndex.toString();

        console.log("Sending dispense command:", {
          servoIndex,
          medicineId,
          scheduleId,
          scheduledTime: schedule.time,
        });

        await fetch(
          "https://meditrack-24ee5-default-rtdb.asia-southeast1.firebasedatabase.app/dispense_command.json",
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              servoIndex: servoIndex,
              medicineId: medicineId,
              scheduleId: scheduleId,
              scheduledTime: schedule.time,
              timestamp: timestamp,
            }),
          }
        );

        console.log("✅ Dispense command sent successfully");

        setNotification(
          `💊 Dispense command sent for ${medicine.name} (${schedule.time})...`
        );
        setNotificationType("success");
        setTimeout(() => setNotification(""), 3000);
        return;
      } catch (error) {
        console.error("❌ Error sending dispense command:", error);
        setNotification(`❌ Error sending dispense command`);
        setNotificationType("error");
        setTimeout(() => setNotification(""), 3000);
        return;
      }
    }

    // Manual marking as taken
    else if (schedule.dispensed && !schedule.taken) {
      const currentTime = new Date().toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      const currentDate = new Date().toLocaleDateString("en-US");

      setMedicines((prev) =>
        prev.map((med) => {
          if (med.id === medicineId) {
            return {
              ...med,
              schedules: med.schedules.map((sched) => {
                if (sched.id === scheduleId) {
                  return {
                    ...sched,
                    dispensed: true,
                    taken: true,
                    alert: false,
                  };
                }
                return sched;
              }),
            };
          }
          return med;
        })
      );

      addAlert(
        "taken",
        `${medicine.name} (${schedule.time}) taken at ${currentTime.substring(
          0,
          5
        )}`
      );

      // Add to history
      await firebaseService.addHistoryRecord({
        name: medicine.name,
        dosage: medicine.dosage,
        scheduledTime: schedule.time,
        takenTime: currentTime,
        date: currentDate,
        status: "taken",
        timestamp: Date.now(),
      });

      setNotification(`✓ ${medicine.name} (${schedule.time}) marked as taken`);
      setNotificationType("success");
      setTimeout(() => setNotification(""), 3000);

      // Update Firebase
      try {
        await fetch(
          "https://meditrack-24ee5-default-rtdb.asia-southeast1.firebasedatabase.app/medicine_updates.json",
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              medicineId: medicineId,
              scheduleId: scheduleId,
              medicine_taken: true,
              status: "taken",
              time: currentTime,
              date: currentDate,
              datetime: new Date().toLocaleString(),
              timestamp: timestamp,
            }),
          }
        );
      } catch (error) {
        console.error("Error updating Firebase:", error);
      }
    }

    // Reset
    else {
      setMedicines((prev) =>
        prev.map((med) => {
          if (med.id === medicineId) {
            return {
              ...med,
              schedules: med.schedules.map((sched) => {
                if (sched.id === scheduleId) {
                  return {
                    ...sched,
                    dispensed: false,
                    taken: false,
                    alert: false,
                  };
                }
                return sched;
              }),
            };
          }
          return med;
        })
      );

      setNotification(`${medicine.name} (${schedule.time}) reset`);
      setNotificationType("success");
      setTimeout(() => setNotification(""), 3000);
    }
  };

  const resetAllSchedules = () => {
    setMedicines((prev) =>
      prev.map((med) => ({
        ...med,
        schedules: med.schedules.map((sched) => ({
          ...sched,
          taken: false,
          dispensed: false,
          alert: false,
        })),
      }))
    );

    setNotification("✓ All schedules reset");
    setNotificationType("success");
    setTimeout(() => setNotification(""), 3000);
  };

  const getTodayStats = () => {
    let totalSchedules = 0;
    let takenSchedules = 0;
    let alertSchedules = 0;
    let pendingSchedules = 0;

    medicines.forEach((med) => {
      med.schedules.forEach((sched) => {
        totalSchedules++;
        if (sched.taken) takenSchedules++;
        else if (sched.alert) alertSchedules++;
        else if (sched.dispensed) pendingSchedules++;
      });
    });

    const percentage =
      totalSchedules > 0
        ? Math.round((takenSchedules / totalSchedules) * 100)
        : 0;

    return {
      total: totalSchedules,
      taken: takenSchedules,
      pending: pendingSchedules,
      alerts: alertSchedules,
      percentage,
    };
  };

  const stats = getTodayStats();

  const getNotificationColor = () => {
    switch (notificationType) {
      case "success":
        return "bg-teal-500";
      case "warning":
        return "bg-amber-500";
      case "error":
        return "bg-rose-500";
      default:
        return "bg-teal-500";
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case "missed":
        return <AlertTriangle className="w-4 h-4 text-rose-600" />;
      case "connection":
        return <WifiOff className="w-4 h-4 text-amber-600" />;
      case "dispensed":
        return <Pill className="w-4 h-4 text-purple-600" />;
      case "taken":
        return <CheckCircle className="w-4 h-4 text-teal-600" />;
      default:
        return <Bell className="w-4 h-4 text-gray-600" />;
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <RefreshCw className="w-8 h-8 text-purple-600 animate-spin mx-auto mb-2" />
          <p className="text-gray-600">Loading medicines...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {notification && (
        <div
          className={`${getNotificationColor()} text-white px-5 py-4 rounded-2xl shadow-lg flex items-center space-x-3`}
        >
          {notificationType === "error" ? (
            <AlertTriangle className="w-5 h-5" />
          ) : (
            <Bell className="w-5 h-5" />
          )}
          <span className="font-medium">{notification}</span>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-4">
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-3xl p-6 border border-purple-200 md:col-span-3">
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm">
              <Pill className="w-6 h-6 text-purple-600" />
            </div>
            <span className="text-xs text-purple-600 font-semibold bg-white px-3 py-1 rounded-full">
              {stats.percentage}%
            </span>
          </div>
          <p className="text-gray-600 text-sm font-medium mb-1">
            Total Schedules
          </p>
          <p className="text-4xl font-bold text-gray-800">{stats.total}</p>
          <p className="text-xs text-gray-500 mt-2">
            {medicines.length} medicine{medicines.length !== 1 ? "s" : ""}
          </p>
        </div>

        <div className="bg-gradient-to-br from-teal-50 to-teal-100 rounded-3xl p-6 border border-teal-200 md:col-span-3">
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm">
              <CheckCircle className="w-6 h-6 text-teal-600" />
            </div>
            <span className="text-xs text-teal-600 font-semibold bg-white px-3 py-1 rounded-full">
              {stats.taken}/{stats.total}
            </span>
          </div>
          <p className="text-gray-600 text-sm font-medium mb-1">Taken Today</p>
          <p className="text-4xl font-bold text-gray-800">{stats.taken}</p>
          <p className="text-xs text-gray-500 mt-2">{stats.pending} pending</p>
        </div>

        {/* Recent Alerts Card */}
        <div className="bg-gradient-to-br from-amber-50 to-amber-100 rounded-3xl p-6 border border-amber-200 md:col-span-6">
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm">
              <Bell className="w-6 h-6 text-amber-600" />
            </div>
            <span className="text-xs text-amber-600 font-semibold bg-white px-3 py-1 rounded-full">
              {recentAlerts.length}
            </span>
          </div>
          <p className="text-gray-600 text-sm font-medium mb-3">
            Recent Alerts
          </p>

          {recentAlerts.length === 0 ? (
            <p className="text-xs text-gray-500">No recent alerts</p>
          ) : (
            <div className="space-y-2 max-h-24 overflow-y-auto">
              {recentAlerts.slice(0, 3).map((alert) => (
                <div
                  key={alert.id}
                  className="flex items-start space-x-2 text-xs"
                >
                  {getAlertIcon(alert.type)}
                  <div className="flex-1">
                    <p className="text-gray-700 leading-tight">
                      {alert.message}
                    </p>
                    <p className="text-gray-500 text-[10px]">{alert.time}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Medicine Schedule */}
      <div className="bg-white rounded-3xl shadow-sm p-6 border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <h3 className="text-xl font-bold text-gray-800">
              Medicine Schedule
            </h3>
            <div className="flex items-center space-x-2">
              <div
                className={`w-2 h-2 rounded-full ${
                  isConnected ? "bg-green-500 animate-pulse" : "bg-red-500"
                }`}
              ></div>
              <span className="text-xs text-gray-500">
                {isConnected ? "Connected" : "Disconnected"}
              </span>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={loadMedicines}
              className="px-4 py-2 bg-purple-100 text-purple-700 rounded-xl hover:bg-purple-200 transition-colors text-sm font-medium flex items-center space-x-2"
            >
              <RefreshCw className="w-4 h-4" />
              <span>Reload</span>
            </button>
            <button
              onClick={resetAllSchedules}
              className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors text-sm font-medium"
            >
              Reset All
            </button>
          </div>
        </div>

        {medicines.length === 0 ? (
          <div className="text-center py-12">
            <Pill className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 mb-2">No medicines found</p>
            <p className="text-sm text-gray-400">
              Add medicines in the Account page
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {medicines.map((medicine) => (
              <div
                key={medicine.id}
                className="rounded-2xl p-5 border-2 border-gray-100 bg-white hover:border-gray-200 transition-all"
              >
                {/* Medicine Header */}
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                    <Pill className="w-5 h-5 text-purple-600" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-800 text-base">
                      {medicine.name}
                    </h4>
                    <p className="text-sm text-gray-500">{medicine.dosage}</p>
                  </div>
                  <div className="ml-auto">
                    <span className="text-xs text-gray-500 bg-gray-100 px-3 py-1 rounded-full">
                      {medicine.schedules.filter((s) => s.taken).length}/
                      {medicine.schedules.length} taken
                    </span>
                  </div>
                </div>

                {/* Schedules */}
                <div className="space-y-2 ml-13">
                  {medicine.schedules.map((schedule) => (
                    <div
                      key={schedule.id}
                      className={`rounded-xl p-3 flex items-center justify-between border-2 transition-all ${
                        schedule.alert
                          ? "border-rose-200 bg-rose-50"
                          : schedule.taken
                          ? "border-teal-200 bg-teal-50"
                          : schedule.dispensed
                          ? "border-amber-200 bg-amber-50"
                          : "border-gray-100 bg-gray-50"
                      }`}
                    >
                      <div className="flex items-center space-x-3">
                        <Clock
                          className={`w-4 h-4 ${
                            schedule.alert
                              ? "text-rose-600"
                              : schedule.taken
                              ? "text-teal-600"
                              : schedule.dispensed
                              ? "text-amber-600"
                              : "text-gray-400"
                          }`}
                        />
                        <div>
                          <p className="font-semibold text-gray-800 text-sm">
                            {schedule.time}
                          </p>
                          {schedule.alert && (
                            <p className="text-xs text-rose-600 font-medium">
                              ⚠️ Not taken
                            </p>
                          )}
                          {schedule.taken && (
                            <p className="text-xs text-teal-600 font-medium">
                              ✓ Taken
                            </p>
                          )}
                          {schedule.dispensed &&
                            !schedule.taken &&
                            !schedule.alert && (
                              <p className="text-xs text-amber-600 font-medium">
                                ⏳ Dispensed
                              </p>
                            )}
                        </div>
                      </div>

                      <button
                        onClick={() =>
                          handleScheduleToggle(medicine.id, schedule.id)
                        }
                        className={`px-4 py-1.5 rounded-lg font-medium transition-all text-xs ${
                          schedule.alert
                            ? "bg-rose-500 text-white hover:bg-rose-600"
                            : schedule.taken
                            ? "bg-teal-500 text-white hover:bg-teal-600"
                            : schedule.dispensed
                            ? "bg-amber-500 text-white hover:bg-amber-600"
                            : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                        }`}
                      >
                        {schedule.alert
                          ? "Alert"
                          : schedule.taken
                          ? "Taken"
                          : schedule.dispensed
                          ? "Mark Taken"
                          : "Dispense"}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {lastUpdate && (
        <div className="bg-purple-50 border border-purple-200 rounded-2xl p-4">
          <p className="text-sm text-purple-800">
            <strong>Last update from Arduino:</strong> {lastUpdate}
          </p>
        </div>
      )}
    </div>
  );
}

export default Dashboard;
