import React, { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import {
  Plus,
  Search,
  Utensils,
  FileStack as FirstAid,
  ShoppingBag,
  Wrench,
  Car,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  Cookie,
  Gift,
  ChevronDown,
  ChevronRight,
} from "lucide-react"
import Card from "../../components/ui/Card"
import Button from "../../components/ui/Button"
import Input from "../../components/ui/Input"
import Badge from "../../components/ui/Badge"
import AddExpenseForm from "./AddExpenseForm"
import { useAuthStore } from "../../stores/authStore"
import { type Expense, UserRole } from "../../types"
import { useExpenseStore } from "../../stores/expenseStore"
import LoadingScreen from "../../components/ui/LoadingScreen"
import { formatNumber } from "../../utils/numberUtils"
import { api } from "../../api"
import clsx from "clsx"
import { useProgramStore } from "../../stores/programStore"

// Default categories to ensure all are present
const defaultCategories = [
  "food",
  "health",
  "supplies",
  "maintenance",
  "fuel",
  "snacks",
  "incentivos",
]

interface AllExpensesProps {
  defaultCategory?: string
}

// Skeleton Component for Budget Info
const BudgetSkeleton: React.FC<{ count?: number }> = ({ count = 1 }) => {
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 animate-pulse">
      {Array.from({ length: count }).map((_, index) => (
        <div key={index} className="p-3 rounded-lg border border-gray-200 bg-gray-100 min-w-[150px]">
          <div className="flex items-center justify-between mb-2">
            <div className="h-4 bg-gray-300 rounded w-1/2"></div>
            <div className="h-4 bg-gray-300 rounded w-12"></div>
          </div>
          <div className="space-y-1">
            <div className="h-3 bg-gray-300 rounded w-3/4"></div>
            <div className="h-3 bg-gray-300 rounded w-1/2"></div>
          </div>
        </div>
      ))}
    </div>
  )
}

// Skeleton Component for Single Budget Info
const SingleBudgetSkeleton: React.FC = () => {
  return (
    <div className="p-3 rounded-lg border-l-4 border-gray-200 bg-gray-100 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 bg-gray-300 rounded-full"></div>
          <div className="h-4 bg-gray-300 rounded w-24"></div>
          <div className="h-4 bg-gray-300 rounded w-12"></div>
        </div>
        <div className="flex items-center gap-4">
          <div className="h-4 bg-gray-300 rounded w-20"></div>
          <div className="h-4 bg-gray-300 rounded w-24"></div>
        </div>
      </div>
      <div className="mt-2">
        <div className="w-full bg-gray-200 rounded-full h-1.5">
          <div className="h-1.5 bg-gray-300 rounded-full w-1/2"></div>
        </div>
      </div>
    </div>
  )
}

