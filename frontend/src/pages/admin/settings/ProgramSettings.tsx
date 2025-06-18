import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Save,
  AlertCircle,
  CheckCircle,
  Settings as SettingsIcon,
  CalendarDays,
  Timer,
  ChevronLeft,
  ChevronRight,
  BookText,
  DollarSign,
  Lock,
} from "lucide-react";
import Card from "../../../components/ui/Card";
import Button from "../../../components/ui/Button";
import Input from "../../../components/ui/Input";
import Badge from "../../../components/ui/Badge";
import { useProgramStore } from "../../../stores/programStore";
import { WorkingDay, CustomDay } from "../../../types";
import { api } from "../../../api";
import LoadingScreen from "../../../components/ui/LoadingScreen";

interface ConfirmationModal {
  isOpen: boolean;
  date: string;
  currentStatus: "work" | "rest";
  newStatus: "work" | "rest";
}

const DAYS_OF_WEEK = [
  { id: "monday", label: "Monday", short: "Mon" },
  { id: "tuesday", label: "Tuesday", short: "Tue" },
  { id: "wednesday", label: "Wednesday", short: "Wed" },
  { id: "thursday", label: "Thursday", short: "Thu" },
  { id: "friday", label: "Friday", short: "Fri" },
  { id: "saturday", label: "Saturday", short: "Sat" },
  { id: "sunday", label: "Sunday", short: "Sun" },
];

