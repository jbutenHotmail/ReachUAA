import type React from "react";
import { useState, useEffect, useMemo } from "react";
import { X, Users, TrendingUp, DollarSign } from "lucide-react";
import { useProgramStore } from "../../stores/programStore";
import { useBonusStore } from "../../stores/bonusStore";
import { useUserStore } from "../../stores/userStore";
import { useTransactionStore } from "../../stores/transactionStore";
import { useLeaderPercentageStore } from "../../stores/leaderPercentageStore";
import { useExpenseStore } from "../../stores/expenseStore";
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
  totalEarnings: number;
  percentage: number;
  shareAmount: number;
}

const AddBonusForm: React.FC<AddBonusFormProps> = ({ onClose, onSuccess }) => {
  const { program } = useProgramStore();
  const { createBonus } = useBonusStore();
  const { fetchPeople, getColporters, getLeaders, werePeopleFetched } = useUserStore();
  const { transactions, fetchTransactions, wereTransactionsFetched } = useTransactionStore();
  const { leaderPercentages, fetchLeaderPercentages, wereLeaderPercentagesFetched } = useLeaderPercentageStore();
  const { createExpense } = useExpenseStore();

  const [formData, setFormData] = useState({
    distribution_type: "DIRECT" as "DIRECT" | "SHARED",
    person_id: "",
    person_type: "COLPORTER" as "COLPORTER" | "LEADER",
    amount: "",
    description: "",
    bonus_date: new Date().toISOString().split("T")[0],
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!werePeopleFetched) {
      fetchPeople();
    }
    if (program && !wereTransactionsFetched) {
      fetchTransactions({ programId: program.id });
    }
    if (program && !wereLeaderPercentagesFetched) {
      fetchLeaderPercentages(program.id);
    }
  }, [werePeopleFetched, fetchPeople, wereTransactionsFetched, fetchTransactions, program, wereLeaderPercentagesFetched, fetchLeaderPercentages]);

  const colporters = getColporters(program?.id);
  const leaders = getLeaders(program?.id);

  const availablePeople = formData.person_type === "COLPORTER" ? colporters : leaders;

  const defaultLeaderPercentage = program?.financialConfig?.leader_percentage
    ? parseFloat(program.financialConfig.leader_percentage)
    : 15;

  const leaderShares = useMemo<LeaderShare[]>(() => {
    if (!program || !formData.amount || parseFloat(formData.amount) <= 0 || formData.distribution_type !== "SHARED") {
      return [];
    }

    const approvedTransactions = transactions.filter(
      (t) => t.status === "APPROVED" && t.programId === program.id
    );

    const leaderEarningsMap = new Map<string, LeaderShare>();

    approvedTransactions.forEach((transaction) => {
      const leaderId = transaction.leaderId;
      const leaderName = transaction.leaderName;

      if (!leaderId || !leaderName) return;

      const customPercentage = leaderPercentages.find(
        (lp) => lp.leaderId === leaderId && lp.isActive && lp.programId === program.id
      );

      const percentage = customPercentage ? customPercentage.percentage : defaultLeaderPercentage;
      const earnings = Number(transaction.total) * (percentage / 100);

      if (!leaderEarningsMap.has(leaderId)) {
        leaderEarningsMap.set(leaderId, {
          leaderId,
          leaderName,
          totalEarnings: 0,
          percentage: 0,
          shareAmount: 0,
        });
      }

      const leader = leaderEarningsMap.get(leaderId)!;
      leader.totalEarnings += earnings;
    });

    const totalEarnings = Array.from(leaderEarningsMap.values()).reduce(
      (sum, leader) => sum + leader.totalEarnings,
      0
    );

    if (totalEarnings === 0) {
      return [];
    }

    const bonusTotal = parseFloat(formData.amount);

    const leadersList = Array.from(leaderEarningsMap.values()).map((leader) => ({
      ...leader,
      percentage: (leader.totalEarnings / totalEarnings) * 100,
      shareAmount: (leader.totalEarnings / totalEarnings) * bonusTotal,
    }));

    return leadersList.sort((a, b) => b.totalEarnings - a.totalEarnings);
  }, [program, transactions, leaderPercentages, defaultLeaderPercentage, formData.amount, formData.distribution_type]);

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
      setError("No hay líderes con ganancias para compartir el costo del bono");
      return;
    }

    setIsSubmitting(true);

    try {
      await createBonus({
        program_id: program.id,
        person_id: parseInt(formData.person_id),
        amount: parseFloat(formData.amount),
        description: formData.description || undefined,
        bonus_date: formData.bonus_date,
      });

      if (formData.distribution_type === "SHARED") {
        for (const leader of leaderShares) {
          await createExpense({
            leaderId: leader.leaderId,
            leaderName: leader.leaderName,
            amount: leader.shareAmount,
            motivo: `Bono compartido - ${formData.description || "Sin descripción"}`,
            category: "program",
            notes: `Pago proporcional del bono (${leader.percentage.toFixed(1)}%)`,
            date: formData.bonus_date,
            status: "APPROVED",
            programId: program.id,
          });
        }
      }

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
              <option value="DIRECT">Directo - Sale del programa</option>
              <option value="SHARED">Compartido - Los líderes pagan proporcionalmente</option>
            </select>
            <p className="text-xs text-gray-500 mt-1">
              {formData.distribution_type === "DIRECT"
                ? "El bono sale directamente de los fondos del programa"
                : "El costo del bono se divide proporcionalmente entre los líderes según sus ganancias"}
            </p>
          </div>

          {formData.distribution_type === "SHARED" && (
            <>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Monto Total del Bono <span className="text-danger-500">*</span>
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
                <p className="text-xs text-gray-500 mt-1">
                  Ingrese el monto para ver cómo se distribuirá entre los líderes
                </p>
              </div>

              {leaderShares.length > 0 && (
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-3">
                    <Users className="text-amber-600" size={18} />
                    <h3 className="font-semibold text-gray-900">Distribución del Costo entre Líderes</h3>
                  </div>

                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {leaderShares.map((leader) => (
                      <div key={leader.leaderId} className="bg-white rounded-lg p-3 border border-gray-200">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <p className="font-medium text-gray-900">{leader.leaderName}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge variant="info" size="sm">
                                <TrendingUp size={12} className="mr-1" />
                                {leader.percentage.toFixed(1)}%
                              </Badge>
                              <Badge variant="secondary" size="sm">
                                <DollarSign size={12} className="mr-1" />
                                {formatNumber(leader.totalEarnings)} ganado
                              </Badge>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-xs text-gray-500">Paga</p>
                            <p className="text-lg font-bold text-danger-600">
                              -${formatNumber(leader.shareAmount)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="mt-4 pt-3 border-t border-amber-200">
                    <div className="flex justify-between items-center">
                      <span className="text-sm font-medium text-gray-700">Total Compartido:</span>
                      <span className="text-lg font-bold text-danger-600">-${formatNumber(totalShared)}</span>
                    </div>
                  </div>
                </div>
              )}

              {formData.amount && leaderShares.length === 0 && (
                <div className="p-3 bg-warning-50 border border-warning-200 rounded-lg text-warning-700 text-sm">
                  No hay líderes con ganancias para compartir el costo del bono
                </div>
              )}
            </>
          )}

          {formData.distribution_type === "DIRECT" && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Monto <span className="text-danger-500">*</span>
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
            </div>
          )}

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
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              required
            >
              <option value="">Seleccione {formData.person_type === "COLPORTER" ? "un colportor" : "un líder"}</option>
              {availablePeople.map((person) => (
                <option key={person.id} value={person.id}>
                  {person.firstName} {person.lastName}
                </option>
              ))}
            </select>
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