const AllExpenses: React.FC<AllExpensesProps> = ({ defaultCategory }) => {
  const { t } = useTranslation()
  const { user } = useAuthStore()
  const [searchTerm, setSearchTerm] = useState("")
  const [dateFilter, setDateFilter] = useState("")
  const [leaderFilter, setLeaderFilter] = useState("")
  const [forLeaderFilter, setForLeaderFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState("")
  const [categoryFilter, setSelectedCategory] = useState(defaultCategory || "")
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [expandedExpenses, setExpandedExpenses] = useState<Set<string>>(new Set())
  const [childExpenses, setChildExpenses] = useState<Record<string, any[]>>({})
  const [loadingChildren, setLoadingChildren] = useState<Set<string>>(new Set())
  const [budgetInfo, setBudgetInfo] = useState<{
    category: string
    budgetAmount: number
    currentSpending: number
    remaining: number
    percentageUsed: number
  } | null>(null)
  const [allBudgetsInfo, setAllBudgetsInfo] = useState<
    Array<{
      category: string
      budgetAmount: number
      currentSpending: number
      remaining: number
      percentageUsed: number
    }>
  >([])
  const [isLoadingAllBudgets, setIsLoadingAllBudgets] = useState(false)
  const [isLoadingSingleBudget, setIsLoadingSingleBudget] = useState(false)
  const { program } = useProgramStore()
  const {
    wereExpensesFetched,
    fetchExpenses,
    expenses,
    createExpense,
    updateExpense,
    approveExpense,
    rejectExpense,
    isLoading,
  } = useExpenseStore()
  const isAdmin = user?.role === UserRole.ADMIN

  useEffect(() => {
    !wereExpensesFetched && fetchExpenses()
  }, [fetchExpenses, wereExpensesFetched])

  // Update category filter when defaultCategory changes
  useEffect(() => {
    if (defaultCategory) {
      setSelectedCategory(defaultCategory)
    }
  }, [defaultCategory])

  useEffect(() => {
    if (program?.financialConfig?.expense_budgets) {
      loadAllBudgetsInfo()
    } else {
      // Initialize with default categories if no budgets are defined
      const defaultBudgets = defaultCategories.map((category) => ({
        category,
        budget_amount: 0,
      }))
      loadAllBudgetsInfo(defaultBudgets)
    }
  }, [program, expenses])

  // Load budget info when category filter changes
  useEffect(() => {
    if (categoryFilter && program?.financialConfig?.expense_budgets) {
      loadBudgetInfo()
    } else if (categoryFilter) {
      // Handle case where categoryFilter is set but no budgets are defined
      loadBudgetInfo(defaultCategories.includes(categoryFilter) ? [{ category: categoryFilter, budget_amount: 0 }] : [])
    } else {
      setBudgetInfo(null)
      setIsLoadingSingleBudget(false)
    }
  }, [categoryFilter, program])

  const loadAllBudgetsInfo = async (overrideBudgets?: { category: string; budget_amount: number }[]) => {
    const budgets = overrideBudgets || program?.financialConfig?.expense_budgets || []
    setIsLoadingAllBudgets(true)
    const budgetsInfo = []

    // Ensure all default categories are present
    let updatedBudgets = [...budgets]
    defaultCategories.forEach((category) => {
      if (!updatedBudgets.some((budget) => budget.category === category)) {
        updatedBudgets.push({ category, budget_amount: 0 })
      }
    })

    for (const budget of updatedBudgets) {
      let currentSpending = 0

      try {
        // Get current spending for this category (only program expenses)
        const response: Expense[] = await api.get("/expenses", {
          params: {
            category: budget.category,
            status: "APPROVED",
            programId: program?.id,
            leaderId: "program", // Only count program expenses for budget
          },
        })

        currentSpending = response.reduce((sum: number, expense: any) => sum + Number(expense.amount), 0)
      } catch (error) {
        console.error(`Error loading budget info for ${budget.category}:`, error)
        // Continue with currentSpending = 0 if API call fails
      }

      if (!budget || budget.budget_amount <= 0) {
        // Unlimited budget
        budgetsInfo.push({
          category: budget.category,
          budgetAmount: 0, // 0 indicates unlimited
          currentSpending,
          remaining: -1, // -1 indicates unlimited
          percentageUsed: 0, // 0 for unlimited
        })
      } else {
        // Limited budget
        const remaining = budget.budget_amount - currentSpending
        const percentageUsed = (currentSpending / budget.budget_amount) * 100

        budgetsInfo.push({
          category: budget.category,
          budgetAmount: budget.budget_amount,
          currentSpending,
          remaining,
          percentageUsed,
        })
      }
    }

    setAllBudgetsInfo(budgetsInfo)
    setIsLoadingAllBudgets(false)
  }

  const loadBudgetInfo = async (overrideBudgets?: { category: string; budget_amount: number }[]) => {
    if (!categoryFilter) return

    setIsLoadingSingleBudget(true)
    const budgets = overrideBudgets || program?.financialConfig?.expense_budgets || []
    const budget = budgets.find((b) => b.category === categoryFilter) || { category: categoryFilter, budget_amount: 0 }

    let currentSpending = 0
    try {
      // Get current spending for this category (only program expenses)
      const response: Expense[] = await api.get("/expenses", {
        params: {
          category: categoryFilter,
          status: "APPROVED",
          programId: program?.id,
          leaderId: "program", // Only count program expenses for budget
        },
      })

      currentSpending = response.reduce((sum: number, expense: any) => sum + Number(expense.amount), 0)
    } catch (error) {
      console.error("Error loading budget info:", error)
      // Continue with currentSpending = 0 if API call fails
    }

    if (!budget || budget.budget_amount <= 0) {
      // Unlimited budget
      setBudgetInfo({
        category: categoryFilter,
        budgetAmount: 0, // 0 indicates unlimited
        currentSpending,
        remaining: -1, // -1 indicates unlimited
        percentageUsed: 0, // 0 for unlimited
      })
    } else {
      // Limited budget
      const remaining = budget.budget_amount - currentSpending
      const percentageUsed = (currentSpending / budget.budget_amount) * 100

      setBudgetInfo({
        category: categoryFilter,
        budgetAmount: budget.budget_amount,
        currentSpending,
        remaining,
        percentageUsed,
      })
    }
    setIsLoadingSingleBudget(false)
  }

  const filteredExpenses = expenses.filter((expense) => {
    // Search term filter
    const matchesSearchTerm = searchTerm ? expense.motivo.toLowerCase().includes(searchTerm.toLowerCase()) : true

    // Category filter
    const matchesCategory = categoryFilter ? expense.category === categoryFilter : true

    // Date filter
    const matchesDate = dateFilter ? new Date(expense.date).toISOString().split("T")[0] === dateFilter : true

    // Leader filter
    const matchesLeader = leaderFilter
      ? leaderFilter === "program"
        ? !expense.leaderId // Program expenses have no leaderId
        : Number(expense.leaderId) === Number(leaderFilter)
      : true

    // For Leader filter (beneficiary)
    const matchesForLeader = forLeaderFilter ? Number(expense.forLeaderId) === Number(forLeaderFilter) : true

    // Status filter
    const matchesStatus = statusFilter
      ? expense.status === statusFilter || (!expense.status && statusFilter === "APPROVED") // Handle backward compatibility
      : true

    return matchesSearchTerm && matchesCategory && matchesDate && matchesLeader && matchesForLeader && matchesStatus
  })

  // Calculate totals - ONLY APPROVED EXPENSES
  const approvedExpenses = filteredExpenses.filter((e) => e.status === "APPROVED" || !e.status)
  const totalAmount = approvedExpenses.reduce((sum, expense) => Number(sum) + Number(expense.amount), 0)
  const averagePerDay = totalAmount / (approvedExpenses.length || 1)

  // Get unique leaders from expenses
  const uniqueLeaders = Array.from(new Set(expenses.filter((e) => e.leaderId).map((e) => e.leaderId)))
    .filter(Boolean)
    .map((id) => ({
      id: id as string,
      name: expenses.find((e) => e.leaderId === id)?.leaderName as string,
    }))

  // Get unique "for leaders" from expenses
  const uniqueForLeaders = Array.from(new Set(expenses.filter((e) => e.forLeaderId).map((e) => e.forLeaderId)))
    .filter(Boolean)
    .map((id) => ({
      id: id as string,
      name: expenses.find((e) => e.forLeaderId === id)?.forLeaderName as string,
    }))

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case "food":
        return <Utensils size={16} className="text-primary-600" />
      case "health":
        return <FirstAid size={16} className="text-danger-600" />
      case "supplies":
        return <ShoppingBag size={16} className="text-success-600" />
      case "maintenance":
        return <Wrench size={16} className="text-warning-600" />
      case "fuel":
        return <Car size={16} className="text-info-600" />
      case "snacks":
        return <Cookie size={16} className="text-purple-600" />
      case "incentivos":
        return <Gift size={16} className="text-yellow-600" />
      default:
        return null
    }
  }

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case "PENDING":
        return (
          <Badge variant="warning" leftIcon={<Clock size={14} />}>
            {t("expenses.pending")}
          </Badge>
        )
      case "APPROVED":
        return (
          <Badge variant="success" leftIcon={<CheckCircle size={14} />}>
            {t("expenses.approved")}
          </Badge>
        )
      case "REJECTED":
        return (
          <Badge variant="danger" leftIcon={<XCircle size={14} />}>
            {t("expenses.rejected")}
          </Badge>
        )
      default:
        return <Badge variant="success">{t("expenses.approved")}</Badge> // Default for backward compatibility
    }
  }

  const handleAddExpense = async (
    data: Omit<Expense, "id" | "createdBy" | "createdByName" | "createdAt" | "updatedAt">,
  ) => {
    try {
      await createExpense(data)
      setShowAddForm(false)
      setSuccess(t("expenses.successCreated"))
      setTimeout(() => setSuccess(null), 5000)
    } catch (error) {
      console.error("Error creating expense:", error)
      setError(t("expenses.errorCreate"))
      setTimeout(() => setError(null), 5000)
    }
  }

  const handleEditExpense = async (
    data: Omit<Expense, "id" | "createdBy" | "createdByName" | "createdAt" | "updatedAt">,
  ) => {
    if (editingExpense) {
      try {
        await updateExpense(editingExpense.id, data)
        setEditingExpense(null)
        setSuccess(t("expenses.successUpdated"))
        setTimeout(() => setSuccess(null), 5000)
      } catch (error) {
        console.error("Error updating expense:", error)
        setError(t("expenses.errorUpdate"))
        setTimeout(() => setError(null), 5000)
      }
    }
  }

  const handleApproveExpense = async (id: string) => {
    if (!isAdmin) return

    try {
      await approveExpense(id)

      // Update child expenses state if this is a child expense
      setChildExpenses((prev) => {
        const updated = { ...prev }
        Object.keys(updated).forEach((parentId) => {
          updated[parentId] = updated[parentId].map((child) =>
            child.id === id ? { ...child, status: "APPROVED" } : child,
          )
        })
        return updated
      })

      setSuccess(t("expenses.successApproved"))
      setTimeout(() => setSuccess(null), 5000)
    } catch (error) {
      console.error("Error approving expense:", error)
      setError(t("expenses.errorApprove"))
      setTimeout(() => setError(null), 5000)
    }
  }

  const handleRejectExpense = async (id: string) => {
    if (!isAdmin) return

    try {
      await rejectExpense(id)

      // Update child expenses state if this is a child expense
      setChildExpenses((prev) => {
        const updated = { ...prev }
        Object.keys(updated).forEach((parentId) => {
          updated[parentId] = updated[parentId].map((child) =>
            child.id === id ? { ...child, status: "REJECTED" } : child,
          )
        })
        return updated
      })

      setSuccess(t("expenses.successRejected"))
      setTimeout(() => setSuccess(null), 5000)
    } catch (error) {
      console.error("Error rejecting expense:", error)
      setError(t("expenses.errorReject"))
      setTimeout(() => setError(null), 5000)
    }
  }

  const handleBulkApprove = async (parentExpenseId: string) => {
    if (!isAdmin) return

    if (!window.confirm("¿Aprobar toda la distribución de incentivos?")) {
      return
    }

    try {
      // Get child expenses first
      const children = childExpenses[parentExpenseId] || []

      // If not loaded, load them first
      if (children.length === 0) {
        const childrenData = await api.get(`/expenses/${parentExpenseId}/children`, {
          params: { programId: program?.id },
        })
        setChildExpenses((prev) => ({
          ...prev,
          [parentExpenseId]: childrenData,
        }))

        // Approve all children
        for (const child of childrenData) {
          if (child.status === "PENDING") {
            await approveExpense(child.id)
          }
        }

        // Update child expenses state to approved
        setChildExpenses((prev) => ({
          ...prev,
          [parentExpenseId]: childrenData.map((child) => ({ ...child, status: "APPROVED" })),
        }))
      } else {
        // Approve all pending children
        for (const child of children) {
          if (child.status === "PENDING") {
            await approveExpense(child.id)
          }
        }

        // Update child expenses state to approved
        setChildExpenses((prev) => ({
          ...prev,
          [parentExpenseId]: prev[parentExpenseId].map((child) =>
            child.status === "PENDING" ? { ...child, status: "APPROVED" } : child,
          ),
        }))
      }

      // Also approve the parent expense
      await approveExpense(parentExpenseId)

      // Update the parent expense in the main expenses state
      useExpenseStore.setState((state) => ({
        expenses: state.expenses.map((expense) =>
          expense.id === parentExpenseId ? { ...expense, status: "APPROVED" } : expense,
        ),
      }))

      setSuccess("Distribución de incentivos aprobada completamente")
      setTimeout(() => setSuccess(null), 5000)
    } catch (error) {
      console.error("Error approving bulk expenses:", error)
      setError("Error al aprobar la distribución")
      setTimeout(() => setError(null), 5000)
    }
  }

  const handleBulkReject = async (parentExpenseId: string) => {
    if (!isAdmin) return

    if (!window.confirm("¿Rechazar toda la distribución de incentivos?")) {
      return
    }

    try {
      // Get child expenses first
      const children = childExpenses[parentExpenseId] || []

      // If not loaded, load them first
      if (children.length === 0) {
        const childrenData = await api.get(`/expenses/${parentExpenseId}/children`, {
          params: { programId: program?.id },
        })
        setChildExpenses((prev) => ({
          ...prev,
          [parentExpenseId]: childrenData,
        }))

        // Reject all children
        for (const child of childrenData) {
          if (child.status === "PENDING") {
            await rejectExpense(child.id)
          }
        }

        // Update child expenses state to rejected
        setChildExpenses((prev) => ({
          ...prev,
          [parentExpenseId]: childrenData.map((child) => ({ ...child, status: "REJECTED" })),
        }))
      } else {
        // Reject all pending children
        for (const child of children) {
          if (child.status === "PENDING") {
            await rejectExpense(child.id)
          }
        }

        // Update child expenses state to rejected
        setChildExpenses((prev) => ({
          ...prev,
          [parentExpenseId]: prev[parentExpenseId].map((child) =>
            child.status === "PENDING" ? { ...child, status: "REJECTED" } : child,
          ),
        }))
      }

      // Also reject the parent expense
      await rejectExpense(parentExpenseId)

      // Update the parent expense in the main expenses state
      useExpenseStore.setState((state) => ({
        expenses: state.expenses.map((expense) =>
          expense.id === parentExpenseId ? { ...expense, status: "REJECTED" } : expense,
        ),
      }))

      setSuccess("Distribución de incentivos rechazada completamente")
      setTimeout(() => setSuccess(null), 5000)
    } catch (error) {
      console.error("Error rejecting bulk expenses:", error)
      setError("Error al rechazar la distribución")
      setTimeout(() => setError(null), 5000)
    }
  }

  const handleRefresh = async () => {
    setIsRefreshing(true)
    setError(null)
    setSuccess(null)
    try {
      // Force refresh by resetting the fetch flag and calling fetchExpenses
      useExpenseStore.setState({ wereExpensesFetched: false })
      await fetchExpenses()
      // Clear expanded state on refresh
      setExpandedExpenses(new Set())
      setChildExpenses({})
    } catch (error) {
    } finally {
      setIsRefreshing(false)
    }
  }

  const toggleExpenseExpansion = async (expenseId: string) => {
    const newExpanded = new Set(expandedExpenses)

    if (expandedExpenses.has(expenseId)) {
      // Collapse
      newExpanded.delete(expenseId)
      setExpandedExpenses(newExpanded)
    } else {
      // Expand - fetch child expenses if not already loaded
      newExpanded.add(expenseId)
      setExpandedExpenses(newExpanded)

      if (!childExpenses[expenseId]) {
        setLoadingChildren((prev) => new Set(prev).add(expenseId))
        try {
          const children = await api.get(`/expenses/${expenseId}/children`, {
            params: {
              programId: program?.id,
            },
          })
          setChildExpenses((prev) => ({
            ...prev,
            [expenseId]: children,
          }))
        } catch (error) {
          console.error("Error fetching child expenses:", error)
        } finally {
          setLoadingChildren((prev) => {
            const newSet = new Set(prev)
            newSet.delete(expenseId)
            return newSet
          })
        }
      }
    }
  }

  if (isLoading) {
    return <LoadingScreen message={t("expenses.loading")} />
  }

  if (error) {
    return (
      <div className="p-4 bg-danger-50 border border-danger-200 rounded-lg text-danger-700">
        <p className="font-medium">{t("expenses.errorTitle")}</p>
        <p>{error}</p>
      </div>
    )
  }

  // Calculate totals by status
  const pendingTotal = filteredExpenses
    .filter((e) => e.status === "PENDING")
    .reduce((sum, e) => Number(sum) + Number(e.amount), 0)
  const approvedTotal = filteredExpenses
    .filter((e) => e.status === "APPROVED" || !e.status)
    .reduce((sum, e) => Number(sum) + Number(e.amount), 0)

  return (
    <div className="space-y-6">
      {success && (
        <div className="p-4 bg-success-50 border border-success-200 rounded-lg text-success-700">
          <p className="font-medium">{success}</p>
        </div>
      )}

      {!categoryFilter && isLoadingAllBudgets ? (
        <Card>
          <div className="p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Resumen de Presupuestos</h3>
            <BudgetSkeleton count={defaultCategories.length} />
          </div>
        </Card>
      ) : !categoryFilter && allBudgetsInfo.length > 0 ? (
        <Card>
          <div className="p-4">
            <h3 className="text-sm font-medium text-gray-700 mb-3">Resumen de Presupuestos</h3>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3">
              {allBudgetsInfo.map((budget) => (
                <div
                  key={budget.category}
                  className={`p-3 rounded-lg border min-w-[150px] ${
                    budget.budgetAmount === 0
                      ? "border-blue-200 bg-blue-50"
                      : budget.percentageUsed >= 90
                        ? "border-danger-200 bg-danger-50"
                        : budget.percentageUsed >= 75
                          ? "border-warning-200 bg-warning-50"
                          : "border-success-200 bg-success-50"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-1 flex-1 min-w-0">
                      {getCategoryIcon(budget.category)}
                      <span
                        className="text-xs font-medium truncate sm:text-[11px] md:text-xs"
                        title={t(`expenses.${budget.category}`)}
                      >
                        {t(`expenses.${budget.category}`)}
                      </span>
                    </div>
                    {budget.budgetAmount === 0 ? (
                      <Badge variant="info" size="sm">
                        ∞
                      </Badge>
                    ) : (
                      <Badge
                        variant={
                          budget.percentageUsed >= 90 ? "danger" : budget.percentageUsed >= 75 ? "warning" : "success"
                        }
                        size="sm"
                      >
                        {formatNumber(budget.percentageUsed)}%
                      </Badge>
                    )}
                  </div>

                  <div className="space-y-1">
                    <div className="text-xs text-gray-600">
                      Gastado: <span className="font-medium">${formatNumber(budget.currentSpending)}</span>
                    </div>
                    {budget.budgetAmount > 0 && (
                      <div className="text-xs text-gray-600">
                        Límite: <span className="font-medium">${formatNumber(budget.budgetAmount)}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </Card>
      ) : null}

      {categoryFilter &&
        (isLoadingSingleBudget ? (
          <SingleBudgetSkeleton />
        ) : budgetInfo ? (
          <div
            className={`p-3 rounded-lg border-l-4 ${
              budgetInfo.budgetAmount === 0
                ? "bg-blue-50 border-blue-400"
                : budgetInfo.percentageUsed >= 90
                  ? "bg-danger-50 border-danger-400"
                  : budgetInfo.percentageUsed >= 75
                    ? "bg-warning-50 border-warning-400"
                    : "bg-success-50 border-success-400"
            }`}
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {getCategoryIcon(categoryFilter)}
                <span
                  className={`text-sm font-medium truncate ${
                    budgetInfo.budgetAmount === 0
                      ? "text-blue-700"
                      : budgetInfo.percentageUsed >= 90
                        ? "text-danger-700"
                        : budgetInfo.percentageUsed >= 75
                          ? "text-warning-700"
                          : "text-success-700"
                  }`}
                  title={t(`expenses.${categoryFilter}`)}
                >
                  {budgetInfo.budgetAmount === 0 ? "∞" : "💰"} {t(`expenses.${categoryFilter}`)}
                </span>
                {budgetInfo.budgetAmount === 0 ? (
                  <Badge variant="info" size="sm">
                    Sin límite
                  </Badge>
                ) : (
                  <Badge
                    variant={
                      budgetInfo.percentageUsed >= 90 ? "danger" : budgetInfo.percentageUsed >= 75 ? "warning" : "success"
                    }
                    size="sm"
                  >
                    {formatNumber(budgetInfo.percentageUsed)}%
                  </Badge>
                )}
              </div>

              <div className="flex items-center gap-4 text-sm">
                {budgetInfo.budgetAmount === 0 ? (
                  <span className="text-blue-700">
                    Gastado: <strong>${formatNumber(budgetInfo.currentSpending)}</strong>
                  </span>
                ) : (
                  <>
                    <span className="text-gray-600">
                      ${formatNumber(budgetInfo.currentSpending)} / ${formatNumber(budgetInfo.budgetAmount)}
                    </span>
                    <span className={`font-medium ${budgetInfo.remaining <= 0 ? "text-danger-600" : "text-success-600"}`}>
                      Disponible: ${formatNumber(budgetInfo.remaining)}
                    </span>
                  </>
                )}
              </div>
            </div>

            {budgetInfo.budgetAmount > 0 && (
              <div className="mt-2">
                <div className="w-full bg-gray-200 rounded-full h-1.5">
                  <div
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      budgetInfo.percentageUsed >= 90
                        ? "bg-danger-500"
                        : budgetInfo.percentageUsed >= 75
                          ? "bg-warning-500"
                          : "bg-success-500"
                    }`}
                    style={{ width: `${Math.min(budgetInfo.percentageUsed, 100)}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>
        ) : null)}

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-500">{t("expenses.amount")}</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">${formatNumber(totalAmount)}</p>
            <p className="mt-1 text-sm text-gray-500">{t("expenses.totalExpenses")}</p>
          </div>
        </Card>

        <Card>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-500">{t("expenses.pending")}</p>
            <p className="mt-2 text-3xl font-bold text-warning-600">${formatNumber(pendingTotal)}</p>
            <p className="mt-1 text-sm text-gray-500">{t("expenses.awaiting")}</p>
          </div>
        </Card>

        <Card>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-500">{t("expenses.approved")}</p>
            <p className="mt-2 text-3xl font-bold text-success-600">${formatNumber(approvedTotal)}</p>
            <p className="mt-1 text-sm text-gray-500">{t("expenses.confirmed")}</p>
          </div>
        </Card>

        <Card>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-500">{t("expenses.dailyAverage")}</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">${formatNumber(averagePerDay)}</p>
            <p className="mt-1 text-sm text-gray-500">{t("expenses.perDay")}</p>
          </div>
        </Card>
      </div>

      <Card>
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div className="flex flex-col sm:flex-row gap-4 flex-wrap">
              <Input
                placeholder={t("expenses.searchPlaceholder")}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                leftIcon={<Search size={18} />}
                className="w-full sm:w-64"
              />

              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="w-full sm:w-auto"
              />

              <select
                value={leaderFilter}
                onChange={(e) => setLeaderFilter(e.target.value)}
                className="block w-full sm:w-48 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              >
                <option value="">
                  {t("common.all")} {t("common.leader").toLowerCase()}s
                </option>
                <option value="program">{t("expenses.program")}</option>
                {uniqueLeaders.map((leader) => (
                  <option key={leader.id} value={leader.id}>
                    {leader.name}
                  </option>
                ))}
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="block w-full sm:w-48 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              >
                <option value="">{t("expenses.allStatuses")}</option>
                <option value="PENDING">{t("expenses.pending")}</option>
                <option value="APPROVED">{t("expenses.approved")}</option>
                <option value="REJECTED">{t("expenses.rejected")}</option>
              </select>

              <select
                value={forLeaderFilter}
                onChange={(e) => setForLeaderFilter(e.target.value)}
                className="block w-full sm:w-48 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              >
                <option value="">Todos los Beneficiarios</option>
                {uniqueForLeaders.map((leader) => (
                  <option key={leader.id} value={leader.id}>
                    {leader.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-shrink-0">
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  leftIcon={<RefreshCw size={18} className={isRefreshing ? "animate-spin" : ""} />}
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="w-full sm:w-auto"
                >
                  {t("common.refresh")}
                </Button>
                <Button
                  variant="primary"
                  leftIcon={<Plus size={18} />}
                  onClick={() => setShowAddForm(true)}
                  className="w-full sm:w-auto"
                >
                  {t("expenses.addExpense")}
                </Button>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t("expenses.date")}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Responsable / Beneficiario
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t("expenses.motivo")}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t("expenses.amount")}
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t("expenses.category")}
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t("expenses.status")}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t("transactions.notes")}
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t("expenses.actions")}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredExpenses.map((expense) => (
                  <React.Fragment key={expense.id}>
                    <tr
                      className={clsx(
                        expense.status === "PENDING"
                          ? "bg-yellow-50/50"
                          : expense.status === "REJECTED"
                            ? "bg-red-50/50"
                            : "",
                        expense.isParentExpense && "cursor-pointer hover:bg-gray-50 transition-colors",
                      )}
                      onClick={() => expense.isParentExpense && toggleExpenseExpansion(expense.id)}
                    >
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        {new Date(expense.date).toLocaleDateString()}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center gap-2">
                          {expense.isParentExpense ? (
                            <div className="text-primary-600">
                              {expandedExpenses.has(expense.id) ? (
                                <ChevronDown size={16} />
                              ) : (
                                <ChevronRight size={16} />
                              )}
                            </div>
                          ) : (
                            ""
                          )}
                          <div>
                            {expense.leaderName}
                            {expense.isParentExpense ? (
                              <div className="text-xs text-primary-600 font-medium">Distribución Proporcional</div>
                            ) : (
                              ""
                            )}
                            {expense.forLeaderName && (
                              <div className="text-xs text-gray-500">Para: {expense.forLeaderName}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">{expense.motivo}</td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                        ${formatNumber(expense.amount)}
                        {expense.isParentExpense ? <div className="text-xs text-gray-500">Total</div> : ""}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                        <Badge variant="primary" leftIcon={getCategoryIcon(expense.category)}>
                          {t(`expenses.${expense.category}`)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                        {getStatusBadge(expense.status)}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500 max-w-xs">
                        {expense.notes ? (
                          <div className="truncate" title={expense.notes}>
                            {expense.notes}
                          </div>
                        ) : (
                          <span className="text-gray-400 italic">Sin notas</span>
                        )}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                        {!expense.isParentExpense && expense.status === "PENDING" && isAdmin ? (
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              variant="success"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleApproveExpense(expense.id)
                              }}
                            >
                              <CheckCircle size={16} />
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleRejectExpense(expense.id)
                              }}
                            >
                              <XCircle size={16} />
                            </Button>
                          </div>
                        ) : (
                          ""
                        )}

                        {expense.isParentExpense && expense.status === "PENDING" && isAdmin ? (
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              variant="success"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleBulkApprove(expense.id)
                              }}
                              title="Aprobar toda la distribución"
                            >
                              <CheckCircle size={16} />
                            </Button>
                            <Button
                              variant="danger"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation()
                                handleBulkReject(expense.id)
                              }}
                              title="Rechazar toda la distribución"
                            >
                              <XCircle size={16} />
                            </Button>
                          </div>
                        ) : (
                          ""
                        )}

                        {!expense.isParentExpense && expense.status === "APPROVED" ? (
                          <Badge variant="success" size="sm">
                            <CheckCircle size={14} />
                          </Badge>
                        ) : (
                          ""
                        )}
                        {!expense.isParentExpense && expense.status === "REJECTED" ? (
                          <Badge variant="danger" size="sm">
                            <XCircle size={14} />
                          </Badge>
                        ) : (
                          ""
                        )}

                        {expense.isParentExpense && expense.status === "APPROVED" ? (
                          <div className="flex items-center justify-center gap-2">
                            <Badge variant="info" size="sm">
                              Ver Distribución
                            </Badge>
                          </div>
                        ) : (
                          ""
                        )}
                        {expense.isParentExpense && expense.status === "REJECTED" ? (
                          <div className="flex items-center justify-center gap-2">
                            <Badge variant="danger" size="sm">
                              Distribución Rechazada
                            </Badge>
                          </div>
                        ) : (
                          ""
                        )}
                      </td>
                    </tr>

                    {expense.isParentExpense && expandedExpenses.has(expense.id) ? (
                      <>
                        {loadingChildren.has(expense.id) ? (
                          <tr>
                            <td colSpan={8} className="px-4 py-3 text-center">
                              <div className="flex items-center justify-center gap-2">
                                <RefreshCw size={16} className="animate-spin text-primary-600" />
                                <span className="text-sm text-gray-500">Cargando distribución...</span>
                              </div>
                            </td>
                          </tr>
                        ) : (
                          childExpenses[expense.id]?.map((child) => (
                            <tr key={child.id} className="bg-gray-50/50 border-l-4 border-primary-300">
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                                <div className="pl-6">{new Date(child.date).toLocaleDateString()}</div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                                <div className="pl-6">{child.leaderName}</div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                                <div className="pl-6">{child.motivo}</div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium text-gray-700">
                                ${formatNumber(child.amount)}
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                                <Badge variant="secondary" size="sm">
                                  Parte
                                </Badge>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                                {getStatusBadge(child.status)}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-500 max-w-xs">
                                <div className="pl-6">
                                  {child.notes ? (
                                    <div className="truncate" title={child.notes}>
                                      {child.notes}
                                    </div>
                                  ) : (
                                    <span className="text-gray-400 italic">Sin notas</span>
                                  )}
                                </div>
                              </td>
                              <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                                <span className="text-xs text-gray-400 italic">Solo aprobación masiva</span>
                              </td>
                            </tr>
                          ))
                        )}
                      </>
                    ) : (
                      ""
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Card>

      {(showAddForm || editingExpense) && (
        <AddExpenseForm
          onClose={() => {
            setShowAddForm(false)
            setEditingExpense(null)
          }}
          onSubmit={editingExpense ? handleEditExpense : handleAddExpense}
          initialData={editingExpense || undefined}
        />
      )}
    </div>
  )
}

export default AllExpenses
