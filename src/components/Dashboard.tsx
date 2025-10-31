import { useEffect, useState, useRef } from "react";
import {
  Pill,
  Clock,
  CheckCircle,
  XCircle,
  Bell,
  AlertTriangle,
  WifiOff,
} from "lucide-react";

interface MedicineSchedule {
  id: string;
  name: string;
  dosage: string;
  time: string;
  taken: boolean;
  dispensed: boolean;
  alert: boolean;
  takenAt?: string;
  takenDate?: string;
  alertTime?: string;
}

interface FirebaseData {
  medicineId?: string;
  medicine_taken?: boolean;
  status?: string;
  date?: string;
  time?: string;
  datetime?: string;
  timestamp?: number;
}

interface Alert {
  id: string;
  type: "missed" | "connection" | "dispensed" | "taken";
  message: string;
  time: string;
  timestamp: number;
}

function Dashboard() {
  const [medicines, setMedicines] = useState<MedicineSchedule[]>([]);
  const [lastUpdate, setLastUpdate] = useState<string>("");
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [notification, setNotification] = useState<string>("");
  const [notificationType, setNotificationType] = useState<
    "success" | "warning" | "error"
  >("success");
  const [recentAlerts, setRecentAlerts] = useState<Alert[]>([]);

  const lastProcessedTimestamp = useRef<number>(0);
  const isFirstLoad = useRef<boolean>(true);
  const connectionLostTime = useRef<number | null>(null);

  // Load recent alerts from localStorage
  useEffect(() => {
    const storedAlerts = localStorage.getItem("recentAlerts");
    if (storedAlerts) {
      setRecentAlerts(JSON.parse(storedAlerts));
    }
  }, []);

  // Add alert to recent alerts
  const addAlert = (
    type: "missed" | "connection" | "dispensed" | "taken",
    message: string
  ) => {
    const newAlert: Alert = {
      id: Date.now().toString(),
      type,
      message,
      time: new Date().toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      timestamp: Date.now(),
    };

    setRecentAlerts((prev) => {
      // Keep only last 5 alerts
      const updated = [newAlert, ...prev].slice(0, 5);
      localStorage.setItem("recentAlerts", JSON.stringify(updated));
      return updated;
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

  // Initialize medicines from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem("medicineSchedules");
      if (stored) {
        setMedicines(JSON.parse(stored));
        console.log("Loaded medicines from localStorage:", JSON.parse(stored));
      } else {
        const defaultMedicines: MedicineSchedule[] = [
          {
            id: "1",
            name: "Aspirin",
            dosage: "100mg",
            time: "08:00",
            taken: false,
            dispensed: false,
            alert: false,
          },
          {
            id: "2",
            name: "Vitamin C",
            dosage: "500mg",
            time: "12:00",
            taken: false,
            dispensed: false,
            alert: false,
          },
          {
            id: "3",
            name: "Blood Pressure Med",
            dosage: "50mg",
            time: "20:00",
            taken: false,
            dispensed: false,
            alert: false,
          },
        ];
        setMedicines(defaultMedicines);
        localStorage.setItem(
          "medicineSchedules",
          JSON.stringify(defaultMedicines)
        );
      }

      const storedTimestamp = localStorage.getItem("lastProcessedTimestamp");
      if (storedTimestamp) {
        lastProcessedTimestamp.current = parseInt(storedTimestamp, 10);
      }
    } catch (error) {
      console.error("Error loading medicines:", error);
    }
  }, []);

  // Firebase listener
  useEffect(() => {
    setIsConnected(true);
    let unsubscribe: (() => void) | null = null;

    try {
      import("../services/firebaseService")
        .then((module) => {
          const firebaseService = module.firebaseService;

          unsubscribe = firebaseService.onValue((data: FirebaseData) => {
            console.log("Firebase update received:", data);

            if (isFirstLoad.current) {
              console.log("First load - ignoring initial Firebase snapshot");
              isFirstLoad.current = false;

              if (data.timestamp) {
                lastProcessedTimestamp.current = data.timestamp;
                localStorage.setItem(
                  "lastProcessedTimestamp",
                  data.timestamp.toString()
                );
              }
              return;
            }

            if (
              data.timestamp &&
              data.timestamp <= lastProcessedTimestamp.current
            ) {
              console.log("Duplicate or old update detected, skipping...", {
                received: data.timestamp,
                lastProcessed: lastProcessedTimestamp.current,
              });
              return;
            }

            const now = Math.floor(Date.now() / 1000);
            if (data.timestamp && now - data.timestamp > 10) {
              console.log("Old update detected (>10 seconds), skipping...");
              return;
            }

            if (data.timestamp) {
              lastProcessedTimestamp.current = data.timestamp;
              localStorage.setItem(
                "lastProcessedTimestamp",
                data.timestamp.toString()
              );
            }

            if (data.medicineId && data.status) {
              handleFirebaseUpdate(data);
            }
          });
        })
        .catch((error) => {
          console.error("Firebase service error:", error);
          setIsConnected(false);
        });
    } catch (error) {
      console.error("Firebase setup error:", error);
      setIsConnected(false);
    }

    return () => {
      console.log("Cleaning up Firebase listener");
      if (unsubscribe) {
        unsubscribe();
      }
      setIsConnected(false);
      isFirstLoad.current = true;
    };
  }, []);

  const handleFirebaseUpdate = (data: FirebaseData) => {
    const { medicineId, status, time = "", date = "", datetime = "" } = data;

    setMedicines((prev) => {
      const updated = prev.map((med) => {
        if (med.id === medicineId) {
          if (status === "dispensed") {
            addAlert("dispensed", `${med.name} dispensed at ${time}`);
            return {
              ...med,
              dispensed: true,
              taken: false,
              alert: false,
              takenAt: undefined,
              takenDate: undefined,
              alertTime: undefined,
            };
          } else if (status === "taken") {
            addAlert("taken", `${med.name} taken at ${time}`);
            return {
              ...med,
              dispensed: true,
              taken: true,
              alert: false,
              takenAt: time,
              takenDate: date,
              alertTime: undefined,
            };
          } else if (status === "alert") {
            addAlert("missed", `Missed ${med.name} dose at ${time}`);
            return {
              ...med,
              dispensed: true,
              taken: false,
              alert: true,
              takenAt: undefined,
              takenDate: undefined,
              alertTime: time,
            };
          }
        }
        return med;
      });

      localStorage.setItem("medicineSchedules", JSON.stringify(updated));
      console.log("Saved medicines to localStorage after Firebase update");

      const medicine = updated.find((m) => m.id === medicineId);
      if (medicine && (status === "taken" || status === "alert")) {
        saveToHistory(medicine, status || "", time, date);
      }

      if (medicine) {
        showNotification(medicine, status || "", time, date);
      }

      setLastUpdate(datetime);
      return updated;
    });
  };

  const saveToHistory = (
    medicine: MedicineSchedule,
    status: string,
    time: string,
    date: string
  ) => {
    try {
      if (status === "taken" || status === "alert") {
        const history = JSON.parse(
          localStorage.getItem("medicineHistory") || "[]"
        );

        const isDuplicate = history.some(
          (record: any) =>
            record.name === medicine.name &&
            record.date === date &&
            record.takenTime === time &&
            record.status === (status === "taken" ? "taken" : "missed")
        );

        if (!isDuplicate) {
          history.push({
            id: Date.now().toString(),
            name: medicine.name,
            dosage: medicine.dosage,
            scheduledTime: medicine.time,
            takenTime: time,
            date: date,
            status: status === "taken" ? "taken" : "missed",
          });
          localStorage.setItem("medicineHistory", JSON.stringify(history));
          console.log("History saved successfully");
        } else {
          console.log("Duplicate history entry prevented");
        }
      }
    } catch (error) {
      console.error("Error saving to history:", error);
    }
  };

  const showNotification = (
    medicine: MedicineSchedule,
    status: string,
    time: string,
    date: string
  ) => {
    const medicineName = medicine.name;

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

  const handleManualToggle = (id: string) => {
    const medicine = medicines.find((m) => m.id === id);
    if (!medicine) return;

    const currentTime = new Date().toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
    const currentDate = new Date().toLocaleDateString("en-US");
    const timestamp = Math.floor(Date.now() / 1000);

    let newStatus: string;
    let updated: MedicineSchedule[];

    if (!medicine.dispensed && !medicine.taken) {
      newStatus = "dispensed";
      updated = medicines.map((med) =>
        med.id === id
          ? {
              ...med,
              dispensed: true,
              taken: false,
              alert: false,
              takenAt: undefined,
              takenDate: undefined,
              alertTime: undefined,
            }
          : med
      );

      addAlert(
        "dispensed",
        `${medicine.name} dispensed at ${currentTime.substring(0, 5)}`
      );
      setNotification(`💊 ${medicine.name} dispensed - monitoring started`);
      setNotificationType("success");
      setTimeout(() => setNotification(""), 3000);
    } else if (medicine.dispensed && !medicine.taken) {
      newStatus = "taken";
      updated = medicines.map((med) =>
        med.id === id
          ? {
              ...med,
              dispensed: true,
              taken: true,
              alert: false,
              takenAt: currentTime,
              takenDate: currentDate,
              alertTime: undefined,
            }
          : med
      );

      saveToHistory(medicine, "taken", currentTime, currentDate);
      addAlert(
        "taken",
        `${medicine.name} taken at ${currentTime.substring(0, 5)}`
      );

      setNotification(`✓ ${medicine.name} taken at ${currentTime}`);
      setNotificationType("success");
      setTimeout(() => setNotification(""), 3000);
    } else {
      newStatus = "reset";
      updated = medicines.map((med) =>
        med.id === id
          ? {
              ...med,
              dispensed: false,
              taken: false,
              alert: false,
              takenAt: undefined,
              takenDate: undefined,
              alertTime: undefined,
            }
          : med
      );

      setNotification(`${medicine.name} reset`);
      setNotificationType("success");
      setTimeout(() => setNotification(""), 3000);
    }

    setMedicines(updated);
    localStorage.setItem("medicineSchedules", JSON.stringify(updated));
    console.log("Saved medicines to localStorage after manual toggle");

    lastProcessedTimestamp.current = timestamp;
    localStorage.setItem("lastProcessedTimestamp", timestamp.toString());

    try {
      import("../services/firebaseService").then((module) => {
        module.firebaseService.update({
          medicineId: id,
          medicine_taken: medicine.taken,
          status: newStatus,
          time: currentTime,
          date: currentDate,
          datetime: new Date().toLocaleString(),
          timestamp: timestamp,
        });
      });
    } catch (error) {
      console.error("Error updating Firebase:", error);
    }
  };

  const resetDailyStatus = () => {
    const reset = medicines.map((med) => ({
      ...med,
      taken: false,
      dispensed: false,
      alert: false,
      takenAt: undefined,
      takenDate: undefined,
      alertTime: undefined,
    }));
    setMedicines(reset);
    localStorage.setItem("medicineSchedules", JSON.stringify(reset));
    console.log("Saved medicines to localStorage after reset");

    setNotification("✓ Daily status reset");
    setNotificationType("success");
    setTimeout(() => setNotification(""), 3000);
  };

  const getTodayStats = () => {
    const total = medicines.length;
    const taken = medicines.filter((m) => m.taken).length;
    const alerts = medicines.filter((m) => m.alert).length;
    const pending = medicines.filter(
      (m) => m.dispensed && !m.taken && !m.alert
    ).length;
    const percentage = total > 0 ? Math.round((taken / total) * 100) : 0;

    return { total, taken, pending, alerts, percentage };
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
            Upcoming Appt.
          </p>
          <p className="text-4xl font-bold text-gray-800">{stats.total}</p>
          <p className="text-xs text-gray-500 mt-2">
            {medicines.filter((m) => !m.dispensed).length} not confirmed
          </p>
        </div>

        <div className="bg-gradient-to-br from-teal-50 to-teal-100 rounded-3xl p-6 border border-teal-200 md:col-span-3">
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm">
              <CheckCircle className="w-6 h-6 text-teal-600" />
            </div>
            <span className="text-xs text-teal-600 font-semibold flex items-center">
              <span className="text-lg mr-1">↑</span> 3.4%
            </span>
          </div>
          <p className="text-gray-600 text-sm font-medium mb-1">
            Finished Appt.
          </p>
          <p className="text-4xl font-bold text-gray-800">{stats.taken}</p>
          <p className="text-xs text-gray-500 mt-2">vs last month</p>
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
          <button
            onClick={resetDailyStatus}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors text-sm font-medium"
          >
            Reset Daily Status
          </button>
        </div>

        <div className="space-y-3">
          {medicines.map((medicine) => (
            <div
              key={medicine.id}
              className={`rounded-2xl p-4 transition-all border-2 ${
                medicine.alert
                  ? "border-rose-200 bg-rose-50"
                  : medicine.taken
                  ? "border-teal-200 bg-teal-50"
                  : medicine.dispensed
                  ? "border-amber-200 bg-amber-50"
                  : "border-gray-100 bg-white hover:border-gray-200"
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div
                    className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                      medicine.alert
                        ? "bg-rose-100"
                        : medicine.taken
                        ? "bg-teal-100"
                        : medicine.dispensed
                        ? "bg-amber-100"
                        : "bg-gray-100"
                    }`}
                  >
                    {medicine.alert ? (
                      <AlertTriangle className="w-6 h-6 text-rose-600" />
                    ) : (
                      <Pill
                        className={`w-6 h-6 ${
                          medicine.taken
                            ? "text-teal-600"
                            : medicine.dispensed
                            ? "text-amber-600"
                            : "text-gray-500"
                        }`}
                      />
                    )}
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-800 text-base">
                      {medicine.name}
                    </h4>
                    <p className="text-sm text-gray-500">
                      {medicine.dosage} • {medicine.time}
                    </p>
                    {medicine.alert && (
                      <p className="text-xs text-rose-600 font-semibold mt-1 flex items-center space-x-1">
                        <span>
                          ⚠️ NOT TAKEN - Alert at {medicine.alertTime}
                        </span>
                      </p>
                    )}
                    {medicine.taken && medicine.takenAt && (
                      <p className="text-xs text-teal-600 font-medium mt-1">
                        ✓ Taken at {medicine.takenAt} on {medicine.takenDate}
                      </p>
                    )}
                    {medicine.dispensed &&
                      !medicine.taken &&
                      !medicine.alert && (
                        <p className="text-xs text-amber-600 font-medium mt-1">
                          ⏳ Dispensed - Monitoring...
                        </p>
                      )}
                  </div>
                </div>

                <button
                  onClick={() => handleManualToggle(medicine.id)}
                  className={`px-5 py-2.5 rounded-xl font-medium transition-all text-sm ${
                    medicine.alert
                      ? "bg-rose-500 text-white hover:bg-rose-600 shadow-lg shadow-rose-200"
                      : medicine.taken
                      ? "bg-teal-500 text-white hover:bg-teal-600 shadow-lg shadow-teal-200"
                      : medicine.dispensed
                      ? "bg-amber-500 text-white hover:bg-amber-600 shadow-lg shadow-amber-200"
                      : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                  }`}
                >
                  {medicine.alert ? (
                    <div className="flex items-center space-x-2">
                      <AlertTriangle className="w-4 h-4" />
                      <span>Alert</span>
                    </div>
                  ) : medicine.taken ? (
                    <div className="flex items-center space-x-2">
                      <CheckCircle className="w-4 h-4" />
                      <span>Taken</span>
                    </div>
                  ) : medicine.dispensed ? (
                    <div className="flex items-center space-x-2">
                      <Clock className="w-4 h-4" />
                      <span>Mark Taken</span>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <XCircle className="w-4 h-4" />
                      <span>Dispense</span>
                    </div>
                  )}
                </button>
              </div>
            </div>
          ))}
        </div>
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
