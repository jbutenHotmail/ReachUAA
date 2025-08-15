import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Users, Search, Download, UserPlus,
  Shield, ShieldCheck, Eye, 
  Edit, Save, X, AlertCircle,
  Trash2, CheckCircle
} from 'lucide-react';
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getSortedRowModel,
  SortingState,
  getFilteredRowModel,
} from '@tanstack/react-table';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Badge from '../../../components/ui/Badge';
import { UserRole, User } from '../../../types';
import AddUserForm from './AddUserForm';
import { useUserStore } from '../../../stores/userStore';
import { useAuthStore } from '../../../stores/authStore';
import LoadingScreen from '../../../components/ui/LoadingScreen';

const columnHelper = createColumnHelper<User>();

const UsersPage: React.FC = () => {
  const { t } = useTranslation();
  const { user: currentUser } = useAuthStore();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [roleFilter, setRoleFilter] = useState<UserRole | ''>('');
  const [statusFilter, setStatusFilter] = useState<'ACTIVE' | 'INACTIVE' | ''>('');
  const [editingUser, setEditingUser] = useState<string | null>(null);
  const [editingRole, setEditingRole] = useState<UserRole>(UserRole.VIEWER);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingUserData, setEditingUserData] = useState<User | null>(null);
  const [userError, setUserError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const { 
    users, 
    isLoading, 
    error, 
    fetchUsers, 
    updateUser, 
    deleteUser,
    createUser,
    wereUsersFetched
  } = useUserStore();

  // Clear feedback messages when component unmounts
  useEffect(() => {
    return () => {
      setUserError(null);
      setSuccess(null);
    };
  }, []);

  // Update local error state when store error changes
  useEffect(() => {
    if (error) {
      setUserError(error);
    }
  }, [error]);

  useEffect(() => {
    !wereUsersFetched && fetchUsers();
  }, [fetchUsers, wereUsersFetched]);

  const getRoleIcon = (role: UserRole) => {
    switch (role) {
      case UserRole.ADMIN:
        return <ShieldCheck size={16} className="text-red-600" />;
      case UserRole.SUPERVISOR:
        return <Shield size={16} className="text-blue-600" />;
      case UserRole.VIEWER:
        return <Eye size={16} className="text-green-600" />;
      default:
        return <Users size={16} className="text-gray-600" />;
    }
  };

  const getRoleBadge = (role: UserRole) => {
    const variants = {
      [UserRole.ADMIN]: 'danger',
      [UserRole.SUPERVISOR]: 'primary',
      [UserRole.VIEWER]: 'success'
    } as const;
    
    return (
      <Badge 
        variant={variants[role]} 
        leftIcon={getRoleIcon(role)}
        className="capitalize"
      >
        {role.toLowerCase()}
      </Badge>
    );
  };

  const handleRoleChange = async (userId: string, newRole: UserRole) => {
    try {
      await updateUser(userId, { role: newRole });
      setEditingUser(null);
      setSuccess(t('userForm.roleChangeSuccess'));
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      setUserError(error instanceof Error ? error.message : t('userForm.errorUpdatingRole'));
      setTimeout(() => setUserError(null), 5000);
    }
  };

  const handleStatusToggle = async (userId: string, currentStatus: string) => {
    try {
      const newStatus = currentStatus === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      await updateUser(userId, { programStatus: newStatus });
      setSuccess(t('userForm.statusChangeSuccess'));
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      setUserError(error instanceof Error ? error.message : t('userForm.errorUpdatingStatus'));
      setTimeout(() => setUserError(null), 5000);
    }
  };

  const handleEditStart = (userId: string, currentRole: UserRole) => {
    setEditingUser(userId);
    setEditingRole(currentRole);
  };

  const handleEditCancel = () => {
    setEditingUser(null);
    setEditingRole(UserRole.VIEWER);
  };

  const handleEditUser = (user: User) => {
    setEditingUserData(user);
    setShowAddForm(true);
  };

  const handleAddUser = async (userData: any) => {
    try {
      await createUser(userData);
      setShowAddForm(false);
      setSuccess(t('userForm.createSuccess'));
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      setUserError(error instanceof Error ? error.message : t('userForm.errorCreating'));
      setTimeout(() => setUserError(null), 5000);
    }
  };

  const handleUpdateUser = async (userData: any) => {
    if (!editingUserData) return;
    
    try {
      await updateUser(editingUserData.id, userData);
      setEditingUserData(null);
      setShowAddForm(false);
      setSuccess(t('userForm.updateSuccess'));
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      setUserError(error instanceof Error ? error.message : t('userForm.errorUpdating'));
      setTimeout(() => setUserError(null), 5000);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm(t('userForm.deleteConfirmation'))) {
      return;
    }
    
    try {
      await deleteUser(userId);
      setSuccess(t('userForm.deleteSuccess'));
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      setUserError(error instanceof Error ? error.message : t('userForm.errorDeleting'));
      setTimeout(() => setUserError(null), 5000);
    }
  };

  // Filter users based on search and filters
  const filteredUsers = React.useMemo(() => {
    return users?.filter(user => {
      const matchesSearch = user.name?.toLowerCase().includes(globalFilter.toLowerCase()) ||
                           user.email?.toLowerCase().includes(globalFilter.toLowerCase());
      const matchesRole = !roleFilter || user.role === roleFilter;
      const matchesStatus = !statusFilter || user.status === statusFilter;
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [users, globalFilter, roleFilter, statusFilter]);

  // Calculate role statistics
  const roleStats = users.reduce((acc, user) => {
    acc[user.role] = (acc[user.role] || 0) + 1;
    return acc;
  }, {} as Record<UserRole, number>);

  const columns = [
    columnHelper.accessor('name', {
      header: 'User',
      cell: info => (
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700">
            <Users size={20} />
          </div>
          <div>
            <div className="font-medium text-gray-900">{info.getValue()}</div>
            <div className="text-sm text-gray-500">{info.row.original.email}</div>
          </div>
        </div>
      ),
    }),
    columnHelper.accessor('personType', {
      header: 'Type',
      cell: info => (
        <Badge
          variant={info.getValue() === 'COLPORTER' ? 'primary' : 'success'}
          size="sm"
        >
          {info.getValue() || 'Admin'}
        </Badge>
      ),
    }),
    columnHelper.accessor('role', {
      header: 'Role',
      cell: info => (
        <div>
          {editingUser === info.row.original.id ? (
            <div className="flex items-center gap-2">
              <select
                value={editingRole}
                onChange={(e) => setEditingRole(e.target.value as UserRole)}
                className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary-500"
              >
                <option value={UserRole.ADMIN}>Admin</option>
                <option value={UserRole.SUPERVISOR}>Supervisor</option>
                <option value={UserRole.VIEWER}>Viewer</option>
              </select>
              <Button
                variant="success"
                size="sm"
                onClick={() => handleRoleChange(info.row.original.id, editingRole)}
              >
                <Save size={14} />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleEditCancel}
              >
                <X size={14} />
              </Button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              {getRoleBadge(info.getValue())}
              {info.row.original.id !== currentUser?.id && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleEditStart(info.row.original.id, info.getValue())}
                >
                  <Edit size={14} />
                </Button>
              )}
            </div>
          )}
        </div>
      ),
    }),
    columnHelper.accessor('status', {
      header: 'Status',
      cell: info => (
        <div className="flex items-center gap-2">
          <Badge
            variant={info.row.original.programStatus === 'ACTIVE' ? 'success' : 'danger'}
            rounded
          >
            {info.row.original.programStatus || 'ACTIVE'}
          </Badge>
          {info.row.original.id !== currentUser?.id && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleStatusToggle(info.row.original.id, info.row.original.programStatus || 'ACTIVE')}
            >
              <Edit size={14} />
            </Button>
          )}
        </div>
      ),
    }),
    columnHelper.accessor('lastLogin', {
      header: 'Last Login',
      cell: info => (
        info.getValue() ? (
          <div>
            <div>{new Date(info.getValue() as string).toLocaleDateString()}</div>
            <div className="text-xs text-gray-400">
              {new Date(info.getValue() as string).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
        ) : (
          <span className="text-gray-400">Never</span>
        )
      ),
    }),
    columnHelper.accessor('createdAt', {
      header: 'Created',
      cell: info => new Date(info.getValue()).toLocaleDateString(),
    }),
    columnHelper.display({
      id: 'actions',
      header: 'Actions',
      cell: info => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleEditUser(info.row.original)}
            disabled={info.row.original.id === currentUser?.id}
            title={info.row.original.id === currentUser?.id ? "Cannot edit your own account" : "Edit user"}
          >
            <Edit size={16} className="text-primary-600" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDeleteUser(info.row.original.id)}
            disabled={info.row.original.id === currentUser?.id}
            title={info.row.original.id === currentUser?.id ? "Cannot delete your own account" : "Delete user"}
          >
            <Trash2 size={16} className="text-danger-600" />
          </Button>
        </div>
      ),
    }),
  ];

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
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingScreen message="Loading users..." />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {success && (
        <div className="p-4 bg-success-50 border border-success-200 rounded-lg flex items-center justify-between">
          <div className="flex items-start gap-3">
            <CheckCircle className="text-success-500 flex-shrink-0 mt-0.5" size={20} />
            <p className="text-success-700">{success}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSuccess(null)}
          >
            <X size={16} />
          </Button>
        </div>
      )}

      {userError && (
        <div className="p-4 bg-danger-50 border border-danger-200 rounded-lg flex items-center justify-between">
          <div className="flex items-start gap-3">
            <AlertCircle className="text-danger-500 flex-shrink-0 mt-0.5" size={20} />
            <p className="text-danger-700">{userError}</p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setUserError(null)}
          >
            <X size={16} />
          </Button>
        </div>
      )}

      {/* Role Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <ShieldCheck className="text-red-500" size={24} />
            </div>
            <p className="text-sm font-medium text-gray-500">Administrators</p>
            <p className="mt-1 text-2xl font-bold text-red-600">{roleStats[UserRole.ADMIN] || 0}</p>
            <p className="text-xs text-gray-500">Full system access</p>
          </div>
        </Card>
        
        <Card>
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <Shield className="text-blue-500" size={24} />
            </div>
            <p className="text-sm font-medium text-gray-500">Supervisors</p>
            <p className="mt-1 text-2xl font-bold text-blue-600">{roleStats[UserRole.SUPERVISOR] || 0}</p>
            <p className="text-xs text-gray-500">Program leaders</p>
          </div>
        </Card>
        
        <Card>
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <Eye className="text-green-500" size={24} />
            </div>
            <p className="text-sm font-medium text-gray-500">Viewers</p>
            <p className="mt-1 text-2xl font-bold text-green-600">{roleStats[UserRole.VIEWER] || 0}</p>
            <p className="text-xs text-gray-500">Read-only access</p>
          </div>
        </Card>
      </div>

      <Card>
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div className="flex flex-col sm:flex-row gap-4 w-full sm:w-auto">
              <Input
                placeholder="Search users..."
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                leftIcon={<Search size={18} />}
                className="w-full sm:w-64"
              />
              
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value as UserRole | '')}
                className="block w-full sm:w-48 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              >
                <option value="">{t('common.allTypes')}</option>
                <option value={UserRole.ADMIN}>Admin</option>
                <option value={UserRole.SUPERVISOR}>Supervisor</option>
                <option value={UserRole.VIEWER}>Viewer</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'ACTIVE' | 'INACTIVE' | '')}
                className="block w-full sm:w-48 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              >
                <option value="">All Status</option>
                <option value="ACTIVE">Active</option>
                <option value="INACTIVE">Inactive</option>
              </select>
            </div>
            
            <div className="flex gap-2 mt-2 sm:mt-0">
              <Button
                variant="outline"
                leftIcon={<Download size={18} />}
                className="whitespace-nowrap"
              >
                {t('common.export')}
              </Button>
              
              <Button
                variant="primary"
                leftIcon={<UserPlus size={18} />}
                onClick={() => setShowAddForm(true)}
                className="whitespace-nowrap"
              >
                Add User
              </Button>
            </div>
          </div>

          {/* Mobile View */}
          <div className="block lg:hidden space-y-4">
            {filteredUsers.map((user) => (
              <div key={user.id} className="p-4 border border-gray-200 rounded-lg bg-white">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700">
                      <Users size={20} />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{user.name}</div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </div>
                  </div>
                </div>

                <div className="space-y-3">
                  {/* Type */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Type:</span>
                    <Badge
                      variant={user.personType === 'COLPORTER' ? 'primary' : 'success'}
                      size="sm"
                    >
                      {user.personType || 'Admin'}
                    </Badge>
                  </div>
                  
                  {/* Role */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Role:</span>
                    {editingUser === user.id ? (
                      <div className="flex items-center gap-2">
                        <select
                          value={editingRole}
                          onChange={(e) => setEditingRole(e.target.value as UserRole)}
                          className="text-sm border border-gray-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-primary-500"
                        >
                          <option value={UserRole.ADMIN}>Admin</option>
                          <option value={UserRole.SUPERVISOR}>Supervisor</option>
                          <option value={UserRole.VIEWER}>Viewer</option>
                        </select>
                        <Button
                          variant="success"
                          size="sm"
                          onClick={() => handleRoleChange(user.id, editingRole)}
                        >
                          <Save size={14} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleEditCancel}
                        >
                          <X size={14} />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        {getRoleBadge(user.role)}
                        {user.id !== currentUser?.id && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEditStart(user.id, user.role)}
                          >
                            <Edit size={14} />
                          </Button>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Status */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Status:</span>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant={user.programStatus === 'ACTIVE' ? 'success' : 'danger'}
                        rounded
                      >
                        {user.programStatus || 'ACTIVE'}
                      </Badge>
                      {user.id !== currentUser?.id && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleStatusToggle(user.id, user.programStatus || 'ACTIVE')}
                        >
                          <Edit size={14} />
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Last Login */}
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">Last Login:</span>
                    <span className="text-sm text-gray-600">
                      {user.lastLogin ? (
                        <>
                          {new Date(user.lastLogin).toLocaleDateString()} at{' '}
                          {new Date(user.lastLogin).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </>
                      ) : (
                        'Never'
                      )}
                    </span>
                  </div>
                  
                  {/* Actions */}
                  <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEditUser(user)}
                      disabled={user.id === currentUser?.id}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="danger"
                      size="sm"
                      onClick={() => handleDeleteUser(user.id)}
                      disabled={user.id === currentUser?.id}
                    >
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                {table.getHeaderGroups().map(headerGroup => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map(header => (
                      <th
                        key={header.id}
                        className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                      >
                        {header.isPlaceholder ? null : (
                          <div
                            {...{
                              className: header.column.getCanSort()
                                ? 'cursor-pointer select-none'
                                : '',
                              onClick: header.column.getToggleSortingHandler(),
                            }}
                          >
                            {flexRender(
                              header.column.columnDef.header,
                              header.getContext()
                            )}
                          </div>
                        )}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {table.getRowModel().rows.map(row => (
                  <tr 
                    key={row.id}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    {row.getVisibleCells().map(cell => (
                      <td
                        key={cell.id}
                        className="px-4 py-3 whitespace-nowrap text-sm text-gray-900"
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Card>

      {/* Important Notes */}
      <Card>
        <div className="flex items-start gap-4">
          <AlertCircle className="text-warning-500 flex-shrink-0 mt-1" size={24} />
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Role Management Guidelines</h3>
            <ul className="text-sm text-gray-600 space-y-2">
              <li>• <strong>Admin:</strong> Full system access, can manage all users, settings, and data.</li>
              <li>• <strong>Supervisor:</strong> Can manage colporters, view reports, and handle daily operations.</li>
              <li>• <strong>Viewer:</strong> Read-only access to their own data and basic features.</li>
              <li>• <strong>Status Changes:</strong> Inactive users cannot log in but their data is preserved.</li>
              <li>• <strong>Role Changes:</strong> Take effect immediately and may require users to log in again.</li>
            </ul>
          </div>
        </div>
      </Card>

      {/* Add/Edit User Form */}
      {showAddForm && (
        <AddUserForm
          onClose={() => {
            setShowAddForm(false);
            setEditingUserData(null);
          }}
          onSubmit={editingUserData ? handleUpdateUser : handleAddUser}
          initialData={editingUserData}
        />
      )}
    </div>
  );
};

export default UsersPage;