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
        setError(t("programSettings.noProgramFound"));
      } finally {
        setIsLoading(false);
      }
    };

    loadProgramData();
  }, [fetchProgram, wasProgramFetched, t]);

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
          const updated = [...prev];
          updated[existingIndex] = {
            ...updated[existingIndex],
            is_working_day: newStatus === "work",
          };
          return updated;
        } else {
          return [
            ...prev,
            {
              id: Date.now(),
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
      setError(t("programSettings.configurationError"));
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
    startDate.setDate(startDate.getDate() - firstDay.getDay());

    const days = [];
    const currentDateForLoop = new Date(startDate);

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
      await api.put(`/program/${program.id}/financial-config`, {
        colporterPercentage: financialConfig.colporterPercentage,
        leaderPercentage: financialConfig.leaderPercentage,
        colporterCashAdvancePercentage:
          financialConfig.colporterCashAdvancePercentage,
        leaderCashAdvancePercentage:
          financialConfig.leaderCashAdvancePercentage,
      });

      await fetchProgram();

      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    } catch (error) {
      console.error("Error updating financial config:", error);
      setError(t("programSettings.configurationError"));
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
        <LoadingScreen message={t("programSettings.loadingProgramSettings")} />
      </div>
    );
  }

  if (!program) {
    return (
      <div className="p-4 bg-warning-50 border border-warning-200 rounded-lg text-warning-700">
        <p className="font-medium">{t("programSettings.noProgramFound")}</p>
        <p>{t("programSettings.createProgramPrompt")}</p>
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
            <p className="font-medium">{t("programSettings.configurationError")}</p>
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
            <p className="font-medium">{t("programSettings.settingsSaved")}</p>
            <p>{t("programSettings.settingsSavedMessage")}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card title={t("programSettings.programInformation")} icon={<SettingsIcon size={20} />}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  {t("programSettings.programName")}
                </label>
                <div className="p-3 bg-gray-50 rounded-md text-gray-900 font-medium">
                  {program.name}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("programSettings.startDate")}
                  </label>
                  <div className="p-3 bg-gray-50 rounded-md text-gray-900">
                    {new Date(program.start_date).toLocaleDateString("es-US", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("programSettings.endDate")}
                  </label>
                  <div className="p-3 bg-gray-50 rounded-md text-gray-900">
                    {new Date(program.end_date).toLocaleDateString("es-US", {
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
                  {t("programSettings.defaultWorkingSchedule")}
                </label>
                <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <Lock size={16} className="text-gray-500" />
                    <span className="text-sm text-gray-600">
                      {t("programSettings.defaultSchedule")}
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
                          {t(`programSettings.days.${day.id}`)}
                        </div>
                      );
                    })}
                  </div>
                  <p className="mt-3 text-xs text-gray-500">
                    {t("programSettings.scheduleOverrideNote")}
                  </p>
                </div>
              </div>
            </div>
          </Card>

          <Card title={t("programSettings.financialConfiguration")} icon={<DollarSign size={20} />}>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("programSettings.colporterPercentage")}
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
                    {t("programSettings.colporterPercentageDescription")}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("programSettings.leaderPercentage")}
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
                    {t("programSettings.leaderPercentageDescription")}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("programSettings.colporterCashAdvanceLimit")}
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
                    {t("programSettings.colporterCashAdvanceDescription")}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    {t("programSettings.leaderCashAdvanceLimit")}
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
                    {t("programSettings.leaderCashAdvanceDescription")}
                  </p>
                </div>
              </div>

              <div className="flex justify-end">
                <Button
                  variant="primary"
                  onClick={handleSaveFinancialConfig}
                  isLoading={isLoading}
                  leftIcon={<Save size={18} />}
                >
                  {t("programSettings.saveFinancialConfiguration")}
                </Button>
              </div>
            </div>
          </Card>

          <Card title={t("programSettings.workingDaysCalendar")} icon={<CalendarDays size={20} />}>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                {t("programSettings.calendarInstruction")}
              </p>

              <div className="flex items-center justify-between">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigateMonth("prev")}
                >
                  <ChevronLeft size={20} />
                </Button>

                <h3 className="text-lg font-semibold text-gray-900">
                  {t(`programSettings.months.${currentDate.getMonth()}`)} {currentDate.getFullYear()}
                </h3>

                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigateMonth("next")}
                >
                  <ChevronRight size={20} />
                </Button>
              </div>

              <div className="grid grid-cols-7 gap-1">
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

              <div className="flex items-center justify-center gap-6 pt-4 border-t border-gray-200">
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-primary-100 rounded"></div>
                  <span className="text-sm text-gray-600">{t("programSettings.workingDay")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-gray-200 rounded"></div>
                  <span className="text-sm text-gray-600">{t("programSettings.restDay")}</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 bg-gray-100 rounded"></div>
                  <span className="text-sm text-gray-600">{t("programSettings.outsideProgram")}</span>
                </div>
              </div>
            </div>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card title={t("programSettings.programStatistics")} icon={<Timer size={20} />}>
            <div className="space-y-4">
              <div className="p-4 bg-primary-50 rounded-lg">
                <div className="text-center">
                  <p className="text-sm font-medium text-primary-600">
                    {t("programSettings.totalDuration")}
                  </p>
                  <p className="mt-1 text-2xl font-bold text-primary-700">
                    {duration.days}
                  </p>
                  <p className="text-xs text-primary-600">{t("common.days")}</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-success-50 rounded-lg text-center">
                  <p className="text-xs font-medium text-success-600">{t("programSettings.weeks")}</p>
                  <p className="text-lg font-bold text-success-700">
                    {duration.weeks}
                  </p>
                </div>

                <div className="p-3 bg-warning-50 rounded-lg text-center">
                  <p className="text-xs font-medium text-warning-600">{t("common.months")}</p>
                  <p className="text-lg font-bold text-warning-700">
                    {duration.months}
                  </p>
                </div>
              </div>

              <div className="p-4 bg-blue-50 rounded-lg">
                <div className="text-center">
                  <p className="text-sm font-medium text-blue-600">
                    {t("programSettings.workingDays")}
                  </p>
                  <p className="mt-1 text-2xl font-bold text-blue-700">
                    {totalWorkDays}
                  </p>
                  <p className="text-xs text-blue-600">{t("programSettings.totalWorkDays")}</p>
                </div>
              </div>

              <div className="space-y-2">
                <div className="text-xs text-gray-500">
                  <p>
                    <strong>{t("programSettings.customRestDays")}:</strong>{" "}
                    {customDays.filter((d) => !d.is_working_day).length}
                  </p>
                  <p>
                    <strong>{t("programSettings.customWorkDays")}:</strong>{" "}
                    {customDays.filter((d) => d.is_working_day).length}
                  </p>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-200">
                <div className="text-xs text-gray-500 space-y-1">
                  <p>
                    <strong>{t("programSettings.created")}:</strong>{" "}
                    {new Date(program.created_at).toLocaleDateString('es-US')}
                  </p>
                  <p>
                    <strong>{t("programSettings.lastUpdated")}:</strong>{" "}
                    {new Date(program.updated_at).toLocaleDateString('es-US')}
                  </p>
                  <p>
                    <strong>{t("programSettings.status")}:</strong>
                    <Badge
                      variant={program.is_active ? "success" : "secondary"}
                      size="sm"
                      className="ml-1"
                    >
                      {program.is_active ? t("programSettings.active") : t("programSettings.inactive")}
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
              {t("programSettings.saveAllChanges")}
            </Button>
          </div>

          <Card
            title={t("programSettings.programBooks")}
            icon={<BookText size={20} />}
            className="mt-6"
          >
            <div className="space-y-4">
              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">
                    {t("programSettings.activeBooks")}
                  </span>
                  <Badge variant="success">
                    {program.books?.filter((b) => b.is_active).length || 0}
                  </Badge>
                </div>
              </div>

              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">
                    {t("programSettings.inactiveBooks")}
                  </span>
                  <Badge variant="secondary">
                    {program.books?.filter((b) => !b.is_active).length || 0}
                  </Badge>
                </div>
              </div>

              <div className="p-3 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium text-gray-700">
                    {t("programSettings.totalBooks")}
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
                {t("programSettings.manageBooks")}
              </Button>
            </div>
          </Card>
        </div>
      </div>

      {confirmationModal.isOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <Card>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <AlertCircle className="text-warning-500" size={24} />
                  <h3 className="text-lg font-semibold text-gray-900">
                    {t("programSettings.confirmDayChange")}
                  </h3>
                </div>

                <div className="space-y-3">
                  <p className="text-sm text-gray-600">
                    {t("programSettings.dayChangeMessage", {
                      date: new Date(confirmationModal.date).toLocaleDateString(
                        "es-US",
                        {
                          weekday: "long",
                          month: "long",
                          day: "numeric",
                          year: "numeric",
                        }
                      ),
                      currentStatus: confirmationModal.currentStatus,
                      newStatus: confirmationModal.newStatus
                    })}
                  </p>

                  <div className="p-3 bg-warning-50 border border-warning-200 rounded-lg">
                    <p className="text-sm text-warning-700">
                      <strong>{t("programSettings.dayChangeWarning", {
                        newStatusMessage: confirmationModal.newStatus === "rest"
                          ? t("programSettings.restDayImpact")
                          : t("programSettings.workDayImpact")
                      })}</strong>
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
                    {t("common.cancel")}
                  </Button>
                  <Button
                    variant="primary"
                    onClick={confirmDateChange}
                    isLoading={isLoading}
                  >
                    {t("common.confirm")}
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      <Card>
        <div className="flex items-start gap-4">
          <AlertCircle
            className="text-warning-500 flex-shrink-0 mt-1"
            size={24}
          />
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              {t("programSettings.importantNotes")}
            </h3>
            <ul className="text-sm text-gray-600 space-y-2">
              <li>{t("programSettings.noteProgramInformation")}</li>
              <li>{t("programSettings.noteDefaultSchedule")}</li>
              <li>{t("programSettings.noteCalendarInteraction")}</li>
              <li>{t("programSettings.noteStatisticsImpact")}</li>
              <li>{t("programSettings.noteCustomOverrides")}</li>
              <li>{t("programSettings.noteDataIntegrity")}</li>
              <li>{t("programSettings.noteTransactionRestrictions")}</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default ProgramSettings;