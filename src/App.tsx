import { useState, useEffect, useRef } from "react";
import { Home, History, Info, User, X } from "lucide-react";
import Dashboard from "./components/Dashboard";
import HistoryComponent from "./components/History";
import About from "./components/About";
import Account from "./components/Account";
import { firebaseService } from "./services/firebaseService";
import type { Medicine } from "./types";
import type { Alert } from "./services/firebaseService";
import { ref, onValue } from "firebase/database";
import { database } from "./services/firebaseService";

type Page = "dashboard" | "history" | "about" | "account";

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

function App() {
  const [currentPage, setCurrentPage] = useState<Page>("dashboard");
  const [userName, setUserName] = useState<string>("User");
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Lifted state from Dashboard - CHANGED TO OBJECT
  const [medicines, setMedicines] = useState<Record<string, Medicine | null>>({
    slot_0: null,
    slot_1: null,
    slot_2: null,
  });
  const [lastUpdate, setLastUpdate] = useState<string>("");
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [recentAlerts, setRecentAlerts] = useState<Alert[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const lastProcessedTimestamp = useRef<number>(0);
  const isFirstLoad = useRef<boolean>(true);
  const connectionLostTime = useRef<number | null>(null);

  // Load user name from Firebase and listen for changes
  useEffect(() => {
    const userProfileRef = ref(database, "user_profile");

    const unsubscribe = onValue(userProfileRef, (snapshot) => {
      const profile = snapshot.val();
      if (profile && profile.fullName) {
        setUserName(profile.fullName);
      }
    });

    return () => unsubscribe();
  }, []);

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
      setMedicines(
        medicinesData || { slot_0: null, slot_1: null, slot_2: null }
      );
      setIsConnected(true);
      console.log("Loaded medicines from Firebase:", medicinesData);
    } catch (error) {
      console.error("Error loading medicines:", error);
      setIsConnected(false);
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
          setMedicines(
            medicinesData || { slot_0: null, slot_1: null, slot_2: null }
          );
          console.log("Medicines updated:", medicinesData);
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
      const updated = { ...prev };

      // Find the slot that contains this medicine
      const slotKey = Object.keys(prev).find(
        (key) => prev[key]?.id === medicineId
      );

      if (slotKey && updated[slotKey]) {
        const med = updated[slotKey]!;

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
              addAlert("taken", `${med.name} (${sched.time}) taken at ${time}`);

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

        updated[slotKey] = { ...med, schedules: updatedSchedules };
      }

      setLastUpdate(datetime);
      return updated;
    });
  };

  const renderPage = () => {
    switch (currentPage) {
      case "dashboard":
        return (
          <Dashboard
            medicines={medicines}
            setMedicines={setMedicines}
            lastUpdate={lastUpdate}
            isConnected={isConnected}
            recentAlerts={recentAlerts}
            isLoading={isLoading}
            loadMedicines={loadMedicines}
            addAlert={addAlert}
          />
        );
      case "history":
        return <HistoryComponent />;
      case "about":
        return <About />;
      case "account":
        return <Account />;
      default:
        return (
          <Dashboard
            medicines={medicines}
            setMedicines={setMedicines}
            lastUpdate={lastUpdate}
            isConnected={isConnected}
            recentAlerts={recentAlerts}
            isLoading={isLoading}
            loadMedicines={loadMedicines}
            addAlert={addAlert}
          />
        );
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 12) return "Good Morning";
    if (hour >= 12 && hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

  const navigateTo = (page: Page) => {
    setCurrentPage(page);
    setIsMobileMenuOpen(false);
  };

  const getPageTitle = () => {
    switch (currentPage) {
      case "dashboard":
        return "Dashboard";
      case "history":
        return "History";
      case "about":
        return "About";
      case "account":
        return "Account";
      default:
        return "Dashboard";
    }
  };

  return (
    <div className="min-h-screen bg-[#E8F3F1]">
      <div className="flex h-screen">
        {/* Desktop Sidebar Navigation */}
        <aside className="hidden md:flex w-24 bg-white shadow-sm flex-col items-center py-8 space-y-8">
          {/* Navigation Icons */}
          <nav className="flex-1 flex flex-col items-center space-y-6">
            <button
              onClick={() => navigateTo("dashboard")}
              className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${
                currentPage === "dashboard"
                  ? "bg-teal-500 text-white shadow-lg shadow-teal-200"
                  : "text-gray-400 hover:bg-gray-100"
              }`}
              title="Dashboard"
            >
              <Home className="w-6 h-6" />
            </button>

            <button
              onClick={() => navigateTo("history")}
              className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${
                currentPage === "history"
                  ? "bg-teal-500 text-white shadow-lg shadow-teal-200"
                  : "text-gray-400 hover:bg-gray-100"
              }`}
              title="History"
            >
              <History className="w-6 h-6" />
            </button>

            <button
              onClick={() => navigateTo("account")}
              className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${
                currentPage === "account"
                  ? "bg-teal-500 text-white shadow-lg shadow-teal-200"
                  : "text-gray-400 hover:bg-gray-100"
              }`}
              title="Account"
            >
              <User className="w-6 h-6" />
            </button>

            <button
              onClick={() => navigateTo("about")}
              className={`w-14 h-14 rounded-2xl flex items-center justify-center transition-all ${
                currentPage === "about"
                  ? "bg-teal-500 text-white shadow-lg shadow-teal-200"
                  : "text-gray-400 hover:bg-gray-100"
              }`}
              title="About"
            >
              <Info className="w-6 h-6" />
            </button>
          </nav>

          {/* User Profile at Bottom */}
          <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center text-white font-bold shadow-md cursor-pointer">
            <img
              src="https://api.dicebear.com/7.x/avataaars/svg?seed=Sylwia"
              alt="User"
              className="w-12 h-12 rounded-full"
            />
          </div>
        </aside>

        {/* Mobile Menu Overlay */}
        {isMobileMenuOpen && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
            onClick={() => setIsMobileMenuOpen(false)}
          />
        )}

        {/* Mobile Sidebar Menu */}
        <aside
          className={`fixed top-0 left-0 h-full w-64 bg-white shadow-lg z-50 transform transition-transform duration-300 ease-in-out md:hidden ${
            isMobileMenuOpen ? "translate-x-0" : "-translate-x-full"
          }`}
        >
          <div className="flex flex-col h-full py-6">
            {/* Header */}
            <div className="flex items-center justify-between px-6 mb-8">
              <div className="flex items-center space-x-3">
                <div className="w-14 h-14 rounded-2xl flex items-center justify-center">
                  <img
                    src="/logo.png"
                    alt="MediTrack Logo"
                    className="w-full h-full object-contain"
                  />
                </div>
                <span className="text-xl font-bold text-gray-800">
                  MediTrack
                </span>
              </div>
              <button
                onClick={() => setIsMobileMenuOpen(false)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-600 hover:bg-gray-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Navigation */}
            <nav className="flex-1 px-4 space-y-2">
              <button
                onClick={() => navigateTo("dashboard")}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${
                  currentPage === "dashboard"
                    ? "bg-teal-500 text-white shadow-lg shadow-teal-200"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <Home className="w-5 h-5" />
                <span className="font-medium">Dashboard</span>
              </button>

              <button
                onClick={() => navigateTo("history")}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${
                  currentPage === "history"
                    ? "bg-teal-500 text-white shadow-lg shadow-teal-200"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <History className="w-5 h-5" />
                <span className="font-medium">History</span>
              </button>

              <button
                onClick={() => navigateTo("account")}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${
                  currentPage === "account"
                    ? "bg-teal-500 text-white shadow-lg shadow-teal-200"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <User className="w-5 h-5" />
                <span className="font-medium">Account</span>
              </button>

              <button
                onClick={() => navigateTo("about")}
                className={`w-full flex items-center space-x-3 px-4 py-3 rounded-xl transition-all ${
                  currentPage === "about"
                    ? "bg-teal-500 text-white shadow-lg shadow-teal-200"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <Info className="w-5 h-5" />
                <span className="font-medium">About</span>
              </button>
            </nav>

            {/* User Profile */}
            <div className="px-6 pt-6 border-t border-gray-100">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center text-white font-bold shadow-md">
                  <img
                    src="https://api.dicebear.com/7.x/avataaars/svg?seed=Sylwia"
                    alt="User"
                    className="w-10 h-10 rounded-full"
                  />
                </div>
                <div>
                  <p className="text-sm font-bold text-gray-800">{userName}</p>
                  <p className="text-xs text-gray-500">Patient</p>
                </div>
              </div>
            </div>
          </div>
        </aside>

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Top Header */}
          <header className="bg-white px-4 md:px-8 py-4 md:py-6 shadow-sm">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {/* Mobile Menu Button */}
                <button
                  onClick={() => setIsMobileMenuOpen(true)}
                  className="md:hidden w-12 h-12 rounded-xl bg-white flex items-center justify-center shadow-sm"
                >
                  <img
                    src="/logo.png"
                    alt="MediTrack Logo"
                    className="w-10 h-10 object-contain"
                  />
                </button>

                <div>
                  <h1 className="text-2xl md:text-3xl font-bold text-gray-800">
                    <span className="text-teal-500">MediTrack</span> -{" "}
                    {getGreeting()}, {userName}!
                  </h1>
                  <p className="text-gray-500 mt-1 text-xs md:text-sm">
                    {new Date().toLocaleDateString("en-US", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </p>
                </div>
              </div>

              {/* Current Page Indicator (Mobile) */}
              <div className="md:hidden">
                <span className="text-sm font-medium text-gray-600 bg-gray-100 px-3 py-1.5 rounded-lg">
                  {getPageTitle()}
                </span>
              </div>
            </div>
          </header>

          {/* Page Content */}
          <main className="flex-1 overflow-y-auto px-4 md:px-8 py-4 md:py-6">
            {renderPage()}
          </main>

          {/* Connection Status Footer */}
          <div className="bg-white px-4 md:px-8 py-3 border-t border-gray-100">
            <div className="flex items-center justify-between text-xs md:text-sm">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-gray-600">
                  Arduino UNO R4 WiFi Connected
                </span>
              </div>
              <span className="text-gray-400">MediTrack v1.0.0</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
