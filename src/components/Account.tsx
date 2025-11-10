import { useState, useEffect } from "react";
import {
  User,
  Mail,
  Phone,
  MapPin,
  Bell,
  Settings,
  Clock,
  Pill,
  Edit2,
  Save,
  X,
  Plus,
  Trash2,
  RefreshCw,
  AlertCircle,
} from "lucide-react";
import { firebaseService } from "../services/firebaseService";
import { Medicine, Schedule } from "../types";

interface UserProfile {
  fullName: string;
  email: string;
  phone: string;
  location: string;
}

interface NotificationSettings {
  medicineReminders: boolean;
  alertNotifications: boolean;
  dailySummary: boolean;
}

function Account() {
  const [profile, setProfile] = useState<UserProfile>({
    fullName: "Sylwia",
    email: "sylwia@email.com",
    phone: "+63 (917) 123-4567",
    location: "Quezon City, Metro Manila, PH",
  });
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileNotification, setProfileNotification] = useState("");

  const [notifications, setNotifications] = useState<NotificationSettings>({
    medicineReminders: true,
    alertNotifications: true,
    dailySummary: false,
  });

  // Medicine management
  const [medicines, setMedicines] = useState<Record<string, Medicine | null>>({
    slot_0: null,
    slot_1: null,
    slot_2: null,
  });
  const [editingSlot, setEditingSlot] = useState<string | null>(null);
  const [tempMedicine, setTempMedicine] = useState<Medicine | null>(null);
  const [scheduleNotification, setScheduleNotification] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);

  // Load profile from localStorage
  useEffect(() => {
    try {
      const storedProfile = localStorage.getItem("userProfile");
      if (storedProfile) {
        setProfile(JSON.parse(storedProfile));
      }
      const storedNotifications = localStorage.getItem("notificationSettings");
      if (storedNotifications) {
        setNotifications(JSON.parse(storedNotifications));
      }
    } catch (error) {
      console.error("Error loading profile:", error);
    }
  }, []);

  // Load medicines from Firebase
  useEffect(() => {
    const loadMedicines = async () => {
      try {
        const data = await firebaseService.getMedicines();
        setMedicines(data);
        console.log("Loaded medicines from Firebase:", data);
      } catch (error) {
        console.error("Error loading medicines from Firebase:", error);
      }
    };
    loadMedicines();

    // Listen to real-time changes
    const unsubscribe = firebaseService.onMedicinesChange((data) => {
      setMedicines(data);
      console.log("Medicines updated from Firebase:", data);
    });

    return () => unsubscribe();
  }, []);

  // Profile Management
  const handleProfileChange = (field: keyof UserProfile, value: string) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  };

  const saveProfile = () => {
    localStorage.setItem("userProfile", JSON.stringify(profile));
    setIsEditingProfile(false);
    setProfileNotification("Profile updated successfully!");
    setTimeout(() => setProfileNotification(""), 3000);
  };

  const cancelProfileEdit = () => {
    const storedProfile = localStorage.getItem("userProfile");
    if (storedProfile) {
      setProfile(JSON.parse(storedProfile));
    }
    setIsEditingProfile(false);
  };

  // Notification Settings
  const toggleNotification = (setting: keyof NotificationSettings) => {
    setNotifications((prev) => {
      const updated = { ...prev, [setting]: !prev[setting] };
      localStorage.setItem("notificationSettings", JSON.stringify(updated));
      return updated;
    });
  };

  // Medicine Management
  const getAvailableSlot = (): string | null => {
    if (medicines.slot_0 === null) return "slot_0";
    if (medicines.slot_1 === null) return "slot_1";
    if (medicines.slot_2 === null) return "slot_2";
    return null;
  };

  const getServoIndexFromSlot = (slotId: string): number => {
    if (slotId === "slot_0") return 0;
    if (slotId === "slot_1") return 1;
    return 2;
  };

  const addNewMedicine = () => {
    const availableSlot = getAvailableSlot();
    if (!availableSlot) {
      setScheduleNotification(
        "⚠️ Maximum 3 medicines allowed (hardware limit)"
      );
      setTimeout(() => setScheduleNotification(""), 4000);
      return;
    }

    const newMedicine: Medicine = {
      id: availableSlot,
      name: "New Medicine",
      dosage: "0mg",
      servoIndex: getServoIndexFromSlot(availableSlot),
      schedules: [
        {
          id: `s${Date.now()}`,
          time: "08:00",
          dispensed: false,
          taken: false,
          alert: false,
        },
      ],
    };

    setTempMedicine(newMedicine);
    setEditingSlot(availableSlot);
  };

  const editMedicine = (slotId: string) => {
    const medicine = medicines[slotId];
    if (medicine) {
      setTempMedicine({ ...medicine });
      setEditingSlot(slotId);
    }
  };

  const updateMedicineName = (value: string) => {
    if (tempMedicine) {
      setTempMedicine({ ...tempMedicine, name: value });
    }
  };

  const updateMedicineDosage = (value: string) => {
    if (tempMedicine) {
      setTempMedicine({ ...tempMedicine, dosage: value });
    }
  };

  const addSchedule = () => {
    if (tempMedicine) {
      const newSchedule: Schedule = {
        id: `s${Date.now()}`,
        time: "08:00",
        dispensed: false,
        taken: false,
        alert: false,
      };
      setTempMedicine({
        ...tempMedicine,
        schedules: [...tempMedicine.schedules, newSchedule],
      });
    }
  };

  const updateScheduleTime = (scheduleId: string, time: string) => {
    if (tempMedicine) {
      setTempMedicine({
        ...tempMedicine,
        schedules: tempMedicine.schedules.map((s) =>
          s.id === scheduleId ? { ...s, time } : s
        ),
      });
    }
  };

  const deleteSchedule = (scheduleId: string) => {
    if (tempMedicine && tempMedicine.schedules.length > 1) {
      setTempMedicine({
        ...tempMedicine,
        schedules: tempMedicine.schedules.filter((s) => s.id !== scheduleId),
      });
    } else {
      alert("Medicine must have at least one schedule!");
    }
  };

  const saveMedicine = async () => {
    if (!tempMedicine || !editingSlot) return;

    try {
      await firebaseService.saveMedicine(editingSlot, tempMedicine);
      setScheduleNotification("✓ Medicine saved successfully!");
      setTimeout(() => setScheduleNotification(""), 3000);
      setEditingSlot(null);
      setTempMedicine(null);
    } catch (error) {
      console.error("Error saving medicine:", error);
      setScheduleNotification("❌ Error saving medicine");
      setTimeout(() => setScheduleNotification(""), 3000);
    }
  };

  const deleteMedicine = async (slotId: string) => {
    if (confirm("Are you sure you want to delete this medicine?")) {
      try {
        await firebaseService.deleteMedicine(slotId);
        setScheduleNotification("✓ Medicine deleted successfully!");
        setTimeout(() => setScheduleNotification(""), 3000);
      } catch (error) {
        console.error("Error deleting medicine:", error);
        setScheduleNotification("❌ Error deleting medicine");
        setTimeout(() => setScheduleNotification(""), 3000);
      }
    }
  };

  const cancelMedicineEdit = () => {
    setEditingSlot(null);
    setTempMedicine(null);
  };

  const syncWithArduino = async () => {
    setIsSyncing(true);
    try {
      await firebaseService.sendSyncCommand();
      setScheduleNotification("🔄 Sync command sent to Arduino!");
      setTimeout(() => {
        setScheduleNotification("");
        setIsSyncing(false);
      }, 3000);
    } catch (error) {
      console.error("Error syncing:", error);
      setScheduleNotification("❌ Sync failed");
      setTimeout(() => {
        setScheduleNotification("");
        setIsSyncing(false);
      }, 3000);
    }
  };

  const restartDevice = async () => {
    if (confirm("Are you sure you want to restart the Arduino device?")) {
      try {
        const response = await fetch(
          "https://meditrack-24ee5-default-rtdb.asia-southeast1.firebasedatabase.app/device_control.json",
          {
            method: "PUT",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              command: "restart",
              timestamp: Math.floor(Date.now() / 1000),
            }),
          }
        );

        if (response.ok) {
          setScheduleNotification("🔄 Restart command sent to device!");
          setTimeout(() => setScheduleNotification(""), 3000);
        } else {
          alert("Failed to send restart command");
        }
      } catch (error) {
        console.error("Error restarting device:", error);
        alert("Failed to send restart command");
      }
    }
  };

  const getInitials = () => {
    return profile.fullName
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getUsedSlots = () => {
    return Object.values(medicines).filter((m) => m !== null).length;
  };

  return (
    <div className="space-y-5">
      {/* Success Notifications */}
      {profileNotification && (
        <div className="bg-teal-500 text-white px-5 py-4 rounded-2xl shadow-lg flex items-center space-x-3">
          <Bell className="w-5 h-5" />
          <span className="font-medium">{profileNotification}</span>
        </div>
      )}

      {scheduleNotification && (
        <div className="bg-teal-500 text-white px-5 py-4 rounded-2xl shadow-lg flex items-center space-x-3">
          <Bell className="w-5 h-5" />
          <span className="font-medium">{scheduleNotification}</span>
        </div>
      )}

      {/* Header */}
      <div className="bg-white rounded-3xl shadow-sm p-6 border border-gray-100">
        <h2 className="text-2xl font-bold text-gray-800">Account Settings</h2>
        <p className="text-gray-500 mt-1 text-sm">
          Manage your profile and preferences
        </p>
      </div>

      {/* Profile Information */}
      <div className="bg-white rounded-3xl shadow-sm p-6 border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-400 rounded-2xl flex items-center justify-center shadow-sm">
              <User className="w-6 h-6 text-white" />
            </div>
            <h3 className="text-xl font-bold text-gray-800">
              Profile Information
            </h3>
          </div>
          {!isEditingProfile ? (
            <button
              onClick={() => setIsEditingProfile(true)}
              className="flex items-center space-x-2 px-4 py-2.5 bg-teal-500 text-white rounded-xl hover:bg-teal-600 transition-colors shadow-lg shadow-teal-200 text-sm font-medium"
            >
              <Edit2 className="w-4 h-4" />
              <span>Edit Profile</span>
            </button>
          ) : (
            <div className="flex space-x-2">
              <button
                onClick={saveProfile}
                className="flex items-center space-x-2 px-4 py-2.5 bg-teal-500 text-white rounded-xl hover:bg-teal-600 transition-colors shadow-lg shadow-teal-200 text-sm font-medium"
              >
                <Save className="w-4 h-4" />
                <span>Save</span>
              </button>
              <button
                onClick={cancelProfileEdit}
                className="flex items-center space-x-2 px-4 py-2.5 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors text-sm font-medium"
              >
                <X className="w-4 h-4" />
                <span>Cancel</span>
              </button>
            </div>
          )}
        </div>

        <div className="flex items-center space-x-6 mb-6">
          <div className="w-24 h-24 bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center text-white text-3xl font-bold shadow-md">
            {getInitials()}
          </div>
          <div>
            <h4 className="text-2xl font-bold text-gray-800">
              {profile.fullName}
            </h4>
            <p className="text-gray-600">Patient ID: #MT-2025-001</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Full Name
            </label>
            <input
              type="text"
              value={profile.fullName}
              onChange={(e) => handleProfileChange("fullName", e.target.value)}
              disabled={!isEditingProfile}
              className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-400 disabled:bg-gray-50 disabled:text-gray-600 text-sm"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <div className="relative">
              <Mail className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 transform -translate-y-1/2 pointer-events-none" />
              <input
                type="email"
                value={profile.email}
                onChange={(e) => handleProfileChange("email", e.target.value)}
                disabled={!isEditingProfile}
                className="w-full pl-11 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-400 disabled:bg-gray-50 disabled:text-gray-600 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number
            </label>
            <div className="relative">
              <Phone className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 transform -translate-y-1/2 pointer-events-none" />
              <input
                type="tel"
                value={profile.phone}
                onChange={(e) => handleProfileChange("phone", e.target.value)}
                disabled={!isEditingProfile}
                className="w-full pl-11 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-400 disabled:bg-gray-50 disabled:text-gray-600 text-sm"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Location
            </label>
            <div className="relative">
              <MapPin className="w-5 h-5 text-gray-400 absolute left-4 top-1/2 transform -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={profile.location}
                onChange={(e) =>
                  handleProfileChange("location", e.target.value)
                }
                disabled={!isEditingProfile}
                className="w-full pl-11 pr-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-400 disabled:bg-gray-50 disabled:text-gray-600 text-sm"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Notification Settings */}
      <div className="bg-white rounded-3xl shadow-sm p-6 border border-gray-100">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-12 h-12 bg-gradient-to-br from-teal-50 to-teal-100 rounded-2xl flex items-center justify-center shadow-sm">
            <Bell className="w-6 h-6 text-teal-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-800">
            Notification Preferences
          </h3>
        </div>

        <div className="space-y-3">
          <div className="flex items-center justify-between p-4 border-2 border-gray-100 rounded-2xl hover:border-gray-200 transition-colors">
            <div className="flex-1">
              <h4 className="font-bold text-gray-800 text-base">
                Medicine Reminders
              </h4>
              <p className="text-sm text-gray-600">
                Get notified when it's time to take medicine
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer flex-shrink-0 ml-4">
              <input
                type="checkbox"
                checked={notifications.medicineReminders}
                onChange={() => toggleNotification("medicineReminders")}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-500"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-4 border-2 border-gray-100 rounded-2xl hover:border-gray-200 transition-colors">
            <div className="flex-1">
              <h4 className="font-bold text-gray-800 text-base">
                Alert Notifications
              </h4>
              <p className="text-sm text-gray-600">
                Get alerted when medicine is not taken
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer flex-shrink-0 ml-4">
              <input
                type="checkbox"
                checked={notifications.alertNotifications}
                onChange={() => toggleNotification("alertNotifications")}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-500"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-4 border-2 border-gray-100 rounded-2xl hover:border-gray-200 transition-colors">
            <div className="flex-1">
              <h4 className="font-bold text-gray-800 text-base">
                Daily Summary
              </h4>
              <p className="text-sm text-gray-600">
                Receive daily adherence reports
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer flex-shrink-0 ml-4">
              <input
                type="checkbox"
                checked={notifications.dailySummary}
                onChange={() => toggleNotification("dailySummary")}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-teal-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-teal-500"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Device Settings */}
      <div className="bg-white rounded-3xl shadow-sm p-6 border border-gray-100">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-12 h-12 bg-gradient-to-br from-purple-50 to-purple-100 rounded-2xl flex items-center justify-center shadow-sm">
            <Settings className="w-6 h-6 text-purple-600" />
          </div>
          <h3 className="text-xl font-bold text-gray-800">Device Settings</h3>
        </div>

        <div className="p-5 border-2 border-gray-100 rounded-2xl">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-bold text-gray-800 text-base">
              Arduino UNO R4 WiFi
            </h4>
            <span className="px-3 py-1.5 bg-teal-100 text-teal-700 text-xs font-semibold rounded-full">
              Connected
            </span>
          </div>
          <p className="text-sm text-gray-600 mb-4">Last synced: Just now</p>
          <div className="grid grid-cols-2 gap-4 text-sm mb-4">
            <div>
              <p className="text-gray-500 text-xs mb-1">Device ID</p>
              <p className="font-semibold text-gray-800">ARD-R4-001</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs mb-1">Firmware</p>
              <p className="font-semibold text-gray-800">v1.0.0</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs mb-1">Medicines Loaded</p>
              <p className="font-semibold text-gray-800">
                {getUsedSlots()}/3 slots
              </p>
            </div>
            <div>
              <p className="text-gray-500 text-xs mb-1">Uptime</p>
              <p className="font-semibold text-gray-800">24h 15m</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={restartDevice}
              className="px-4 py-2.5 bg-purple-500 text-white rounded-xl hover:bg-purple-600 transition-colors shadow-lg shadow-purple-200 text-sm font-medium"
            >
              Restart Device
            </button>
            <button
              onClick={syncWithArduino}
              disabled={isSyncing}
              className="flex items-center justify-center space-x-2 px-4 py-2.5 bg-teal-500 text-white rounded-xl hover:bg-teal-600 transition-colors shadow-lg shadow-teal-200 text-sm font-medium disabled:opacity-50"
            >
              <RefreshCw
                className={`w-4 h-4 ${isSyncing ? "animate-spin" : ""}`}
              />
              <span>{isSyncing ? "Syncing..." : "Sync Now"}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Medicine Schedule Editor */}
      <div className="bg-white rounded-3xl shadow-sm p-6 border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-teal-50 to-teal-100 rounded-2xl flex items-center justify-center shadow-sm">
              <Clock className="w-6 h-6 text-teal-600" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-gray-800">
                Medicine Schedule Editor
              </h3>
              <p className="text-xs text-gray-500">
                {getUsedSlots()}/3 medicine slots used
              </p>
            </div>
          </div>
          <button
            onClick={addNewMedicine}
            disabled={getUsedSlots() >= 3}
            className="flex items-center space-x-2 px-4 py-2.5 bg-teal-500 text-white rounded-xl hover:bg-teal-600 transition-colors shadow-lg shadow-teal-200 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
            <span>Add Medicine</span>
          </button>
        </div>

        {getUsedSlots() >= 3 && (
          <div className="mb-4 p-4 bg-amber-50 border border-amber-200 rounded-xl flex items-start space-x-3">
            <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-semibold text-amber-800">
                Maximum capacity reached
              </p>
              <p className="text-xs text-amber-700 mt-1">
                Your Arduino has 3 medicine slots (6 servos). Delete a medicine
                to add a new one.
              </p>
            </div>
          </div>
        )}

        <div className="space-y-3">
          {["slot_0", "slot_1", "slot_2"].map((slotId) => {
            const medicine = medicines[slotId as keyof typeof medicines];
            const isEditing = editingSlot === slotId;

            // FIXED: Show editing form if this slot is being edited, regardless of whether it has existing data
            if (isEditing && tempMedicine) {
              return (
                <div
                  key={slotId}
                  className="p-5 border-2 border-teal-200 rounded-2xl bg-teal-50"
                >
                  <div className="space-y-4">
                    {/* Medicine Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Medicine Name
                        </label>
                        <input
                          type="text"
                          value={tempMedicine.name}
                          onChange={(e) => updateMedicineName(e.target.value)}
                          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-400 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Dosage
                        </label>
                        <input
                          type="text"
                          value={tempMedicine.dosage}
                          onChange={(e) => updateMedicineDosage(e.target.value)}
                          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-400 text-sm"
                        />
                      </div>
                    </div>

                    {/* Schedules */}
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <label className="text-sm font-medium text-gray-700">
                          Daily Schedules ({tempMedicine.schedules.length})
                        </label>
                        <button
                          onClick={addSchedule}
                          className="flex items-center space-x-1 px-3 py-1.5 bg-white text-teal-600 border border-teal-200 rounded-lg hover:bg-teal-50 transition-colors text-xs font-medium"
                        >
                          <Plus className="w-3 h-3" />
                          <span>Add Time</span>
                        </button>
                      </div>

                      <div className="space-y-2">
                        {tempMedicine.schedules.map((schedule, index) => (
                          <div
                            key={schedule.id}
                            className="flex items-center space-x-2"
                          >
                            <span className="text-xs text-gray-500 w-8">
                              #{index + 1}
                            </span>
                            <input
                              type="time"
                              value={schedule.time}
                              onChange={(e) =>
                                updateScheduleTime(schedule.id, e.target.value)
                              }
                              className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-400 text-sm"
                            />
                            <button
                              onClick={() => deleteSchedule(schedule.id)}
                              disabled={tempMedicine.schedules.length === 1}
                              className="p-2 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex space-x-2 pt-2">
                      <button
                        onClick={saveMedicine}
                        className="flex items-center space-x-2 px-4 py-2.5 bg-teal-500 text-white rounded-xl hover:bg-teal-600 transition-colors shadow-lg shadow-teal-200 text-sm font-medium"
                      >
                        <Save className="w-4 h-4" />
                        <span>Save</span>
                      </button>
                      <button
                        onClick={cancelMedicineEdit}
                        className="flex items-center space-x-2 px-4 py-2.5 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors text-sm font-medium"
                      >
                        <X className="w-4 h-4" />
                        <span>Cancel</span>
                      </button>
                      {medicine && (
                        <button
                          onClick={() => deleteMedicine(slotId)}
                          className="flex items-center space-x-2 px-4 py-2.5 bg-rose-500 text-white rounded-xl hover:bg-rose-600 transition-colors shadow-lg shadow-rose-200 text-sm font-medium ml-auto"
                        >
                          <Trash2 className="w-4 h-4" />
                          <span>Delete</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            }

            // Display mode - show saved medicine
            if (medicine && !isEditing) {
              return (
                <div
                  key={slotId}
                  className="p-5 border-2 border-gray-100 rounded-2xl hover:border-gray-200 transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center">
                        <Pill className="w-6 h-6 text-teal-600" />
                      </div>
                      <div>
                        <h4 className="font-bold text-gray-800 text-base">
                          {medicine.name}
                        </h4>
                        <p className="text-sm text-gray-600">
                          {medicine.dosage} • {medicine.schedules.length}{" "}
                          {medicine.schedules.length === 1 ? "time" : "times"}{" "}
                          per day
                        </p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {medicine.schedules.map((s) => (
                            <span
                              key={s.id}
                              className="px-2 py-1 bg-teal-50 text-teal-700 text-xs font-medium rounded-lg"
                            >
                              {s.time}
                            </span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <button
                      onClick={() => editMedicine(slotId)}
                      className="flex items-center space-x-2 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors text-sm font-medium"
                    >
                      <Edit2 className="w-4 h-4" />
                      <span>Edit</span>
                    </button>
                  </div>
                </div>
              );
            }

            // Empty slot - only show if not editing
            if (!medicine && !isEditing) {
              return (
                <div
                  key={slotId}
                  className="p-5 border-2 border-dashed border-gray-200 rounded-2xl text-center"
                >
                  <p className="text-gray-400 text-sm">
                    Slot {slotId.split("_")[1]} - Empty
                  </p>
                </div>
              );
            }

            return null;
          })}
        </div>
      </div>
    </div>
  );
}

export default Account;
