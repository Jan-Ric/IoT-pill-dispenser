import { useEffect, useState } from "react";
import {
  Clock,
  CheckCircle,
  XCircle,
  Calendar,
  Pill,
  TrendingUp,
  Filter,
  Download,
  Trash2,
} from "lucide-react";
import * as XLSX from "xlsx";
import { firebaseService } from "../services/firebaseService";
import type { HistoryRecord } from "../services/firebaseService";

function History() {
  const [history, setHistory] = useState<HistoryRecord[]>([]);
  const [filter, setFilter] = useState<"all" | "taken" | "missed">("all");
  const [dateFilter, setDateFilter] = useState<string>("all");

  // Load history from Firebase and listen to real-time updates
  useEffect(() => {
    // Listen to history changes in real-time
    const unsubscribe = firebaseService.onHistoryChange((historyData) => {
      setHistory(historyData);
      console.log("History updated from Firebase:", historyData);
    });

    return () => unsubscribe();
  }, []);

  const clearHistory = async () => {
    if (confirm("Are you sure you want to clear all history?")) {
      try {
        await firebaseService.clearHistory();
        setHistory([]);
        console.log("History cleared from Firebase");
      } catch (error) {
        console.error("Error clearing history:", error);
        alert("Failed to clear history");
      }
    }
  };

  const exportHistory = () => {
    try {
      if (history.length === 0) {
        alert("No history to export");
        return;
      }

      // Prepare data for Excel
      const excelData = history.map((record) => ({
        "Medicine Name": record.name,
        Dosage: record.dosage,
        "Scheduled Time": record.scheduledTime,
        Date: record.date,
        "Actual Time": record.takenTime,
        Status: record.status === "taken" ? "Taken" : "Missed",
      }));

      // Create a new workbook
      const wb = XLSX.utils.book_new();

      // Convert data to worksheet
      const ws = XLSX.utils.json_to_sheet(excelData);

      // Set column widths
      const colWidths = [
        { wch: 20 }, // Medicine Name
        { wch: 12 }, // Dosage
        { wch: 15 }, // Scheduled Time
        { wch: 15 }, // Date
        { wch: 15 }, // Actual Time
        { wch: 10 }, // Status
      ];
      ws["!cols"] = colWidths;

      // Add worksheet to workbook
      XLSX.utils.book_append_sheet(wb, ws, "Medicine History");

      // Generate filename with current date
      const fileName = `MediTrack-History-${
        new Date().toISOString().split("T")[0]
      }.xlsx`;

      // Write the file
      XLSX.writeFile(wb, fileName);

      console.log("History exported to Excel successfully");
    } catch (error) {
      console.error("Error exporting history:", error);
      alert("Failed to export history to Excel");
    }
  };

  const getFilteredHistory = () => {
    if (!Array.isArray(history)) return [];

    return history.filter((record) => {
      const matchesStatus = filter === "all" || record.status === filter;
      const matchesDate =
        dateFilter === "all" ||
        record.date === dateFilter ||
        (dateFilter === "today" &&
          record.date === new Date().toLocaleDateString("en-US"));
      return matchesStatus && matchesDate;
    });
  };

  const getStats = () => {
    if (!Array.isArray(history)) {
      return { total: 0, taken: 0, missed: 0, adherenceRate: 0 };
    }

    const total = history.length;
    const taken = history.filter((h) => h.status === "taken").length;
    const missed = history.filter((h) => h.status === "missed").length;
    const adherenceRate = total > 0 ? Math.round((taken / total) * 100) : 0;

    return { total, taken, missed, adherenceRate };
  };

  const getUniqueDates = () => {
    if (!Array.isArray(history)) return ["all", "today"];

    const dates = history.map((h) => h.date);
    return ["all", "today", ...Array.from(new Set(dates))];
  };

  const getSortedHistory = () => {
    const filtered = getFilteredHistory();

    try {
      return filtered.sort((a, b) => {
        return b.timestamp - a.timestamp;
      });
    } catch (error) {
      console.error("Error sorting history:", error);
      return filtered;
    }
  };

  const getMedicineBreakdown = () => {
    if (!Array.isArray(history) || history.length === 0) return [];

    const breakdown: Record<
      string,
      { name: string; total: number; taken: number; missed: number }
    > = {};

    history.forEach((record) => {
      if (!breakdown[record.name]) {
        breakdown[record.name] = {
          name: record.name,
          total: 0,
          taken: 0,
          missed: 0,
        };
      }
      breakdown[record.name].total++;
      if (record.status === "taken") {
        breakdown[record.name].taken++;
      } else {
        breakdown[record.name].missed++;
      }
    });

    return Object.values(breakdown);
  };

  const filteredHistory = getFilteredHistory();
  const sortedHistory = getSortedHistory();
  const stats = getStats();
  const uniqueDates = getUniqueDates();
  const medicineBreakdown = getMedicineBreakdown();

  return (
    <div className="space-y-5">
      {/* Header Card */}
      <div className="bg-white rounded-3xl shadow-sm p-6 border border-gray-100">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-800">
              Medicine History
            </h2>
            <p className="text-gray-500 mt-1 text-sm">
              Complete record of all medicine activities
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={exportHistory}
              disabled={history.length === 0}
              className="flex items-center space-x-2 px-4 py-2.5 bg-teal-500 text-white rounded-xl hover:bg-teal-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-teal-200 text-sm font-medium"
            >
              <Download className="w-4 h-4" />
              <span>Export to Excel</span>
            </button>
            <button
              onClick={clearHistory}
              disabled={history.length === 0}
              className="flex items-center space-x-2 px-4 py-2.5 bg-rose-500 text-white rounded-xl hover:bg-rose-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-rose-200 text-sm font-medium"
            >
              <Trash2 className="w-4 h-4" />
              <span>Clear</span>
            </button>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 rounded-3xl p-6 border border-blue-200">
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm">
              <Pill className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <p className="text-gray-600 text-sm font-medium mb-1">
            Total Records
          </p>
          <p className="text-4xl font-bold text-gray-800">{stats.total}</p>
          <p className="text-xs text-gray-500 mt-2">All medicine schedules</p>
        </div>

        <div className="bg-gradient-to-br from-teal-50 to-teal-100 rounded-3xl p-6 border border-teal-200">
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm">
              <CheckCircle className="w-6 h-6 text-teal-600" />
            </div>
          </div>
          <p className="text-gray-600 text-sm font-medium mb-1">Taken</p>
          <p className="text-4xl font-bold text-gray-800">{stats.taken}</p>
          <p className="text-xs text-gray-500 mt-2">Successfully completed</p>
        </div>

        <div className="bg-gradient-to-br from-rose-50 to-rose-100 rounded-3xl p-6 border border-rose-200">
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm">
              <XCircle className="w-6 h-6 text-rose-600" />
            </div>
          </div>
          <p className="text-gray-600 text-sm font-medium mb-1">Missed</p>
          <p className="text-4xl font-bold text-gray-800">{stats.missed}</p>
          <p className="text-xs text-gray-500 mt-2">Alerts triggered</p>
        </div>

        <div className="bg-gradient-to-br from-purple-50 to-purple-100 rounded-3xl p-6 border border-purple-200">
          <div className="flex items-center justify-between mb-3">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm">
              <TrendingUp className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <p className="text-gray-600 text-sm font-medium mb-1">
            Adherence Rate
          </p>
          <p className="text-4xl font-bold text-gray-800">
            {stats.adherenceRate}%
          </p>
          <p className="text-xs text-gray-500 mt-2">Overall compliance</p>
        </div>
      </div>

      {/* Medicine Breakdown */}
      {medicineBreakdown.length > 0 && (
        <div className="bg-white rounded-3xl shadow-sm p-6 border border-gray-100">
          <h3 className="text-xl font-bold text-gray-800 mb-4">
            Medicine Breakdown
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {medicineBreakdown.map((med) => {
              const rate =
                med.total > 0 ? Math.round((med.taken / med.total) * 100) : 0;
              return (
                <div
                  key={med.name}
                  className="p-4 border-2 border-gray-100 rounded-xl hover:border-gray-200 transition-all"
                >
                  <div className="flex items-center space-x-3 mb-3">
                    <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                      <Pill className="w-5 h-5 text-purple-600" />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-800 text-sm">
                        {med.name}
                      </h4>
                      <p className="text-xs text-gray-500">
                        {med.total} schedule{med.total !== 1 ? "s" : ""}
                      </p>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-teal-600 font-medium">✓ Taken</span>
                      <span className="font-bold text-gray-800">
                        {med.taken}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-rose-600 font-medium">
                        ✗ Missed
                      </span>
                      <span className="font-bold text-gray-800">
                        {med.missed}
                      </span>
                    </div>
                    <div className="pt-2 border-t border-gray-100">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-purple-600 font-semibold">
                          Rate
                        </span>
                        <span className="font-bold text-purple-800">
                          {rate}%
                        </span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2 mt-2">
                        <div
                          className="bg-purple-500 h-2 rounded-full transition-all"
                          style={{ width: `${rate}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Filters */}
      <div className="bg-white rounded-3xl shadow-sm p-5 border border-gray-100">
        <div className="flex items-center space-x-4 flex-wrap gap-2">
          <div className="flex items-center space-x-2">
            <Filter className="w-5 h-5 text-gray-500" />
            <span className="text-gray-700 font-medium text-sm">Filters:</span>
          </div>

          <select
            value={filter}
            onChange={(e) => setFilter(e.target.value as any)}
            className="px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-400 text-sm bg-gray-50"
          >
            <option value="all">All Status</option>
            <option value="taken">Taken Only</option>
            <option value="missed">Missed Only</option>
          </select>

          <select
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-4 py-2 border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-400 text-sm bg-gray-50"
          >
            {uniqueDates.map((date) => (
              <option key={date} value={date}>
                {date === "all"
                  ? "All Dates"
                  : date === "today"
                  ? "Today"
                  : date}
              </option>
            ))}
          </select>

          <span className="text-sm text-gray-500 ml-auto">
            Showing {filteredHistory.length} of {history.length} records
          </span>
        </div>
      </div>

      {/* Records List */}
      <div className="bg-white rounded-3xl shadow-sm p-6 border border-gray-100">
        <h3 className="text-xl font-bold text-gray-800 mb-5">
          Medicine Records
        </h3>

        {sortedHistory.length === 0 ? (
          <div className="text-center py-16">
            <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 font-medium">
              No history records found
            </p>
            <p className="text-sm text-gray-400 mt-2">
              {history.length === 0
                ? "Medicine activities will appear here once recorded"
                : "No records match your current filters"}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedHistory.map((record) => (
              <div
                key={record.id}
                className={`rounded-2xl p-5 transition-all border-2 ${
                  record.status === "taken"
                    ? "border-teal-200 bg-teal-50"
                    : "border-rose-200 bg-rose-50"
                }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div
                      className={`w-12 h-12 rounded-xl flex items-center justify-center ${
                        record.status === "taken"
                          ? "bg-teal-100"
                          : "bg-rose-100"
                      }`}
                    >
                      {record.status === "taken" ? (
                        <CheckCircle className="w-6 h-6 text-teal-600" />
                      ) : (
                        <XCircle className="w-6 h-6 text-rose-600" />
                      )}
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-800 text-base">
                        {record.name}
                      </h4>
                      <p className="text-sm text-gray-600">
                        Dosage: {record.dosage}
                      </p>
                      <div className="flex items-center space-x-4 mt-1">
                        <p className="text-xs text-gray-500 flex items-center space-x-1">
                          <Calendar className="w-3 h-3" />
                          <span>{record.date}</span>
                        </p>
                        <p className="text-xs text-gray-500 flex items-center space-x-1">
                          <Clock className="w-3 h-3" />
                          <span>Scheduled: {record.scheduledTime}</span>
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <span
                      className={`inline-block px-4 py-2 rounded-full text-sm font-semibold ${
                        record.status === "taken"
                          ? "bg-teal-200 text-teal-800"
                          : "bg-rose-200 text-rose-800"
                      }`}
                    >
                      {record.status === "taken" ? "✓ Taken" : "✗ Missed"}
                    </span>
                    <p className="text-sm text-gray-600 mt-2 font-medium">
                      {record.status === "taken" ? "Taken" : "Alert"} at:{" "}
                      {record.takenTime}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Summary Footer */}
      {history.length > 0 && (
        <div className="bg-purple-50 border border-purple-200 rounded-2xl p-5">
          <p className="text-sm text-purple-800">
            <strong>Total Adherence:</strong> You have taken{" "}
            <strong className="text-purple-900">{stats.taken}</strong> out of{" "}
            <strong className="text-purple-900">{stats.total}</strong> scheduled
            medicines ({stats.adherenceRate}% adherence rate)
          </p>
          {medicineBreakdown.length > 0 && (
            <p className="text-xs text-purple-700 mt-2">
              Tracking {medicineBreakdown.length} medicine
              {medicineBreakdown.length !== 1 ? "s" : ""} with multiple daily
              schedules
            </p>
          )}
        </div>
      )}
    </div>
  );
}

export default History;
