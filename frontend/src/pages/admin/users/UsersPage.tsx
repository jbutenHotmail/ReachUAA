"use client"

import React, { useState, useEffect } from "react"
import { useTranslation } from "react-i18next"
import {
  Users,
  Search,
  Download,
  UserPlus,
  Shield,
  ShieldCheck,
  Eye,
  Edit,
  Save,
  X,
  AlertCircle,
  Trash2,
  CheckCircle,
} from "lucide-react"
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getSortedRowModel,
  type SortingState,
  getFilteredRowModel,
} from "@tanstack/react-table"
import Card from "../../../components/ui/Card"
import Button from "../../../components/ui/Button"
import Input from "../../../components/ui/Input"
import Badge from "../../../components/ui/Badge"
import { UserRole, type User } from "../../../types"
import AddUserForm from "./AddUserForm"
import { useUserStore } from "../../../stores/userStore"
import LoadingScreen from "../../../components/ui/LoadingScreen"

const columnHelper = createColumnHelper<User>()

const UsersPage: React.FC = () => {
  const { t } = useTranslation()
  const [sorting, setSorting] = useState<SortingState>([])
  const [globalFilter, setGlobalFilter] = useState("")
  const [roleFilter, setRoleFilter] = useState<UserRole | "">("")
  const [statusFilter, setStatusFilter] = useState<"ACTIVE" | "INACTIVE" | "">("")
  const [editingUser, setEditingUser] = useState<string | null>(null)
  const [editingRole, setEditingRole] = useState<UserRole>(UserRole.VIEWER)
  const [showAddForm, setShowAddForm] = useState(false)
  const [editingUserData, setEditingUserData] = useState<User | null>(null)
  const [userError, setUserError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const { users, isLoading, error, fetchUsers, updateUser, deleteUser, createUser, wereUsersFetched } = useUserStore()

  // Clear feedback messages when component unmounts
  useEffect(() => {
    return () => {
      setUserError(null)
      setSuccess(null)
    }
  }, [])

  // Update local error state when store error changes
  useEffect(() => {
    if (error) {
      setUserError(error)
    }
  }, [error])

  useEffect(() => {
    !wereUsersFetched && fetchUsers()
  }, [fetchUsers, wereUsersFetched])

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN:
        return <Shield className="w-4 h-4" />
      case UserRole.SUPERVISOR:
        return <ShieldCheck className="w-4 h-4" />
      case UserRole.VIEWER:
        return <Eye className="w-4 h-4" />
      default:
        return <Users className="w-4 h-4" />
    }
  }

  const getRoleBadge = (role: UserRole) => {
    const variants = {
      [UserRole.ADMIN]: "danger",
      [UserRole.SUPERVISOR]: "primary",
      [UserRole.VIEWER]: "success",
    } as const

    return (
      <Badge variant={variants[role]} className="flex items-center gap-1">
        {getRoleIcon(role)}
        {role.toLowerCase()}
      </Badge>
    )
  }

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    try {
      await updateUser(userId, { role: newRole })
      setEditingUser(null)
      setSuccess(t("userForm.roleChangeSuccess"))
      setTimeout(() => setSuccess(null), 3000)
    } catch (error) {
      setUserError(error instanceof Error ? error.message : t("userForm.errorUpdatingRole"))
      setTimeout(() => setUserError(null), 5000)
    }
  }

  const handleStatusToggle = async (userId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE"
      await updateUser(userId, { status: newStatus })
      setSuccess(t("userForm.statusChangeSuccess"))
      setTimeout(() => setSuccess(null), 3000)
    } catch (error) {
      setUserError(error instanceof Error ? error.message : t("userForm.errorUpdatingStatus"))
      setTimeout(() => setUserError(null), 5000)
    }
  }

  const handleEditStart = (userId: string, currentRole: UserRole) => {
    setEditingUser(userId)
    setEditingRole(currentRole)
  }

  const handleEditCancel = () => {
    setEditingUser(null)
    setEditingRole(UserRole.VIEWER)
  }

  const handleEditUser = (user: User) => {
    setEditingUserData(user)
    setShowAddForm(true)
  }

  const handleAddUser = async (userData: any) => {
    try {
      await createUser(userData)
      setShowAddForm(false)
      setSuccess(t("userForm.createSuccess"))
      setTimeout(() => setSuccess(null), 3000)
    } catch (error) {
      setUserError(error instanceof Error ? error.message : t("userForm.errorCreating"))
      setTimeout(() => setUserError(null), 5000)
    }
  }

  const handleUpdateUser = async (userData: any) => {
    if (!editingUserData) return

    try {
      await updateUser(editingUserData.id, userData)
      setEditingUserData(null)
      setShowAddForm(false)
      setSuccess(t("userForm.updateSuccess"))
      setTimeout(() => setSuccess(null), 3000)
    } catch (error) {
      setUserError(error instanceof Error ? error.message : t("userForm.errorUpdating"))
      setTimeout(() => setUserError(null), 5000)
    }
  }

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm(t("userForm.deleteConfirmation"))) {
      return
    }

    try {
      await deleteUser(userId)
      setSuccess(t("userForm.deleteSuccess"))
      setTimeout(() => setSuccess(null), 3000)
    } catch (error) {
      setUserError(error instanceof Error ? error.message : t("userForm.errorDeleting"))
      setTimeout(() => setUserError(null), 5000)
    }
  }

  // Filter users based on search and filters
  const filteredUsers = React.useMemo(() => {
    return users?.filter((user) => {
      const matchesSearch =
        user.name?.toLowerCase().includes(globalFilter.toLowerCase()) ||
        user.email?.toLowerCase().includes(globalFilter.toLowerCase())
      const matchesRole = !roleFilter || user.role === roleFilter
      const matchesStatus = !statusFilter || user.status === statusFilter
      return matchesSearch && matchesRole && matchesStatus
    })
  }, [users, globalFilter, roleFilter, statusFilter])

  // Calculate role statistics
  const roleStats = users.reduce(
    (acc, user) => {
      acc[user.role] = (acc[user.role] || 0) + 1
      return acc
    },
    {} as Record<UserRole, number>,
  )

  const columns = [
    columnHelper.accessor("name", {
      header: "User",
      cell: (info) => (
        <div className="flex flex-col">
          <div className="font-medium text-gray-900">{info.getValue()}</div>
          <div className="text-sm text-gray-500">{info.row.original.email}</div>
        </div>
      ),
    }),
    columnHelper.accessor("personType", {
      header: "Type",
      cell: (info) => <Badge variant="secondary">{info.getValue() || "Admin"}</Badge>,
    }),
    columnHelper.accessor("role", {
      header: "Role",
      cell: (info) => (
        <div className="flex items-center gap-2">
          {editingUser === info.row.original.id ? (
            <div className="flex items-center gap-2">
              <select
                value={editingRole}
                onChange={(e) => setEditingRole(e.target.value as UserRole)}
                className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value={UserRole.ADMIN}>{t("userForm.roles.admin")}</option>
                <option value={UserRole.SUPERVISOR}>{t("userForm.roles.supervisor")}</option>
                <option value={UserRole.VIEWER}>{t("userForm.roles.viewer")}</option>
              </select>
              <Button size="sm" onClick={() => handleRoleChange(info.row.original.id, editingRole)}>
                <Save className="w-3 h-3" />
              </Button>
              <Button size="sm" variant="ghost" onClick={handleEditCancel}>
                <X className="w-3 h-3" />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {getRoleBadge(info.getValue())}
              <Button size="sm" variant="ghost" onClick={() => handleEditStart(info.row.original.id, info.getValue())}>
                <Edit className="w-3 h-3" />
              </Button>
            </div>
          )}
        </div>
      ),
    }),
    columnHelper.accessor("status", {
      header: "Status",
      cell: (info) => (
        <div className="flex items-center gap-2">
          <Badge variant={info.getValue() === "ACTIVE" ? "success" : "secondary"}>{info.getValue()}</Badge>
          <Button size="sm" variant="ghost" onClick={() => handleStatusToggle(info.row.original.id, info.getValue())}>
            <Edit className="w-3 h-3" />
          </Button>
        </div>
      ),
    }),
    columnHelper.accessor("lastLogin", {
      header: "Last Login",
      cell: (info) =>
        info.getValue() ? (
          <div className="flex flex-col">
            <div className="text-sm font-medium">{new Date(info.getValue() as string).toLocaleDateString()}</div>
            <div className="text-xs text-gray-500">
              {new Date(info.getValue() as string).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              })}
            </div>
          </div>
        ) : (
          <span className="text-gray-400">{t("userForm.neverLoggedIn")}</span>
        ),
    }),
    columnHelper.accessor("createdAt", {
      header: "Created",
      cell: (info) => new Date(info.getValue()).toLocaleDateString(),
    }),
    columnHelper.display({
      id: "actions",
      header: "Actions",
      cell: (info) => (
        <div className="flex items-center gap-1">
          <Button size="sm" variant="ghost" onClick={() => handleEditUser(info.row.original)}>
            <Edit className="w-4 h-4" />
          </Button>
          <Button size="sm" variant="ghost" onClick={() => handleDeleteUser(info.row.original.id)}>
            <Trash2 className="w-4 h-4" />
          </Button>
        </div>
      ),
    }),
  ]

  const table = useReactTable({
    data: filteredUsers,
    columns,
    state: {
      sorting,
      globalFilter,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  })

  if (isLoading) {
    return <LoadingScreen />
  }

  return (
    <div className="space-y-6">
      {success && (
        <div className="bg-green-50 border border-green-200 rounded-md p-4 flex items-center justify-between">
          <div className="flex items-center">
            <CheckCircle className="h-5 w-5 text-green-400 mr-2" />
            <span className="text-green-800">{success}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setSuccess(null)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}

      {userError && (
        <div className="bg-red-50 border border-red-200 rounded-md p-4 flex items-center justify-between">
          <div className="flex items-center">
            <AlertCircle className="h-5 w-5 text-red-400 mr-2" />
            <span className="text-red-800">{userError}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={() => setUserError(null)}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      )}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="flex items-center">
            <div className="p-2 bg-red-100 rounded-lg">
              <Shield className="w-6 h-6 text-red-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold">{t("userForm.roles.admin")}</h3>
              <p className="text-2xl font-bold text-red-600">{roleStats[UserRole.ADMIN] || 0}</p>
              <p className="text-sm text-gray-500">{t("userForm.roleDescriptions.admin")}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center">
            <div className="p-2 bg-blue-100 rounded-lg">
              <ShieldCheck className="w-6 h-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold">{t("userForm.roles.supervisor")}</h3>
              <p className="text-2xl font-bold text-blue-600">{roleStats[UserRole.SUPERVISOR] || 0}</p>
              <p className="text-sm text-gray-500">{t("userForm.roleDescriptions.supervisor")}</p>
            </div>
          </div>
        </Card>

        <Card className="p-4">
          <div className="flex items-center">
            <div className="p-2 bg-green-100 rounded-lg">
              <Eye className="w-6 h-6 text-green-600" />
            </div>
            <div className="ml-4">
              <h3 className="text-lg font-semibold">{t("userForm.roles.viewer")}</h3>
              <p className="text-2xl font-bold text-green-600">{roleStats[UserRole.VIEWER] || 0}</p>
              <p className="text-sm text-gray-500">{t("userForm.roleDescriptions.viewer")}</p>
            </div>
          </div>
        </Card>
      </div>
      {/* Header with Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Button variant="outline" leftIcon={<Download className="w-4 h-4 bg-transparent" />}>
            {t("common.export")}
          </Button>
          <Button leftIcon={<UserPlus className="w-4 h-4" />} onClick={() => setShowAddForm(true)}>
            {t("userForm.addUser")}
          </Button>
        </div>
      </div>

      {/* Filters and Search */}
      <Card className="p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <Input
            placeholder={t("userForm.searchPlaceholder")}
            value={globalFilter}
            onChange={(e) => setGlobalFilter(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
            className="w-full sm:w-64"
          />

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value as UserRole | "")}
            className="block w-full sm:w-48 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
          >
            <option value="">{t("common.allTypes")}</option>
            <option value={UserRole.ADMIN}>{t("userForm.roles.admin")}</option>
            <option value={UserRole.SUPERVISOR}>{t("userForm.roles.supervisor")}</option>
            <option value={UserRole.VIEWER}>{t("userForm.roles.viewer")}</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as "ACTIVE" | "INACTIVE" | "")}
            className="block w-full sm:w-48 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
          >
            <option value="">{t("userForm.allStatuses")}</option>
            <option value="ACTIVE">{t("userForm.status.active")}</option>
            <option value="INACTIVE">{t("userForm.status.inactive")}</option>
          </select>
        </div>
      </Card>

      {/* Mobile View */}
      <div className="block md:hidden space-y-4">
        {filteredUsers.map((user) => (
          <Card key={user.id} className="p-4">
            <div className="space-y-3">
              <div>
                <h3 className="font-medium text-gray-900">{user.name}</h3>
                <p className="text-sm text-gray-500">{user.email}</p>
              </div>

              {/* Type */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{t("userForm.personType")}</span>
                <Badge variant="secondary">{user.personType || "Admin"}</Badge>
              </div>

              {/* Role */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{t("userForm.userRole")}</span>
                {editingUser === user.id ? (
                  <div className="flex items-center gap-2">
                    <select
                      value={editingRole}
                      onChange={(e) => setEditingRole(e.target.value as UserRole)}
                      className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary-500"
                    >
                      <option value={UserRole.ADMIN}>{t("userForm.roles.admin")}</option>
                      <option value={UserRole.SUPERVISOR}>{t("userForm.roles.supervisor")}</option>
                      <option value={UserRole.VIEWER}>{t("userForm.roles.viewer")}</option>
                    </select>
                    <Button size="sm" onClick={() => handleRoleChange(user.id, editingRole)}>
                      <Save className="w-3 h-3" />
                    </Button>
                    <Button size="sm" variant="ghost" onClick={handleEditCancel}>
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    {getRoleBadge(user.role)}
                    <Button size="sm" variant="ghost" onClick={() => handleEditStart(user.id, user.role)}>
                      <Edit className="w-3 h-3" />
                    </Button>
                  </div>
                )}
              </div>

              {/* Status */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{t("userForm.accountStatus")}</span>
                <div className="flex items-center gap-2">
                  <Badge variant={user.status === "ACTIVE" ? "success" : "secondary"}>{user.status}</Badge>
                  <Button size="sm" variant="ghost" onClick={() => handleStatusToggle(user.id, user.status)}>
                    <Edit className="w-3 h-3" />
                  </Button>
                </div>
              </div>

              {/* Last Login */}
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium">{t("userForm.lastLogin")}</span>
                <span className="text-sm">
                  {user.lastLogin ? (
                    <>
                      {new Date(user.lastLogin).toLocaleDateString()} at{" "}
                      {new Date(user.lastLogin).toLocaleTimeString([], {
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </>
                  ) : (
                    t("userForm.neverLoggedIn")
                  )}
                </span>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-2 border-t">
                <Button size="sm" variant="ghost" onClick={() => handleEditUser(user)}>
                  <Edit className="w-4 h-4 mr-1" />
                  {t("common.edit")}
                </Button>
                <Button size="sm" variant="ghost" onClick={() => handleDeleteUser(user.id)}>
                  <Trash2 className="w-4 h-4 mr-1" />
                  {t("common.delete")}
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Desktop Table */}
      <Card className="hidden md:block overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              {table.getHeaderGroups().map((headerGroup) => (
                <tr key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <th
                      key={header.id}
                      className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                    >
                      {header.isPlaceholder ? null : (
                        <div>{flexRender(header.column.columnDef.header, header.getContext())}</div>
                      )}
                    </th>
                  ))}
                </tr>
              ))}
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="hover:bg-gray-50">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-6 py-4 whitespace-nowrap text-sm">
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Important Notes */}
      <Card>
        <div className="flex items-start gap-4">
          <AlertCircle className="text-warning-500 flex-shrink-0 mt-1" size={24} />
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{t("userForm.roleManagementGuidelines")}</h3>
            <ul className="text-sm text-gray-600 space-y-2">
              <li>
                • <strong>{t("userForm.roles.admin")}:</strong> {t("userForm.roleDescriptions.admin")}
              </li>
              <li>
                • <strong>{t("userForm.roles.supervisor")}:</strong> {t("userForm.roleDescriptions.supervisor")}
              </li>
              <li>
                • <strong>{t("userForm.roles.viewer")}:</strong> {t("userForm.roleDescriptions.viewer")}
              </li>
              <li>
                • <strong>{t("userForm.statusChanges")}:</strong> {t("userForm.statusDescriptions.inactive")}
              </li>
              <li>
                • <strong>{t("userForm.roleChanges")}:</strong> {t("userForm.roleChangeEffect")}
              </li>
            </ul>
          </div>
        </div>
      </Card>

      {/* Add/Edit User Form */}
      {showAddForm && (
        <AddUserForm
          onClose={() => {
            setShowAddForm(false)
            setEditingUserData(null)
          }}
          onSubmit={editingUserData ? handleUpdateUser : handleAddUser}
          initialData={editingUserData}
        />
      )}
    </div>
  )
}

export default UsersPage;