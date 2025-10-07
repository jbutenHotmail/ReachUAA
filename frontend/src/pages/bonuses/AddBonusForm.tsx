import type React from "react";
import { useState, useEffect, useMemo } from "react";
import { X, Users, TrendingUp, DollarSign } from "lucide-react";
import { useProgramStore } from "../../stores/programStore";
import { useBonusStore } from "../../stores/bonusStore";
import { useUserStore } from "../../stores/userStore";
import { useTransactionStore } from "../../stores/transactionStore";
import Button from "../../components/ui/Button";
import Input from "../../components/ui/Input";
import Card from "../../components/ui/Card";
import Badge from "../../components/ui/Badge";
import { formatNumber } from "../../utils/numberUtils";

interface AddBonusFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

interface LeaderShare {
  leaderId: string;
  leaderName: string;
  totalSales: number;
  percentage: number;
  shareAmount: number;
}

const AddBonusForm: React.FC<AddBonusFormProps> = ({ onClose, onSuccess }) => {
  const { program } = useProgramStore();
  const { createBonus } = useBonusStore();
  const { fetchPeople, getColporters, getLeaders, werePeopleFetched, isLoading: isLoadingPeople } = useUserStore();
  const { transactions, fetchTransactions, wereTransactionsFetched } = useTransactionStore();

  const [formData, setFormData] = useState({
    distribution_type: "SHARED" as "DIRECT" | "SHARED",
    person_id: "",
    person_type: "COLPORTER" as "COLPORTER" | "LEADER",
    amount: "",
    description: "",
    bonus_date: new Date().toISOString().split("T")[0],
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!werePeopleFetched && program) {
      fetchPeople(program.id);
    }
    if (program && !wereTransactionsFetched) {
      fetchTransactions();
    }
  }, [werePeopleFetched, fetchPeople, wereTransactionsFetched, fetchTransactions, program]);

  const colporters = getColporters(program?.id);
  const leaders = getLeaders(program?.id);

  const availablePeople = formData.person_type === "COLPORTER" ? colporters : leaders;

  const leaderShares = useMemo<LeaderShare[]>(() => {
    if (!program || !formData.amount || parseFloat(formData.amount) <= 0 || formData.distribution_type !== "SHARED") {
      return [];
    }

    const approvedTransactions = transactions.filter(
      (t) => t.status === "APPROVED" && t.programId === program.id
    );

    const leaderSalesMap = new Map<string, LeaderShare>();

    approvedTransactions.forEach((transaction) => {
      const leaderId = JSON.stringify(transaction.leaderId);
      const leaderName = transaction.leaderName;

      if (!leaderId || !leaderName) return;

      const sales = Number(transaction.total);

      if (!leaderSalesMap.has(leaderId)) {
        leaderSalesMap.set(leaderId, {
          leaderId,
          leaderName,
          totalSales: 0,
          percentage: 0,
          shareAmount: 0,
        });
      }

      const leader = leaderSalesMap.get(leaderId)!;
      leader.totalSales += sales;
    });

    const totalSales = Array.from(leaderSalesMap.values()).reduce(
      (sum, leader) => sum + leader.totalSales,
      0
    );

    if (totalSales === 0) {
      return [];
    }

    const bonusTotal = parseFloat(formData.amount);

    const leadersList = Array.from(leaderSalesMap.values()).map((leader) => ({
      ...leader,
      percentage: (leader.totalSales / totalSales) * 100,
      shareAmount: (leader.totalSales / totalSales) * bonusTotal,
    }));

    return leadersList.sort((a, b) => b.totalSales - a.totalSales);
  }, [program, transactions, formData.amount, formData.distribution_type]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.person_id || !formData.amount || !formData.bonus_date) {
      setError("Por favor complete todos los campos requeridos");
      return;
    }

    if (parseFloat(formData.amount) <= 0) {
      setError("El monto del bono debe ser mayor a 0");
      return;
    }

    if (!program) {
      setError("No hay un programa activo seleccionado");
      return;
    }

    if (formData.distribution_type === "SHARED" && leaderShares.length === 0) {
      setError("No hay líderes con ventas para compartir el costo del bono");
      return;
    }

    setIsSubmitting(true);

    try {
      const distributions = formData.distribution_type === "SHARED"
        ? leaderShares.map(leader => ({
            leader_id: leader.leaderId === 'program' ? null : parseInt(leader.leaderId),
            amount: leader.shareAmount,
            percentage: leader.percentage
          }))
        : undefined;

      await createBonus({
        program_id: program.id,
        person_id: parseInt(formData.person_id),
        amount: parseFloat(formData.amount),
        description: formData.description || undefined,
        bonus_date: formData.bonus_date,
        distributions,
      });

      onSuccess();
      onClose();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message || "Error al crear el bono");
      } else {
        setError("Error al crear el bono");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
      ...(name === "person_type" && { person_id: "" }),
    }));
  };

  const totalShared = leaderShares.reduce((sum, leader) => sum + leader.shareAmount, 0);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl font-bold text-gray-900">Agregar Bono</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors">
            <X size={24} />
          </button>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-danger-50 border border-danger-200 rounded-lg text-danger-700 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de Pago <span className="text-danger-500">*</span>
              </label>
              <select
                name="distribution_type"
                value={formData.distribution_type}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              >
                {/* <option value="DIRECT">Directo - Sale del programa</option> */}
                <option value="SHARED">Compartido - Los líderes pagan proporcionalmente</option>
              </select>
              <p className="text-xs text-gray-500 mt-1">
                {formData.distribution_type === "DIRECT"
                  ? "El bono sale directamente de los fondos del programa"
                  : "El costo del bono se divide proporcionalmente entre los líderes según sus ventas"}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {formData.distribution_type === "SHARED" ? "Monto Total del Bono" : "Monto"} <span className="text-danger-500">*</span>
              </label>
              <Input
                type="number"
                name="amount"
                value={formData.amount}
                onChange={handleChange}
                placeholder="0.00"
                step="0.01"
                min="0.01"
                required
              />
              {formData.distribution_type === "SHARED" && (
                <p className="text-xs text-gray-500 mt-1">
                  Ingrese el monto para ver cómo se distribuirá entre los líderes
                </p>
              )}
            </div>
          </div>

          {formData.distribution_type === "SHARED" && (
            <>
              {!wereTransactionsFetched && formData.amount && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-sm">
                  Cargando distribución de costos...
                </div>
              )}

              {wereTransactionsFetched && leaderShares.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                  <div className="flex items-center gap-2 mb-2">
                    <Users className="text-amber-600" size={16} />
                    <h3 className="font-semibold text-gray-900 text-sm">Distribución del Costo entre Líderes</h3>
                  </div>

                  <div className="space-y-1 max-h-48 overflow-y-auto">
                    {leaderShares.map((leader) => (
                      <div key={leader.leaderId} className="bg-white rounded p-2 border border-gray-200 text-sm">
                        <div className="flex justify-between items-start">
                          <div className="flex-1 min-w-0">
                            <p className="font-medium text-gray-900 truncate">{leader.leaderName}</p>
                            <div className="flex items-center gap-1 mt-0.5">
                              <Badge variant="info">
                                <TrendingUp size={10} className="mr-0.5" />
                                {leader.percentage.toFixed(1)}%
                              </Badge>
                              <Badge variant="secondary">
                                <DollarSign size={10} className="mr-0.5" />
                                {formatNumber(leader.totalSales)} en ventas
                              </Badge>
                            </div>
                          </div>
                          <div className="text-right ml-2">
                            <p className="text-xs text-gray-500">Paga</p>
                            <p className="text-sm font-bold text-danger-600">
                              -${formatNumber(leader.shareAmount)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {formData.amount && leaderShares.length === 0 && wereTransactionsFetched && (
                <div className="p-3 bg-warning-50 border border-warning-200 rounded-lg text-warning-700 text-sm">
                  No hay líderes con ventas para compartir el costo del bono
                </div>
              )}
            </>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tipo de Persona <span className="text-danger-500">*</span>
              </label>
              <select
                name="person_type"
                value={formData.person_type}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                required
              >
                <option value="COLPORTER">Colportor</option>
                <option value="LEADER">Líder</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {formData.person_type === "COLPORTER" ? "Colportor" : "Líder"} que recibirá el bono <span className="text-danger-500">*</span>
              </label>
              <select
                name="person_id"
                value={formData.person_id}
                onChange={handleChange}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
                required
                disabled={isLoadingPeople}
              >
                <option value="">
                  {isLoadingPeople
                    ? "Cargando..."
                    : `Seleccione ${formData.person_type === "COLPORTER" ? "un colportor" : "un líder"}`}
                </option>
                {availablePeople.map((person) => (
                  <option key={person.id} value={person.id}>
                    {person.name} {person.apellido}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Fecha <span className="text-danger-500">*</span>
            </label>
            <Input type="date" name="bonus_date" value={formData.bonus_date} onChange={handleChange} required />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
              rows={3}
              placeholder="Motivo o descripción del bono..."
            />
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancelar
            </Button>
            <Button type="submit" variant="primary" disabled={isSubmitting} className="flex-1">
              {isSubmitting ? "Guardando..." : "Agregar Bono"}
            </Button>
          </div>
        </form>
      </Card>
    </div>
  );
};

export default AddBonusForm;