const MONTHS = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const ProgramSettings: React.FC = () => {
  const { t } = useTranslation();
  const { program, fetchProgram, wasProgramFetched } = useProgramStore();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [error, setError] = useState<string>("");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [confirmationModal, setConfirmationModal] = useState<ConfirmationModal>(
    {
      isOpen: false,
      date: "",
      currentStatus: "work",
      newStatus: "work",
    }
  );

  // Financial config state
  const [financialConfig, setFinancialConfig] = useState({
    colporterPercentage: 50,
    leaderPercentage: 15,
    colporterCashAdvancePercentage: 20,
    leaderCashAdvancePercentage: 25,
  });

  // Working days state
  const [workingDays, setWorkingDays] = useState<WorkingDay[]>([]);
  const [customDays, setCustomDays] = useState<CustomDay[]>([]);

  // Load program data
  useEffect(() => {
    const loadProgramData = async () => {
      setIsLoading(true);
      try {
        !wasProgramFetched && await fetchProgram();
      } catch (error) {
        console.error("Error fetching program:", error);
        setError("Failed to load program data");
      } finally {
        setIsLoading(false);
      }
    };

    loadProgramData();
  }, [fetchProgram]);

  // Update local state when program data changes
  useEffect(() => {
    if (program) {

      // Update financial config
      if (program.financialConfig) {
        setFinancialConfig({
          colporterPercentage: parseFloat(
            program.financialConfig.colporter_percentage
          ),
          leaderPercentage: parseFloat(
            program.financialConfig.leader_percentage
          ),
          colporterCashAdvancePercentage: parseFloat(
            program.financialConfig.colporter_cash_advance_percentage
          ),
          leaderCashAdvancePercentage: parseFloat(
            program.financialConfig.leader_cash_advance_percentage
          ),
        });
      }

      // Update working days
      if (program.workingDays) {
        setWorkingDays(program.workingDays);
      }

      // Update custom days
      if (program.customDays) {
        setCustomDays(program.customDays);
      }
    }
  }, [program]);

  const getDayStatus = (date: Date): "work" | "rest" | "outside" => {
    if (!program) return "outside";

    const dateStr = date.toISOString().split("T")[0];
    const programStart = new Date(program.start_date);
    const programEnd = new Date(program.end_date);

    // Check if date is outside program period
    if (date < programStart || date > programEnd) {
      return "outside";
    }

    // Check custom overrides first
    const customDay = customDays.find((day) => {
      // Normalize the custom day date to YYYY-MM-DD
      const customDayStr = new Date(day.date).toISOString().split("T")[0];
      return customDayStr === dateStr;
    });

    if (customDay) {
      return customDay.is_working_day ? "work" : "rest";
    }

    // Check default schedule
    const dayName = date
      .toLocaleDateString("en-US", { weekday: "long" })
      .toLowerCase();
    const workingDay = workingDays.find((day) => day.day_of_week === dayName);
    return workingDay?.is_working_day ? "work" : "rest";
  };

  const handleDateClick = (date: Date) => {
    const dateStr = date.toISOString().split("T")[0];
    const currentStatus = getDayStatus(date);

    if (currentStatus === "outside") return;

    const newStatus = currentStatus === "work" ? "rest" : "work";

    setConfirmationModal({
      isOpen: true,
      date: dateStr,
      currentStatus,
      newStatus,
    });
  };

  const confirmDateChange = async () => {
    const { date, newStatus } = confirmationModal;

    try {
      setIsLoading(true);
      setError("");

      // Add custom day override
      await api.post(`/program/${program?.id}/custom-days`, {
        date,
        isWorkingDay: newStatus === "work",
      });

      // Update local state immediately for better UX
      setCustomDays((prev) => {
        const existingIndex = prev.findIndex((d) => {
          const customDayStr = new Date(d.date).toISOString().split("T")[0];
          return customDayStr === date;
        });
        
        if (existingIndex >= 0) {
          // Update existing custom day
          const updated = [...prev];
          updated[existingIndex] = {
            ...updated[existingIndex],
            is_working_day: newStatus === "work",
          };
          return updated;
        } else {
          // Add new custom day
          return [
            ...prev,
            {
              id: Date.now(), // Temporary ID until refreshed from server
              program_id: program?.id || 0,
              date,
              is_working_day: newStatus === "work",
            },
          ];
        }
      });

      // Refresh program data to get updated custom days
      await fetchProgram();

      setConfirmationModal({
        isOpen: false,
        date: "",
        currentStatus: "work",
        newStatus: "work",
      });
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    } catch (error) {
      console.error("Error updating custom day:", error);
      setError("Failed to update working day");
    } finally {
      setIsLoading(false);
    }
  };

  const navigateMonth = (direction: "prev" | "next") => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      if (direction === "next") {
        newDate.setMonth(prev.getMonth() + 1);
      } else {
        newDate.setMonth(prev.getMonth() - 1);
      }
      return newDate;
    });
  };

  const generateCalendarDays = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1);
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay()); // Start from Sunday

    const days = [];
    const currentDateForLoop = new Date(startDate);

    // Generate 6 weeks (42 days) to ensure full calendar
    for (let i = 0; i < 42; i++) {
      days.push(new Date(currentDateForLoop));
      currentDateForLoop.setDate(currentDateForLoop.getDate() + 1);
    }

    return days;
  };

  const handleSaveFinancialConfig = async () => {
    if (!program) return;

    setIsLoading(true);
    setError("");

    try {
      // Update financial config
      await api.put(`/program/${program.id}/financial-config`, {
        colporterPercentage: financialConfig.colporterPercentage,
        leaderPercentage: financialConfig.leaderPercentage,
        colporterCashAdvancePercentage:
          financialConfig.colporterCashAdvancePercentage,
        leaderCashAdvancePercentage:
          financialConfig.leaderCashAdvancePercentage,
      });

      // Refresh program data
      await fetchProgram();

      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    } catch (error) {
      console.error("Error updating financial config:", error);
      setError("Failed to update financial configuration");
    } finally {
      setIsLoading(false);
    }
  };

  const calculateProgramDuration = () => {
    if (!program) return { days: 0, weeks: 0, months: 0 };

    const start = new Date(program.start_date);
    const end = new Date(program.end_date);
    const diffTime = Math.abs(end.getTime() - start.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    const diffWeeks = Math.floor(diffDays / 7);
    const diffMonths = Math.floor(diffDays / 30);

    return { days: diffDays, weeks: diffWeeks, months: diffMonths };
  };

  const calculateWorkDays = () => {
    if (!program) return 0;

    const start = new Date(program.start_date);
    const end = new Date(program.end_date);
    let workDayCount = 0;

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      if (getDayStatus(d) === "work") {
        workDayCount++;
      }
    }

    return workDayCount;
  };

  const duration = calculateProgramDuration();
  const totalWorkDays = calculateWorkDays();
  const calendarDays = generateCalendarDays();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingScreen message="Loading program settings..." />
      </div>
    );
  }

  if (!program) {
    return (
      <div className="p-4 bg-warning-50 border border-warning-200 rounded-lg text-warning-700">
        <p className="font-medium">No active program found</p>
        <p>Please create a program first.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">

      {error && (
        <div className="p-4 bg-danger-50 border border-danger-200 rounded-lg flex items-start gap-3">
          <AlertCircle
            className="text-danger-500 flex-shrink-0 mt-0.5"
            size={20}
          />
          <div className="text-sm text-danger-700">
            <p className="font-medium">Configuration Error</p>
            <p>{error}</p>
          </div>
        </div>
      )}

      {isSaved && (
        <div className="p-4 bg-success-50 border border-success-200 rounded-lg flex items-start gap-3">
          <CheckCircle
            className="text-success-500 flex-shrink-0 mt-0.5"
            size={20}
          />
          <div className="text-sm text-success-700">
            <p className="font-medium">Settings Saved</p>
            <p>Program configuration has been updated successfully.</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Program Information (Read-only) */}
        <div className="lg:col-span-2 space-y-6">
          <Card title="Program Information" icon={<SettingsIcon size={20} />}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Program Name
                </label>
                <div className="p-3 bg-gray-50 rounded-md text-gray-900 font-medium">
                  {program.name}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Start Date
                  </label>
                  <div className="p-3 bg-gray-50 rounded-md text-gray-900">
                    {new Date(program.start_date).toLocaleDateString("en-US", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    End Date
                  </label>
                  <div className="p-3 bg-gray-50 rounded-md text-gray-900">
                    {new Date(program.end_date).toLocaleDateString("en-US", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Default Working Schedule
                </label>
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <Lock size={16} className="text-gray-500" />
                    <span className="text-sm text-gray-600">
                      Default schedule
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {DAYS_OF_WEEK.map((day) => {
                      const workingDay = workingDays.find(
                        (d) => d.day_of_week === day.id
                      );
                      const isWorkDay = workingDay?.is_working_day;

                      return (
                        <div
                          key={day.id}
                          className={`py-1 px-3 rounded-full text-sm font-medium ${
                            isWorkDay
                              ? "bg-primary-100 text-primary-700"
                              : "bg-gray-100 text-gray-500"
                          }`}
                        >
                          {day.label}
                        </div>
                      );
                    })}
                  </div>
                  <p className="mt-3 text-xs text-gray-500">
                    To modify the working schedule for specific dates, use the calendar below to set custom overrides.
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Financial Configuration */}
          <Card title="Financial Configuration" icon={<DollarSign size={20} />}>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Colporter Percentage (%)
                  </label>
                  <Input
                    type="number"
                    value={financialConfig.colporterPercentage}
                    onChange={(e) =>
                      setFinancialConfig({
                        ...financialConfig,
                        colporterPercentage: parseFloat(e.target.value),
                      })
                    }
                    min="0"
                    max="100"
                    step="0.1"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Percentage of sales that goes to colporters
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Leader Percentage (%)
                  </label>
                  <Input
                    type="number"
                    value={financialConfig.leaderPercentage}
                    onChange={(e) =>
                      setFinancialConfig({
                        ...financialConfig,
                        leaderPercentage: parseFloat(e.target.value),
                      })
                    }
                    min="0"
                    max="100"
                    step="0.1"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Percentage of sales that goes to leaders
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Colporter Cash Advance Limit (%)
                  </label>
                  <Input
                    type="number"
                    value={financialConfig.colporterCashAdvancePercentage}
                    onChange={(e) =>
                      setFinancialConfig({
                        ...financialConfig,
                        colporterCashAdvancePercentage: parseFloat(
                          e.target.value
                        ),
                      })
                    }
                    min="0"
                    max="100"
                    step="0.1"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Maximum percentage of weekly sales for colporter cash
                    advances
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Leader Cash Advance Limit (%)
                  </label>
                  <Input
                    type="number"
                    value={financialConfig.leaderCashAdvancePercentage}
                    onChange={(e) =>
                      setFinancialConfig({
                        ...financialConfig,
                        leaderCashAdvancePercentage: parseFloat(e.target.value),
                      })
                    }
                    min="0"
                    max="100"
                    step="0.1"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    Maximum percentage of weekly sales for leader cash advances
                  </p>
                </div>
              </div>

              <div className="p-4 bg-primary-50 rounded-lg">
                <p className="text-sm text-primary-700">
                  <strong>Distribution Summary:</strong> For each $100 in sales,
                  colporters will receive ${financialConfig.colporterPercentage}{" "}
                  and leaders will receive ${financialConfig.leaderPercentage}.
                </p>
              </div>

              <div className="flex justify-end">
                <Button
                  variant="primary"
                  onClick={handleSaveFinancialConfig}
                  isLoading={isLoading}
                  leftIcon={<Save size={18} />}
                >
                  Save Financial Configuration
                </Button>
              </div>
            </div>
          </Card>

          {/* Interactive Calendar */}
          <Card title="Working Days Calendar" icon={<CalendarDays size={20} />}>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Click on any date to toggle between working day and rest day.
                Changes will affect statistics calculations and transaction
                availability.
              </p>

              {/* Calendar Header */}
              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigateMonth("prev")}
                >
                  <ChevronLeft size={20} />
                </Button>

                <h3 className="text-lg font-semibold text-gray-900">
                  {MONTHS[currentDate.getMonth()]} {currentDate.getFullYear()}
                </h3>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigateMonth("next")}
                >
                  <ChevronRight size={20} />
                </Button>
              </div>

              {/* Calendar Grid */}
              <div className="grid grid-cols-7 gap-1">
                {/* Day headers */}
                {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(
                  (day) => (
                    <div
                      key={day}
                      className="p-2 text-center text-xs font-medium text-gray-500"
                    >
                      {day}
                    </div>
                  )
                )}

                {/* Calendar days */}
                {calendarDays.map((date, index) => {
                  const isCurrentMonth =
                    date.getMonth() === currentDate.getMonth();
                  const status = getDayStatus(date);
                  const isToday =
                    date.toDateString() === new Date().toDateString();

                  return (
                    <button
                      key={index}
                      onClick={() => handleDateClick(date)}
                      disabled={status === "outside"}
                      className={`
                        p-2 text-sm rounded-md transition-all duration-200 min-h-[40px] relative
                        ${!isCurrentMonth ? "text-gray-300" : ""}
                        ${
                          status === "outside"
                            ? "cursor-not-allowed bg-gray-100 text-gray-300"
                            : ""
                        }
                        ${
                          isToday
                            ? status === "rest"
                              ? "bg-yellow-100 text-yellow-700 ring-2 ring-yellow-500 hover:bg-yellow-200"
                              : "bg-primary-100 text-primary-700 ring-2 ring-primary-500 hover:bg-primary-200"
                            : status === "work"
                            ? "bg-primary-100 text-primary-700 hover:bg-primary-200"
                            : "bg-gray-200 text-gray-600 hover:bg-gray-300"
                        }
                      `}
                    >
                      <span className="relative z-10">{date.getDate()}</span>
                      {isToday && (
                        <div
                          className={`absolute inset-0 rounded-md opacity-20 ${
                            status === "rest"
                              ? "bg-yellow-500"
                              : "bg-primary-500"
                          }`}
                        ></div>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex items-center justify-center gap-6 pt-4 border-t border-gray-200">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-primary-100 rounded"></div>
                  <span className="text-sm text-gray-600">Working Day</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-gray-200 rounded"></div>
                  <span className="text-sm text-gray-600">Rest Day</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-gray-100 rounded"></div>
                  <span className="text-sm text-gray-600">Outside Program</span>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Program Statistics */}
        <div className="lg:col-span-1">
          <Card title="Program Statistics" icon={<Timer size={20} />}>
            <div className="space-y-4">
              <div className="p-4 bg-primary-50 rounded-lg">
                <div className="text-center">
                  <p className="text-sm font-medium text-primary-600">
                    Total Duration
                  </p>
                  <p className="mt-1 text-2xl font-bold text-primary-700">
                    {duration.days}
                  </p>
                  <p className="text-xs text-primary-600">days</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-success-50 rounded-lg text-center">
                  <p className="text-xs font-medium text-success-600">Weeks</p>
                  <p className="text-lg font-bold text-success-700">
                    {duration.weeks}
                  </p>
                </div>

                <div className="p-3 bg-warning-50 rounded-lg text-center">
                  <p className="text-xs font-medium text-warning-600">Months</p>
                  <p className="text-lg font-bold text-warning-700">
                    {duration.months}
                  </p>
                </div>
              </div>

              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="text-center">
                  <p className="text-sm font-medium text-blue-600">
                    Working Days
                  </p>
                  <p className="mt-1 text-2xl font-bold text-blue-700">
                    {totalWorkDays}
                  </p>
                  <p className="text-xs text-blue-600">total work days</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-xs text-gray-500">
                  <p>
                    <strong>Custom Rest Days:</strong>{" "}
                    {customDays.filter((d) => !d.is_working_day).length}
                  </p>
                  <p>
                    <strong>Custom Work Days:</strong>{" "}
                    {customDays.filter((d) => d.is_working_day).length}
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <div className="text-xs text-gray-500 space-y-1">
                  <p>
                    <strong>Created:</strong>{" "}
                    {new Date(program.created_at).toLocaleDateString()}
                  </p>
                  <p>
                    <strong>Last Updated:</strong>{" "}
                    {new Date(program.updated_at).toLocaleDateString()}
                  </p>
                  <p>
                    <strong>Status:</strong>
                    <Badge
                      variant={program.is_active ? "success" : "secondary"}
                      size="sm"
                      className="ml-1"
                    >
                      {program.is_active ? "Active" : "Inactive"}
                    </Badge>
                  </p>
                </div>
              </div>
            </div>
          </Card>

          <div className="mt-6">
            <Button
              variant="primary"
              onClick={handleSaveFinancialConfig}
              isLoading={isLoading}
              leftIcon={<Save size={18} />}
              fullWidth
            >
              Save All Changes
            </Button>
          </div>

          {/* Books Summary */}
          <Card
            title="Program Books"
            icon={<BookText size={20} />}
            className="mt-6"
          >
            <div className="space-y-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">
                    Active Books
                  </span>
                  <Badge variant="success">
                    {program.books?.filter((b) => b.is_active).length || 0}
                  </Badge>
                </div>
              </div>

              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">
                    Inactive Books
                  </span>
                  <Badge variant="secondary">
                    {program.books?.filter((b) => !b.is_active).length || 0}
                  </Badge>
                </div>
              </div>

              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">
                    Total Books
                  </span>
                  <Badge variant="primary">{program.books?.length || 0}</Badge>
                </div>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => (window.location.href = "/inventory/catalog")}
                leftIcon={<BookText size={16} />}
                fullWidth
              >
                Manage Books
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {/* Confirmation Modal */}
      {confirmationModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <Card>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <AlertCircle className="text-warning-500" size={24} />
                  <h3 className="text-lg font-semibold text-gray-900">
                    Confirm Day Change
                  </h3>
                </div>

                <div className="space-y-3">
                  <p className="text-sm text-gray-600">
                    You are about to change{" "}
                    <strong>
                      {new Date(confirmationModal.date).toLocaleDateString(
                        "en-US",
                        {
                          weekday: "long",
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        }
                      )}
                    </strong>{" "}
                    from a{" "}
                    <strong>{confirmationModal.currentStatus} day</strong> to a{" "}
                    <strong>{confirmationModal.newStatus} day</strong>.
                  </p>

                  <div className="p-3 bg-warning-50 border border-warning-200 rounded-lg">
                    <p className="text-sm text-warning-700">
                      <strong>⚠️ Important:</strong> This change will affect
                      statistics calculations.
                      {confirmationModal.newStatus === "rest"
                        ? " Data from this day will not be counted in performance metrics."
                        : " Data from this day will be included in performance metrics."}
                    </p>
                  </div>
                </div>

                <div className="flex justify-end gap-3">
                  <Button
                    variant="outline"
                    onClick={() =>
                      setConfirmationModal({
                        isOpen: false,
                        date: "",
                        currentStatus: "work",
                        newStatus: "work",
                      })
                    }
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    onClick={confirmDateChange}
                    isLoading={isLoading}
                  >
                    Confirm Change
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Important Notes */}
      <Card>
        <div className="flex items-start gap-4">
          <AlertCircle
            className="text-warning-500 flex-shrink-0 mt-1"
            size={24}
          />
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Important Notes
            </h3>
            <ul className="text-sm text-gray-600 space-y-2">
              <li>
                • <strong>Program Information:</strong> Basic program details
                are read-only and managed by administrators.
              </li>
              <li>
                • <strong>Default Schedule:</strong> The default weekly schedule is locked and cannot be modified.
              </li>
              <li>
                • <strong>Calendar Interaction:</strong> Click on any date
                within the program period to toggle work/rest status.
              </li>
              <li>
                • <strong>Statistics Impact:</strong> Changes to working days
                affect all performance calculations and reports.
              </li>
              <li>
                • <strong>Custom Overrides:</strong> Specific dates can override
                the default weekly schedule.
              </li>
              <li>
                • <strong>Data Integrity:</strong> Rest days exclude
                transactions from daily averages but preserve the data.
              </li>
              <li>
                • <strong>Transaction Restrictions:</strong> Regular users
                cannot create transactions on non-working days.
              </li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default ProgramSettings;