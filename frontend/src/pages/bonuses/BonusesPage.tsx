import React from "react";
import { useState, useEffect } from "react";
import { Plus, Gift, Trash2, Calendar, DollarSign, User, RefreshCw, Info, ChevronDown, ChevronRight, TrendingUp } from "lucide-react";
import { useAuthStore } from "../../stores/authStore";
import { useProgramStore } from "../../stores/programStore";
import { useBonusStore } from "../../stores/bonusStore";
import Card from "../../components/ui/Card";
import Button from "../../components/ui/Button";
import Badge from "../../components/ui/Badge";
import LoadingScreen from "../../components/ui/LoadingScreen";
import AddBonusForm from "./AddBonusForm";
import { formatNumber } from "../../utils/numberUtils";
import { format } from "date-fns";
import { UserRole } from "../../types";
import { api } from "../../api";
import clsx from "clsx";

const BonusesPage: React.FC = () => {
  const { user } = useAuthStore();
  const { program } = useProgramStore();
  const { bonuses, isLoading, error, fetchBonuses, deleteBonus, wereBonusesFetched } = useBonusStore();

  const [showAddForm, setShowAddForm] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [expandedBonuses, setExpandedBonuses] = useState<Set<number>>(new Set());
  const [bonusDistributions, setBonusDistributions] = useState<Record<number, any[]>>({});
  const [loadingDistributions, setLoadingDistributions] = useState<Set<number>>(new Set());

  const isAdmin = user?.role === UserRole.ADMIN;

  useEffect(() => {
    if (!wereBonusesFetched && program) {
      fetchBonuses(program.id);
    }
  }, [program, wereBonusesFetched, fetchBonuses]);

  const handleRefresh = async () => {
    if (!program) return;

    setIsRefreshing(true);
    try {
      await fetchBonuses(program.id);
    } catch (error) {
      console.error("Error refreshing bonuses:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleDelete = async (bonusId: number) => {
    if (!confirm("¿Está seguro de que desea eliminar este bono?")) {
      return;
    }

    try {
      await deleteBonus(bonusId);
    } catch (err: unknown) {
      if (err instanceof Error) {
        alert(err.message || "Error al eliminar el bono");
      } else {
        alert("Error al eliminar el bono");
      }
    }
  };

  const totalBonuses = bonuses.reduce((sum, bonus) => sum + bonus.amount, 0);

  const toggleBonusExpansion = async (bonusId: number) => {
    const newExpanded = new Set(expandedBonuses);
    if (expandedBonuses.has(bonusId)) {
      newExpanded.delete(bonusId);
      setExpandedBonuses(newExpanded);
    } else {
      newExpanded.add(bonusId);
      setExpandedBonuses(newExpanded);
      if (!bonusDistributions[bonusId]) {
        setLoadingDistributions((prev) => new Set(prev).add(bonusId));
        try {
          const distributions = await api.get(`/bonuses/${bonusId}/distributions`, {
            params: { programId: program?.id },
          });
          setBonusDistributions((prev) => ({
            ...prev,
            [bonusId]: distributions,
          }));
        } catch (error) {
          console.error("Error fetching bonus distributions:", error);
        } finally {
          setLoadingDistributions((prev) => {
            const newSet = new Set(prev);
            newSet.delete(bonusId);
            return newSet;
          });
        }
      }
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Card className="max-w-md text-center">
          <Gift className="mx-auto text-gray-400 mb-4" size={64} />
          <h2 className="text-xl font-bold text-gray-900 mb-2">Acceso Restringido</h2>
          <p className="text-gray-600">Solo los administradores pueden acceder a la gestión de bonos.</p>
        </Card>
      </div>
    );
  }

  if (isLoading) {
    return <LoadingScreen message="Cargando bonos..." />;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <Gift className="text-primary-600" size={28} />
            Gestión de Bonos
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Los bonos se distribuyen automáticamente entre los líderes según sus ganancias
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            leftIcon={<RefreshCw size={18} className={isRefreshing ? "animate-spin" : ""} />}
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            Actualizar
          </Button>
          <Button variant="primary" leftIcon={<Plus size={18} />} onClick={() => setShowAddForm(true)}>
            Agregar Bono
          </Button>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-danger-50 border border-danger-200 rounded-lg text-danger-700">
          {error}
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <Info className="text-blue-600 flex-shrink-0 mt-0.5" size={20} />
          <div className="text-sm text-blue-800">
            <p className="font-semibold mb-1">¿Cómo funcionan los bonos?</p>
            <p>
              Los bonos se distribuyen automáticamente entre los líderes del programa según sus ganancias acumuladas.
              Cada líder recibe un porcentaje proporcional del monto total del bono basado en sus ganancias totales en el programa.
            </p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <Gift className="text-primary-600" size={24} />
            </div>
            <p className="text-sm font-medium text-gray-500">Total de Bonos</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">{bonuses.length}</p>
          </div>
        </Card>

        <Card>
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <DollarSign className="text-success-600" size={24} />
            </div>
            <p className="text-sm font-medium text-gray-500">Monto Total</p>
            <p className="mt-1 text-2xl font-bold text-success-600">${formatNumber(totalBonuses)}</p>
          </div>
        </Card>

        <Card>
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <User className="text-blue-600" size={24} />
            </div>
            <p className="text-sm font-medium text-gray-500">Colportores Beneficiados</p>
            <p className="mt-1 text-2xl font-bold text-blue-600">
              {new Set(bonuses.map((b) => b.person_id)).size}
            </p>
          </div>
        </Card>
      </div>

      <Card>
        {bonuses.length === 0 ? (
          <div className="text-center py-12">
            <Gift size={48} className="mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No hay bonos registrados</h3>
            <p className="text-sm text-gray-500 mb-4">
              Comienza agregando bonos adicionales para los colportores del programa
            </p>
            <Button variant="primary" leftIcon={<Plus size={18} />} onClick={() => setShowAddForm(true)}>
              Agregar Primer Bono
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Colportor
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Monto
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Descripción
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Creado Por
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {bonuses.map((bonus) => {
                  const hasDistribution = bonusDistributions[bonus.id] && bonusDistributions[bonus.id].length > 0;
                  const canExpand = hasDistribution || (!bonusDistributions[bonus.id] && !loadingDistributions.has(bonus.id));

                  return (
                  <React.Fragment key={bonus.id}>
                  <tr
                    className={clsx(
                      "hover:bg-gray-50 transition-colors",
                      canExpand && "cursor-pointer"
                    )}
                    onClick={() => canExpand && toggleBonusExpansion(bonus.id)}
                  >
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {canExpand && (
                          <div className="text-primary-600">
                            {expandedBonuses.has(bonus.id) ? (
                              <ChevronDown size={16} />
                            ) : (
                              <ChevronRight size={16} />
                            )}
                          </div>
                        )}
                        <User className="text-gray-400" size={16} />
                        <div>
                          <span className="font-medium text-gray-900">{bonus.person_name}</span>
                          {hasDistribution && (
                            <div className="text-xs text-primary-600 font-medium">Costo Compartido</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      <Badge variant="success">${formatNumber(bonus.amount)}</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm text-gray-600 max-w-xs truncate">
                        {bonus.description || (
                          <span className="text-gray-400 italic">Sin descripción</span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-1 text-sm text-gray-600">
                        <Calendar size={14} />
                        {format(new Date(bonus.bonus_date), "dd/MM/yyyy")}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      <div className="text-sm text-gray-600">{bonus.created_by_name}</div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      <Button
                        variant="danger"
                        size="sm"
                        leftIcon={<Trash2 size={14} />}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(bonus.id);
                        }}
                      >
                        Eliminar
                      </Button>
                    </td>
                  </tr>
                  {expandedBonuses.has(bonus.id) && (
                    <>
                      {loadingDistributions.has(bonus.id) ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-3 text-center">
                            <div className="flex items-center justify-center gap-2">
                              <RefreshCw size={16} className="animate-spin text-primary-600" />
                              <span className="text-sm text-gray-500">Cargando distribución...</span>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        bonusDistributions[bonus.id]?.map((dist) => (
                          <tr key={dist.id} className="bg-amber-50/50 border-l-4 border-amber-300">
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                              <div className="pl-6 flex items-center gap-2">
                                <User className="text-gray-400" size={14} />
                                {dist.leader_name}
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-center">
                              <Badge variant="danger" size="sm">
                                -${formatNumber(dist.amount)}
                              </Badge>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-600">
                              <div className="pl-6 flex items-center gap-1">
                                <TrendingUp size={14} className="text-amber-600" />
                                <span>Pago proporcional ({formatNumber(dist.percentage)}%)</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-center">
                              <Badge variant="secondary" size="sm">
                                Parte del costo
                              </Badge>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-center">
                              <span className="text-xs text-gray-500">-</span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-center">
                              <span className="text-xs text-gray-400 italic">Distribución automática</span>
                            </td>
                          </tr>
                        ))
                      )}
                    </>
                  )}
                  </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      {showAddForm && <AddBonusForm onClose={() => setShowAddForm(false)} onSuccess={() => program && fetchBonuses(program.id)} />}
    </div>
  );
};

export default BonusesPage;
