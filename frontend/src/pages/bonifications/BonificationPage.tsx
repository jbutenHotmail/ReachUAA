import type React from "react";
import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import {
  Award,
  Trophy,
  Medal,
  Clock,
  DollarSign,
  TrendingUp,
  Star,
  Sparkles,
  Target,
  Gift,
  CheckCircle,
  RefreshCw,
  Settings,
  ChevronDown,
  Calendar,
  AlertTriangle,
} from "lucide-react";
import { useAuthStore } from "../../stores/authStore";
import { useBonificationStore } from "../../stores/bonificationStore";
import { useProgramStore } from "../../stores/programStore";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import ProgressBar from "../../components/ui/ProgressBar";
import LoadingScreen from "../../components/ui/LoadingScreen";
import Confetti from "react-confetti";
import { UserRole } from "../../types";
import { formatNumber } from "../../utils/numberUtils";
import Button from "../../components/ui/Button";

const BonificationsPage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { program } = useProgramStore();
  const {
    bonificationStatus,
    allColporterStatuses,
    availablePrograms,
    selectedPrograms,
    bonificationConfig,
    isLoading,
    fetchBonificationStatus,
    fetchAllColporterStatuses,
    fetchAvailablePrograms,
    fetchBonificationConfig,
    updateBonificationConfig,
    wereBonificationsFetched,
    setSelectedPrograms,
  } = useBonificationStore();

  const [activeTab, setActiveTab] = useState<"personal" | "overview">("personal");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showProgramSelector, setShowProgramSelector] = useState(false);
  const [tempSelectedPrograms, setTempSelectedPrograms] = useState<number[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const isViewer = user?.role === UserRole.VIEWER;
  const isAdminOrSupervisor = user?.role === UserRole.ADMIN || user?.role === UserRole.SUPERVISOR;
  const [showConfetti, setShowConfetti] = useState(false);

  useEffect(() => {
    if (!wereBonificationsFetched) {
      if (isViewer && user?.id) {
        fetchBonificationStatus(user.id, "user");
      } else if (isAdminOrSupervisor) {
        fetchAvailablePrograms();
        fetchBonificationConfig();
        fetchAllColporterStatuses();
      }
    }
  }, [
    fetchBonificationStatus,
    fetchAllColporterStatuses,
    fetchAvailablePrograms,
    fetchBonificationConfig,
    wereBonificationsFetched,
    user,
    isViewer,
    isAdminOrSupervisor,
  ]);

  // Sync temp selected programs with the config when it loads
  useEffect(() => {
    if (bonificationConfig && bonificationConfig.selectedProgramIds) {
      setTempSelectedPrograms(bonificationConfig.selectedProgramIds);
    }
  }, [bonificationConfig]);

  useEffect(() => {
    if (isViewer) {
      setActiveTab("personal");
    } else if (isAdminOrSupervisor) {
      setActiveTab("overview");
    }
  }, [isViewer, isAdminOrSupervisor]);

  useEffect(() => {
    if (isViewer && bonificationStatus && !isLoading) {
      const hasAchievedBonification =
        bonificationStatus.silverStatus.achieved || bonificationStatus.goldStatus.achieved;

      if (hasAchievedBonification) {
        const timer = setTimeout(() => {
          setShowConfetti(true);
          const hideTimer = setTimeout(() => {
            setShowConfetti(false);
          }, 5000);
          return () => clearTimeout(hideTimer);
        }, 500);
        return () => clearTimeout(timer);
      }
    }
  }, [bonificationStatus, isLoading, isViewer]);

  const handleRefresh = async () => {
    setIsRefreshing(true);
    try {
      useBonificationStore.setState({ wereBonificationsFetched: false });
      if (isViewer && user?.id) {
        await fetchBonificationStatus(user.id, "user");
      } else if (isAdminOrSupervisor) {
        await fetchAllColporterStatuses();
      }
    } catch (error) {
      console.error("Error refreshing bonifications:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleProgramToggle = (programId: string) => {
    const isSelected = tempSelectedPrograms.includes(Number(programId));
    if (isSelected) {
      setTempSelectedPrograms(tempSelectedPrograms.filter(id => Number(id) !== Number(programId)));
    } else {
      setTempSelectedPrograms([...tempSelectedPrograms, Number(programId)]);
    }
  };

  const handleSaveConfiguration = async () => {
    setIsSaving(true);
    try {
      await updateBonificationConfig(tempSelectedPrograms);
      setShowProgramSelector(false);
      // Refresh bonifications after saving
      await fetchAllColporterStatuses();
    } catch (error) {
      console.error('Error saving configuration:', error);
    } finally {
      setIsSaving(false);
    }
  };

  const handleCancelConfiguration = () => {
    // Reset temp selection to current config
    if (bonificationConfig && bonificationConfig.selectedProgramIds) {
      setTempSelectedPrograms(bonificationConfig.selectedProgramIds);
    }
    setShowProgramSelector(false);
  };

  const getBonificationIcon = (type: "GOLD" | "SILVER", achieved = false) => {
    if (type === "GOLD") {
      return achieved ? (
        <Trophy className="text-yellow-500" size={32} />
      ) : (
        <Trophy className="text-gray-400" size={32} />
      );
    } else {
      return achieved ? (
        <Medal className="text-gray-400" size={32} />
      ) : (
        <Medal className="text-gray-300" size={32} />
      );
    }
  };

  const getProgressColor = (progress: number, type: "GOLD" | "SILVER") => {
    if (progress >= 100) {
      return type === "GOLD" ? "success" : "primary";
    } else if (progress >= 75) {
      return "warning";
    } else {
      return "danger";
    }
  };

  if (isLoading) {
    return <LoadingScreen message={t("bonifications.loading")} />;
  }

  return (
    <div className="space-y-6">
      {showConfetti && (
        <Confetti
          width={window.innerWidth}
          height={window.innerHeight}
          recycle={false}
          numberOfPieces={bonificationStatus?.goldStatus.achieved ? 700 : 1500}
          colors={
            bonificationStatus?.goldStatus.achieved
              ? ["#FFD700", "#FFA500", "#FF8C00", "#FFE55C", "#ff0000ff", "#00b7ffff"]
              : ["#C0C0C0", "#A8A8A8", "#4169E1", "#87CEEB", "#B0C4DE", "#FF8C00"]
          }
          gravity={1}
          wind={0.05}
        />
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Award className="text-yellow-500" size={28} />
            {t("bonifications.title")}
          </h1>
          <p className="mt-1 text-sm text-gray-500">{t("bonifications.description")}</p>
        </div>
        <Button
          variant="outline"
          leftIcon={<RefreshCw size={18} className={isRefreshing ? "animate-spin" : ""} />}
          onClick={handleRefresh}
          disabled={isRefreshing}
        >
          {t("common.refresh")}
        </Button>
      </div>

      {isAdminOrSupervisor && (
        <div className="flex border-b border-gray-200">
          <button
            className={`py-2 px-4 border-b-2 font-medium text-sm flex items-center gap-2 ${
              activeTab === "overview"
                ? "border-primary-500 text-primary-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            }`}
            onClick={() => setActiveTab("overview")}
          >
            <TrendingUp size={16} />
            {t("bonifications.overview")}
          </button>
          {bonificationStatus && (
            <button
              className={`py-2 px-4 border-b-2 font-medium text-sm flex items-center gap-2 ${
                activeTab === "personal"
                  ? "border-primary-500 text-primary-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              }`}
              onClick={() => setActiveTab("personal")}
            >
              <Star size={16} />
              {t("bonifications.myProgress")}
            </button>
          )}
        </div>
      )}

      {activeTab === "personal" && bonificationStatus && (
        <div className="space-y-6">
          {/* Display Program Names */}
          {bonificationStatus.programs?.length > 0 && (
            <Card className="bg-blue-50 border-blue-200">
              <div className="p-4">
                <h3 className="text-lg font-semibold text-gray-900 mb-2 flex items-center gap-2">
                  <Calendar className="text-blue-600" size={20} />
                  {t("bonifications.programDataSource")}
                </h3>
                <p className="text-sm text-gray-600 mb-4">
                  {t("bonifications.programDataSourceDescription", {
                    count: bonificationStatus.programs.length,
                  })}
                </p>
                <div className="flex flex-wrap gap-2">
                  {bonificationStatus.programs.map((prog) => (
                    <Badge key={prog.programId} variant="info">
                      {prog.programName}
                    </Badge>
                  ))}
                </div>
              </div>
            </Card>
          )}

          {bonificationStatus.nextTarget === "COMPLETED" && (
            <Card className="bg-gradient-to-r from-yellow-50 to-orange-50 border-yellow-200">
              <div className="text-center">
                <div className="flex justify-center mb-4">
                  <div className="relative">
                    <Trophy className="text-yellow-500" size={64} />
                    <div className="absolute -inset-4 animate-ping">
                      <div className="w-full h-full rounded-full bg-yellow-400 opacity-20"></div>
                    </div>
                  </div>
                </div>

                <h2 className="text-2xl font-bold text-gray-900 mb-2">
                  🎉 {t("bonifications.allCompleted")} 🎉
                </h2>

                <p className="text-gray-600 mb-4">{t("bonifications.allCompletedMessage")}</p>

                <div className="grid grid-cols-2 gap-4">
                  <div className="p-3 bg-gray-100 rounded-lg">
                    <Medal className="text-gray-400 mx-auto mb-2" size={24} />
                    <p className="text-sm font-medium">
                      {t("bonifications.silver")}: ${formatNumber(1496)}
                    </p>
                  </div>
                  <div className="p-3 bg-yellow-100 rounded-lg">
                    <Trophy className="text-yellow-500 mx-auto mb-2" size={24} />
                    <p className="text-sm font-medium">
                      {t("bonifications.gold")}: ${formatNumber(2160)}
                    </p>
                  </div>
                </div>

                <div className="mt-4 p-4 bg-success-50 rounded-lg border border-success-200">
                  <p className="text-lg font-bold text-success-700">
                    {t("bonifications.total")}: ${formatNumber(1496 + 2160)}
                  </p>
                </div>
              </div>
            </Card>
          )}

          {bonificationStatus.nextTarget !== "COMPLETED" && (
            <Card className="bg-gradient-to-r from-primary-50 to-blue-50 border-primary-200">
              <div className="text-center">
                <div className="flex justify-center mb-4">
                  <Target className="text-primary-600" size={48} />
                </div>

                <h3 className="text-xl font-bold text-gray-900 mb-2">
                  {t("bonifications.nextTarget")}:{" "}
                  {bonificationStatus.nextTarget === "SILVER"
                    ? t("bonifications.silver")
                    : t("bonifications.gold")}
                </h3>

                {bonificationStatus.nextTarget === "SILVER" ? (
                  <div className="space-y-2">
                    <p className="text-gray-600">
                      {t("bonifications.silverRemaining", {
                        hours: bonificationStatus.silverStatus.hoursRemaining,
                        amount: formatNumber(bonificationStatus.silverStatus.amountRemaining),
                      })}
                    </p>
                    <div className="flex justify-center gap-4 mt-4">
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="text-blue-600" size={16} />
                        <span className="text-blue-700 font-medium">
                          {Math.round(bonificationStatus.silverStatus.hoursProgress)}% {t("bonifications.hours")}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <DollarSign className="text-green-600" size={16} />
                        <span className="text-green-700 font-medium">
                          {Math.round(bonificationStatus.silverStatus.amountProgress)}% {t("bonifications.deposit")}
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-gray-600">
                      {t("bonifications.goldRemaining", {
                        hours: bonificationStatus.goldStatus.hoursRemaining,
                        amount: formatNumber(bonificationStatus.goldStatus.amountRemaining),
                      })}
                    </p>
                    <div className="flex justify-center gap-4 mt-4">
                      <div className="flex items-center gap-2 text-sm">
                        <Clock className="text-yellow-600" size={16} />
                        <span className="text-yellow-700 font-medium">
                          {Math.round(bonificationStatus.goldStatus.hoursProgress)}% {t("bonifications.hours")}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <DollarSign className="text-green-600" size={16} />
                        <span className="text-green-700 font-medium">
                          {Math.round(bonificationStatus.goldStatus.amountProgress)}% {t("bonifications.deposit")}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card
              className={`relative overflow-hidden ${
                bonificationStatus.silverStatus.achieved
                  ? "bg-gradient-to-br from-gray-50 to-blue-50 border-blue-200"
                  : ""
              }`}
            >
              {bonificationStatus.silverStatus.achieved && (
                <div className="absolute inset-0 pointer-events-none">
                  <div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-blue-200/50 to-transparent transform -translate-x-full"
                    style={{
                      animation: "sweepAnimation 3s ease-in-out infinite",
                      animationName: "sweepAnimation",
                    }}
                  >
                    <style>{`
                      @keyframes sweepAnimation {
                        0% { transform: translateX(-100%); }
                        50% { transform: translateX(100%); }
                        100% { transform: translateX(-100%); }
                      }
                    `}</style>
                  </div>
                </div>
              )}

              <div className="text-center relative z-10">
                <div className="flex justify-center mb-4">
                  {getBonificationIcon("SILVER", bonificationStatus.silverStatus.achieved)}
                </div>

                <h3 className="text-xl font-bold text-gray-900 mb-2 flex items-center justify-center gap-2">
                  <Medal className="text-gray-400" size={20} />
                  {t("bonifications.silverBonidification")}
                </h3>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-gray-600">{t("bonifications.hoursRequired")}</p>
                      <p className="font-bold text-gray-900">280</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-gray-600">{t("bonifications.depositRequired")}</p>
                      <p className="font-bold text-gray-900">${formatNumber(3480)}</p>
                    </div>
                  </div>

                  <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-sm text-blue-600 mb-1">{t("bonifications.reward")}</p>
                    <p className="text-2xl font-bold text-blue-700">${formatNumber(1496)}</p>
                  </div>

                  {!bonificationStatus.silverStatus.achieved && (
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-600">{t("bonifications.hoursProgress")}</span>
                          <span className="font-medium">{bonificationStatus.currentHours} / 280</span>
                        </div>
                        <ProgressBar
                          value={bonificationStatus.currentHours}
                          max={280}
                          variant={getProgressColor(bonificationStatus.silverStatus.hoursProgress, "SILVER")}
                          height={8}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          {bonificationStatus.silverStatus.hoursRemaining > 0
                            ? t("bonifications.hoursRemaining", {
                                hours: bonificationStatus.silverStatus.hoursRemaining,
                              })
                            : t("bonifications.hoursCompleted")}
                        </p>
                      </div>

                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-600">{t("bonifications.depositProgress")}</span>
                          <span className="font-medium">
                            ${formatNumber(bonificationStatus.currentNetAmount)} / $3,480
                          </span>
                        </div>
                        <ProgressBar
                          value={bonificationStatus.currentNetAmount}
                          max={3480}
                          variant={getProgressColor(bonificationStatus.silverStatus.amountProgress, "SILVER")}
                          height={8}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          {bonificationStatus.silverStatus.amountRemaining > 0
                            ? t("bonifications.amountRemaining", {
                                amount: formatNumber(bonificationStatus.silverStatus.amountRemaining),
                              })
                            : t("bonifications.depositCompleted")}
                        </p>
                      </div>
                    </div>
                  )}

                  {bonificationStatus.silverStatus.achieved && (
                    <div className="p-3 bg-success-50 rounded-lg border border-success-200">
                      <div className="flex items-center justify-center gap-2">
                        <CheckCircle className="text-success-600" size={20} />
                        <span className="text-success-700 font-medium">{t("bonifications.achieved")}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Card>

            <Card
              className={`relative overflow-hidden ${
                bonificationStatus.goldStatus.achieved
                  ? "bg-gradient-to-br from-yellow-50 to-orange-50 border-yellow-200"
                  : ""
              }`}
            >
              {bonificationStatus.goldStatus.achieved && (
                <div className="absolute inset-0 pointer-events-none">
                  <div
                    className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-200/50 to-transparent transform -translate-x-full"
                    style={{
                      animation: "sweepAnimationGold 3s ease-in-out infinite",
                      animationName: "sweepAnimationGold",
                    }}
                  >
                    <style>{`
                      @keyframes sweepAnimationGold {
                        0% { transform: translateX(-100%); }
                        50% { transform: translateX(100%); }
                        100% { transform: translateX(-100%); }
                      }
                    `}</style>
                  </div>
                </div>
              )}

              <div className="text-center relative z-10">
                <div className="flex justify-center mb-4">
                  {getBonificationIcon("GOLD", bonificationStatus.goldStatus.achieved)}
                </div>

                <h3 className="text-xl font-bold text-gray-900 mb-2 flex items-center justify-center gap-2">
                  <Trophy className="text-yellow-500" size={20} />
                  {t("bonifications.goldBonidification")}
                </h3>

                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-gray-600">{t("bonifications.hoursRequired")}</p>
                      <p className="font-bold text-gray-900">320</p>
                    </div>
                    <div className="p-3 bg-gray-50 rounded-lg">
                      <p className="text-gray-600">{t("bonifications.depositRequired")}</p>
                      <p className="font-bold text-gray-900">${formatNumber(4800)}</p>
                    </div>
                  </div>

                  <div className="p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                    <p className="text-sm text-yellow-600 mb-1">{t("bonifications.reward")}</p>
                    <p className="text-2xl font-bold text-yellow-700">${formatNumber(2160)}</p>
                  </div>

                  {!bonificationStatus.goldStatus.achieved && (
                    <div className="space-y-3">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-600">{t("bonifications.hoursProgress")}</span>
                          <span className="font-medium">{bonificationStatus.currentHours} / 320</span>
                        </div>
                        <ProgressBar
                          value={bonificationStatus.currentHours}
                          max={320}
                          variant={getProgressColor(bonificationStatus.goldStatus.hoursProgress, "GOLD")}
                          height={8}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          {bonificationStatus.goldStatus.hoursRemaining > 0
                            ? t("bonifications.hoursRemaining", {
                                hours: bonificationStatus.goldStatus.hoursRemaining,
                              })
                            : t("bonifications.hoursCompleted")}
                        </p>
                      </div>

                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span className="text-gray-600">{t("bonifications.depositProgress")}</span>
                          <span className="font-medium">
                            ${formatNumber(bonificationStatus.currentNetAmount)} / $4,800
                          </span>
                        </div>
                        <ProgressBar
                          value={bonificationStatus.currentNetAmount}
                          max={4800}
                          variant={getProgressColor(bonificationStatus.goldStatus.amountProgress, "GOLD")}
                          height={8}
                        />
                        <p className="text-xs text-gray-500 mt-1">
                          {bonificationStatus.goldStatus.amountRemaining > 0
                            ? t("bonifications.amountRemaining", {
                                amount: formatNumber(bonificationStatus.goldStatus.amountRemaining),
                              })
                            : t("bonifications.depositCompleted")}
                        </p>
                      </div>
                    </div>
                  )}

                  {bonificationStatus.goldStatus.achieved && (
                    <div className="p-3 bg-success-50 rounded-lg border border-success-200">
                      <div className="flex items-center justify-center gap-2">
                        <Trophy className="text-yellow-500" size={20} />
                        <span className="text-success-700 font-medium">{t("bonifications.achieved")}</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </Card>
          </div>

          <Card className="bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200">
            <div className="text-center">
              <div className="flex justify-center mb-4">
                {bonificationStatus.goldStatus.achieved ? (
                  <div className="relative">
                    <Trophy className="text-yellow-500" size={64} />
                    <Sparkles className="absolute -top-2 -right-2 text-yellow-400" size={24} />
                  </div>
                ) : bonificationStatus.silverStatus.achieved ? (
                  <div className="relative">
                    <Medal className="text-gray-400" size={64} />
                    <Star className="absolute -top-2 -right-2 text-blue-400" size={24} />
                  </div>
                ) : (
                  <Target className="text-gray-400" size={64} />
                )}
              </div>

              <h2 className="text-2xl font-bold text-gray-900 mb-2">
                {bonificationStatus.goldStatus.achieved
                  ? t("bonifications.goldAchieved")
                  : bonificationStatus.silverStatus.achieved
                    ? t("bonifications.silverAchieved")
                    : t("bonifications.workingTowards")}
              </h2>

              <p className="text-gray-600">
                {bonificationStatus.goldStatus.achieved
                  ? t("bonifications.goldAchievedMessage")
                  : bonificationStatus.silverStatus.achieved
                    ? t("bonifications.silverAchievedMessage")
                    : t("bonifications.workingTowardsMessage")}
              </p>
            </div>
          </Card>
        </div>
      )}

      {activeTab === "overview" && allColporterStatuses && (
        <div className="space-y-6">
          {/* Program Selection for Admin/Supervisor */}
          {isAdminOrSupervisor && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Button
                  variant="outline"
                  onClick={() => setShowProgramSelector(!showProgramSelector)}
                  leftIcon={<Settings size={16} />}
                  rightIcon={
                    <ChevronDown 
                      size={16} 
                      className={`transition-transform ${showProgramSelector ? 'rotate-180' : ''}`} 
                    />
                  }
                >
                  Configurar Programas ({bonificationConfig?.selectedProgramIds?.length || 0} seleccionados)
                </Button>
              </div>

              {showProgramSelector && availablePrograms && (
                <Card>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-semibold text-gray-900">Seleccionar Programas</h3>
                      <span className="text-sm text-gray-500">
                        {tempSelectedPrograms.length} de {availablePrograms.length} programas seleccionados
                      </span>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {availablePrograms.map((prog) => {
                        const isSelected = tempSelectedPrograms.includes(prog.id);
                        const isCurrent = program?.id === prog.id;
                        
                        return (
                          <div
                            key={prog.id}
                            onClick={() => handleProgramToggle(prog.id)}
                            className={`p-4 border-2 rounded-lg cursor-pointer transition-all ${
                              isSelected 
                                ? 'border-primary-500 bg-primary-50' 
                                : 'border-gray-200 hover:border-primary-300 hover:bg-primary-50/30'
                            }`}
                          >
                            <div className="flex items-start justify-between mb-3">
                              <div className="flex-1 min-w-0">
                                <h4 className="font-medium text-gray-900 truncate">{prog.name}</h4>
                                <div className="flex items-center gap-2 mt-1">
                                  {isCurrent && (
                                    <Badge variant="info" size="sm">Actual</Badge>
                                  )}
                                  {Boolean(prog.is_active) && (
                                    <Badge variant="success" size="sm">Activo</Badge>
                                  )}
                                </div>
                              </div>
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => handleProgramToggle(prog.id)}
                                className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>
                            
                            <div className="space-y-2 text-sm text-gray-600">
                              <div className="flex items-center gap-1">
                                <Calendar size={14} />
                                <span>
                                  {new Date(prog.start_date).toLocaleDateString()} - {new Date(prog.end_date).toLocaleDateString()}
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <Target size={14} />
                                <span>Meta: ${Number(prog.financial_goal).toLocaleString()}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    
                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                      <Button
                        variant="outline"
                        onClick={handleCancelConfiguration}
                      >
                        Cancelar
                      </Button>
                      <Button
                        variant="primary"
                        onClick={handleSaveConfiguration}
                        disabled={tempSelectedPrograms.length === 0}
                        isLoading={isSaving}
                      >
                        Guardar Configuración
                      </Button>
                    </div>
                  </div>
                </Card>
              )}

              {/* Information Banners */}
              {bonificationConfig?.selectedProgramIds && bonificationConfig.selectedProgramIds.length > 0 ? (
                <div className="p-4 bg-success-50 border border-success-200 rounded-lg flex items-start gap-3">
                  <CheckCircle className="text-success-500 flex-shrink-0 mt-0.5" size={20} />
                  <div className="text-sm text-success-700">
                    <p className="font-medium">Programas Seleccionados</p>
                    <p>
                      Las bonificaciones se calcularán combinando datos de {bonificationConfig.selectedProgramIds.length} programa(s) seleccionado(s).
                      Los colportores pueden alcanzar bonificaciones trabajando en cualquiera de estos programas.
                    </p>
                  </div>
                </div>
              ) : (
                <div className="p-4 bg-warning-50 border border-warning-200 rounded-lg flex items-start gap-3">
                  <AlertTriangle className="text-warning-500 flex-shrink-0 mt-0.5" size={20} />
                  <div className="text-sm text-warning-700">
                    <p className="font-medium">No hay programas seleccionados</p>
                    <p>
                      Selecciona al menos un programa para ver las bonificaciones. 
                      Puedes combinar datos de múltiples programas para calcular bonificaciones acumuladas.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <div className="text-center">
                <div className="flex items-center justify-center mb-2">
                  <Trophy className="text-yellow-500" size={24} />
                </div>
                <p className="text-sm font-medium text-gray-500">{t("bonifications.goldAchieved")}</p>
                <p className="mt-1 text-2xl font-bold text-yellow-600">
                  {allColporterStatuses.filter((c) => c.goldStatus.achieved).length}
                </p>
              </div>
            </Card>

            <Card>
              <div className="text-center">
                <div className="flex items-center justify-center mb-2">
                  <Medal className="text-gray-400" size={24} />
                </div>
                <p className="text-sm font-medium text-gray-500">{t("bonifications.silverAchieved")}</p>
                <p className="mt-1 text-2xl font-bold text-gray-600">
                  {allColporterStatuses.filter((c) => c.silverStatus.achieved && !c.goldStatus.achieved).length}
                </p>
              </div>
            </Card>

            <Card>
              <div className="text-center">
                <div className="flex items-center justify-center mb-2">
                  <Target className="text-blue-500" size={24} />
                </div>
                <p className="text-sm font-medium text-gray-500">{t("bonifications.inProgress")}</p>
                <p className="mt-1 text-2xl font-bold text-blue-600">
                  {allColporterStatuses.filter((c) => !c.silverStatus.achieved).length}
                </p>
              </div>
            </Card>

            <Card>
              <div className="text-center">
                <div className="flex items-center justify-center mb-2">
                  <Gift className="text-purple-500" size={24} />
                </div>
                <p className="text-sm font-medium text-gray-500">{t("bonifications.totalBonifications")}</p>
                <p className="mt-1 text-2xl font-bold text-purple-600">
                  $
                  {formatNumber(
                    allColporterStatuses.filter((c) => c.goldStatus.achieved).length * 2160 +
                      allColporterStatuses.filter((c) => c.silverStatus.achieved && !c.goldStatus.achieved).length *
                        1496,
                  )}
                </p>
              </div>
            </Card>
          </div>

          <Card>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t("bonifications.colporter")}
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t("bonifications.currentHours")}
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t("bonifications.netDeposit")}
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t("bonifications.silver")}
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t("bonifications.gold")}
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t("bonifications.nextTarget")}
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {allColporterStatuses
                    .sort((a, b) => {
                      if (a.goldStatus.achieved && !b.goldStatus.achieved) return -1;
                      if (!a.goldStatus.achieved && b.goldStatus.achieved) return 1;
                      if (a.silverStatus.achieved && !b.silverStatus.achieved) return -1;
                      if (!a.silverStatus.achieved && b.silverStatus.achieved) return 1;
                      return b.currentNetAmount - a.currentNetAmount;
                    })
                    .map((colporter) => (
                      <tr
                        key={colporter.colporterId}
                        className={`hover:bg-gray-50 transition-colors ${
                          colporter.goldStatus.achieved
                            ? "bg-yellow-50/30"
                            : colporter.silverStatus.achieved
                              ? "bg-gray-50/30"
                              : ""
                        }`}
                      >
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <div className="flex">
                              {colporter.goldStatus.achieved && <Trophy className="text-yellow-500" size={20} />}
                              {colporter.silverStatus.achieved && !colporter.goldStatus.achieved && (
                                <Medal className="text-gray-400" size={20} />
                              )}
                              {!colporter.silverStatus.achieved && <Target className="text-gray-300" size={20} />}
                            </div>
                            <div>
                              <div className="font-medium text-gray-900">{colporter.colporterName}</div>
                              <div className="text-xs text-gray-500">
                                {colporter.goldStatus.achieved
                                  ? t("bonifications.goldCompleted")
                                  : colporter.silverStatus.achieved
                                    ? t("bonifications.silverCompleted")
                                    : t("bonifications.inProgress")}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          <Badge variant="primary">{colporter.currentHours}</Badge>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          <Badge variant="success">${formatNumber(colporter.currentNetAmount)}</Badge>
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          {colporter.silverStatus.achieved ? (
                            <Badge variant="success">{t("bonifications.achieved")}</Badge>
                          ) : (
                            <div className="text-xs">
                              <div className="text-gray-600">
                                {Math.round(
                                  Math.min(colporter.silverStatus.hoursProgress, colporter.silverStatus.amountProgress),
                                )}
                                %
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          {colporter.goldStatus.achieved ? (
                            <Badge variant="warning">{t("bonifications.achieved")}</Badge>
                          ) : (
                            <div className="text-xs">
                              <div className="text-gray-600">
                                {Math.round(
                                  Math.min(colporter.goldStatus.hoursProgress, colporter.goldStatus.amountProgress),
                                )}
                                %
                              </div>
                            </div>
                          )}
                        </td>
                        <td className="px-4 py-3 whitespace-nowrap text-center">
                          {colporter.nextTarget === "COMPLETED" ? (
                            <Badge variant="success">{t("bonifications.completed")}</Badge>
                          ) : (
                            <Badge variant={colporter.nextTarget === "GOLD" ? "warning" : "primary"}>
                              {colporter.nextTarget === "GOLD" ? t("bonifications.gold") : t("bonifications.silver")}
                            </Badge>
                          )}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          </Card>
        </div>
      )}

      {!bonificationStatus && !allColporterStatuses && (
        <Card>
          <div className="text-center py-12">
            <Award size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">{t("bonifications.noData")}</h3>
            <p className="text-sm text-gray-500">{t("bonifications.noDataMessage")}</p>
          </div>
        </Card>
      )}
    </div>
  );
};

export default BonificationsPage;