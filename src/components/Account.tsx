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
} from "lucide-react";

interface MedicineSchedule {
  id: string;
  name: string;
  dosage: string;
  time: string;
  taken: boolean;
  dispensed: boolean;
  alert: boolean;
}

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
  // User Profile State
  const [profile, setProfile] = useState<UserProfile>({
    fullName: "Sylwia",
    email: "sylwia@email.com",
    phone: "+63 (917) 123-4567",
    location: "Quezon City, Metro Manila, PH",
  });
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileNotification, setProfileNotification] = useState("");

  // Notification Settings State
  const [notifications, setNotifications] = useState<NotificationSettings>({
    medicineReminders: true,
    alertNotifications: true,
    dailySummary: false,
  });

  // Medicine Schedule State
  const [medicines, setMedicines] = useState<MedicineSchedule[]>([]);
  const [editingMedicine, setEditingMedicine] = useState<string | null>(null);
  const [scheduleNotification, setScheduleNotification] = useState("");

  // Load profile from localStorage on mount
  useEffect(() => {
    try {
      const storedProfile = localStorage.getItem("userProfile");
      if (storedProfile) {
        setProfile(JSON.parse(storedProfile));
        console.log(
          "Loaded profile from localStorage:",
          JSON.parse(storedProfile)
        );
      } else {
        // Save default profile to localStorage
        const defaultProfile = {
          fullName: "Sylwia",
          email: "sylwia@email.com",
          phone: "+63 (917) 123-4567",
          location: "Quezon City, Metro Manila, PH",
        };
        localStorage.setItem("userProfile", JSON.stringify(defaultProfile));
      }

      const storedNotifications = localStorage.getItem("notificationSettings");
      if (storedNotifications) {
        setNotifications(JSON.parse(storedNotifications));
      }

      const storedMedicines = localStorage.getItem("medicineSchedules");
      if (storedMedicines) {
        setMedicines(JSON.parse(storedMedicines));
      }
    } catch (error) {
      console.error("Error loading data:", error);
    }
  }, []);

  // Profile Management
  const handleProfileChange = (field: keyof UserProfile, value: string) => {
    setProfile((prev) => ({ ...prev, [field]: value }));
  };

  const saveProfile = () => {
    // Save to localStorage
    localStorage.setItem("userProfile", JSON.stringify(profile));
    console.log("Profile saved to localStorage:", profile);

    setIsEditingProfile(false);
    setProfileNotification("Profile updated successfully!");
    setTimeout(() => setProfileNotification(""), 3000);
  };

  const cancelProfileEdit = () => {
    // Reload from localStorage
    const storedProfile = localStorage.getItem("userProfile");
    if (storedProfile) {
      setProfile(JSON.parse(storedProfile));
    }
    setIsEditingProfile(false);
  };

  // Notification Settings Management
  const toggleNotification = (setting: keyof NotificationSettings) => {
    setNotifications((prev) => {
      const updated = { ...prev, [setting]: !prev[setting] };
      localStorage.setItem("notificationSettings", JSON.stringify(updated));
      return updated;
    });
  };

  // Medicine Schedule Management
  const addNewMedicine = () => {
    const newMedicine: MedicineSchedule = {
      id: Date.now().toString(),
      name: "New Medicine",
      dosage: "0mg",
      time: "08:00",
      taken: false,
      dispensed: false,
      alert: false,
    };
    setMedicines((prev) => {
      const updated = [...prev, newMedicine];
      localStorage.setItem("medicineSchedules", JSON.stringify(updated));
      return updated;
    });
    setEditingMedicine(newMedicine.id);
  };

  const updateMedicine = (id: string, field: string, value: string) => {
    setMedicines((prev) =>
      prev.map((med) => (med.id === id ? { ...med, [field]: value } : med))
    );
  };

  const saveMedicine = () => {
    // Save to localStorage
    localStorage.setItem("medicineSchedules", JSON.stringify(medicines));
    console.log("Medicines saved to localStorage:", medicines);

    setEditingMedicine(null);
    setScheduleNotification("Medicine schedule updated!");
    setTimeout(() => setScheduleNotification(""), 3000);
  };

  const deleteMedicine = (id: string) => {
    if (confirm("Are you sure you want to delete this medicine?")) {
      setMedicines((prev) => {
        const updated = prev.filter((med) => med.id !== id);
        localStorage.setItem("medicineSchedules", JSON.stringify(updated));
        return updated;
      });
      setScheduleNotification("Medicine deleted successfully!");
      setTimeout(() => setScheduleNotification(""), 3000);
    }
  };

  const cancelMedicineEdit = () => {
    // Reload from localStorage
    const storedMedicines = localStorage.getItem("medicineSchedules");
    if (storedMedicines) {
      setMedicines(JSON.parse(storedMedicines));
    }
    setEditingMedicine(null);
  };

  // Device Management
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
          setScheduleNotification("Restart command sent to device!");
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
              <p className="text-gray-500 text-xs mb-1">WiFi Signal</p>
              <p className="font-semibold text-gray-800">Strong (-45 dBm)</p>
            </div>
            <div>
              <p className="text-gray-500 text-xs mb-1">Uptime</p>
              <p className="font-semibold text-gray-800">24h 15m</p>
            </div>
          </div>
          <button
            onClick={restartDevice}
            className="w-full px-4 py-2.5 bg-purple-500 text-white rounded-xl hover:bg-purple-600 transition-colors shadow-lg shadow-purple-200 text-sm font-medium"
          >
            Restart Device
          </button>
        </div>
      </div>

      {/* Medicine Schedule Editor */}
      <div className="bg-white rounded-3xl shadow-sm p-6 border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-12 h-12 bg-gradient-to-br from-teal-50 to-teal-100 rounded-2xl flex items-center justify-center shadow-sm">
              <Clock className="w-6 h-6 text-teal-600" />
            </div>
            <h3 className="text-xl font-bold text-gray-800">
              Medicine Schedule Editor
            </h3>
          </div>
          <button
            onClick={addNewMedicine}
            className="flex items-center space-x-2 px-4 py-2.5 bg-teal-500 text-white rounded-xl hover:bg-teal-600 transition-colors shadow-lg shadow-teal-200 text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            <span>Add Medicine</span>
          </button>
        </div>

        <div className="space-y-3">
          {medicines.length === 0 ? (
            <div className="text-center py-12">
              <Pill className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <p className="text-gray-500 font-medium">
                No medicines scheduled
              </p>
              <p className="text-sm text-gray-400 mt-2">
                Click "Add Medicine" to create your first schedule
              </p>
            </div>
          ) : (
            medicines.map((medicine) => (
              <div
                key={medicine.id}
                className="p-5 border-2 border-gray-100 rounded-2xl hover:border-gray-200 transition-colors"
              >
                {editingMedicine === medicine.id ? (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Medicine Name
                        </label>
                        <input
                          type="text"
                          value={medicine.name}
                          onChange={(e) =>
                            updateMedicine(medicine.id, "name", e.target.value)
                          }
                          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-400 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Dosage
                        </label>
                        <input
                          type="text"
                          value={medicine.dosage}
                          onChange={(e) =>
                            updateMedicine(
                              medicine.id,
                              "dosage",
                              e.target.value
                            )
                          }
                          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-400 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Scheduled Time
                        </label>
                        <input
                          type="time"
                          value={medicine.time}
                          onChange={(e) =>
                            updateMedicine(medicine.id, "time", e.target.value)
                          }
                          className="w-full px-4 py-2.5 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-400 text-sm"
                        />
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <button
                        onClick={() => saveMedicine()}
                        className="flex items-center space-x-2 px-4 py-2.5 bg-teal-500 text-white rounded-xl hover:bg-teal-600 transition-colors shadow-lg shadow-teal-200 text-sm font-medium"
                      >
                        <Save className="w-4 h-4" />
                        <span>Save</span>
                      </button>
                      <button
                        onClick={() => cancelMedicineEdit()}
                        className="flex items-center space-x-2 px-4 py-2.5 bg-gray-200 text-gray-700 rounded-xl hover:bg-gray-300 transition-colors text-sm font-medium"
                      >
                        <X className="w-4 h-4" />
                        <span>Cancel</span>
                      </button>
                      <button
                        onClick={() => deleteMedicine(medicine.id)}
                        className="flex items-center space-x-2 px-4 py-2.5 bg-rose-500 text-white rounded-xl hover:bg-rose-600 transition-colors shadow-lg shadow-rose-200 text-sm font-medium ml-auto"
                      >
                        <Trash2 className="w-4 h-4" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                ) : (
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
                          {medicine.dosage} • {medicine.time}
                        </p>
                      </div>
                    </div>
                    <button
                      onClick={() => setEditingMedicine(medicine.id)}
                      className="flex items-center space-x-2 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-xl hover:bg-gray-200 transition-colors text-sm font-medium"
                    >
                      <Edit2 className="w-4 h-4" />
                      <span>Edit</span>
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default Account;
