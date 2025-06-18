import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  ShieldCheck, 
  Shield, 
  Eye, 
  Save, 
  AlertCircle,
  CheckCircle,
  Settings,
  Lock
} from 'lucide-react';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import { UserRole } from '../../../types';
import { useUserStore } from '../../../stores/userStore';
import LoadingScreen from '../../../components/ui/LoadingScreen';

interface RolePermission {
  id: string;
  name: string;
  description: string;
  roles: {
    [UserRole.ADMIN]: boolean;
    [UserRole.SUPERVISOR]: boolean;
    [UserRole.VIEWER]: boolean;
  };
}

const ManageRolesPage: React.FC = () => {
  const { t } = useTranslation();
  const [isLoading, setIsLoading] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [permissions, setPermissions] = useState<RolePermission[]>([]);
  const [error, setError] = useState<string | null>(null);
  
  const { getRolePermissions, updateRolePermissions } = useUserStore();

  useEffect(() => {
    const fetchPermissions = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const fetchedPermissions = await getRolePermissions();
        setPermissions(fetchedPermissions);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load permissions');
      } finally {
        setIsLoading(false);
      }
    };

    fetchPermissions();
  }, [getRolePermissions]);

  const handleTogglePermission = (permissionId: string, role: UserRole) => {
    setPermissions(prev => 
      prev.map(permission => 
        permission.id === permissionId 
          ? { 
              ...permission, 
              roles: { 
                ...permission.roles, 
                [role]: !permission.roles[role] 
              } 
            }
          : permission
      )
    );
    setIsSaved(false);
  };

  const handleSave = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await updateRolePermissions(permissions);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save permissions');
    } finally {
      setIsLoading(false);
    }
  };

  // const getRoleIcon = (role: UserRole) => {
  //   switch (role) {
  //     case UserRole.ADMIN:
  //       return <ShieldCheck size={16} className="text-red-600" />;
  //     case UserRole.SUPERVISOR:
  //       return <Shield size={16} className="text-blue-600" />;
  //     case UserRole.VIEWER:
  //       return <Eye size={16} className="text-green-600" />;
  //   }
  // };

  // Group permissions by category
  const permissionCategories = React.useMemo(() => {
    const categories: Record<string, RolePermission[]> = {
      'Dashboard': [],
      'Transactions': [],
      'Inventory': [],
      'Expenses': [],
      'Cash Advances': [],
      'Charges & Fines': [],
      'Reports': [],
      'People': [],
      'Users & Roles': [],
      'Program': [],
    };

    permissions.forEach(permission => {
      if (permission.id.startsWith('dashboard')) {
        categories['Dashboard'].push(permission);
      } else if (permission.id.startsWith('transactions')) {
        categories['Transactions'].push(permission);
      } else if (permission.id.startsWith('inventory')) {
        categories['Inventory'].push(permission);
      } else if (permission.id.startsWith('expenses')) {
        categories['Expenses'].push(permission);
      } else if (permission.id.startsWith('cash_advance')) {
        categories['Cash Advances'].push(permission);
      } else if (permission.id.startsWith('charges')) {
        categories['Charges & Fines'].push(permission);
      } else if (permission.id.startsWith('reports')) {
        categories['Reports'].push(permission);
      } else if (permission.id.startsWith('people')) {
        categories['People'].push(permission);
      } else if (permission.id.startsWith('users') || permission.id.startsWith('roles')) {
        categories['Users & Roles'].push(permission);
      } else if (permission.id.startsWith('program')) {
        categories['Program'].push(permission);
      }
    });

    return categories;
  }, [permissions]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingScreen message='Loading Permissions...' />
      </div>
    );
  }

  if (error && permissions.length === 0) {
    return (
      <div className="p-4 bg-danger-50 border border-danger-200 rounded-lg text-danger-700">
        <p className="font-medium">Error loading permissions</p>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <Lock className="text-primary-600" size={28} />
          Manage Role Permissions
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          Configure access permissions for each role in the system
        </p>
      </div>

      {isSaved && (
        <div className="p-4 bg-success-50 border border-success-200 rounded-lg flex items-start gap-3">
          <CheckCircle className="text-success-500 flex-shrink-0 mt-0.5" size={20} />
          <div className="text-sm text-success-700">
            <p className="font-medium">Permissions Saved</p>
            <p>Role permissions have been updated successfully.</p>
          </div>
        </div>
      )}

      {error && (
        <div className="p-4 bg-danger-50 border border-danger-200 rounded-lg flex items-start gap-3">
          <AlertCircle className="text-danger-500 flex-shrink-0 mt-0.5" size={20} />
          <div className="text-sm text-danger-700">
            <p className="font-medium">Error</p>
            <p>{error}</p>
          </div>
        </div>
      )}

      {/* Role descriptions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-red-100 rounded-full">
              <ShieldCheck size={20} className="text-red-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Administrator</h3>
          </div>
          <p className="text-sm text-gray-600">
            Full system access with ability to manage users, roles, and all program settings.
            Administrators can perform any action within the system.
          </p>
        </Card>
        
        <Card>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-blue-100 rounded-full">
              <Shield size={20} className="text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Supervisor</h3>
          </div>
          <p className="text-sm text-gray-600">
            Program leaders with ability to manage day-to-day operations, including transactions,
            expenses, and cash advances. Limited administrative access.
          </p>
        </Card>
        
        <Card>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-green-100 rounded-full">
              <Eye size={20} className="text-green-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900">Viewer</h3>
          </div>
          <p className="text-sm text-gray-600">
            Basic access for colporters and regular users. Can view their own data and perform
            limited actions like creating transactions.
          </p>
        </Card>
      </div>

      {/* Permissions table */}
      <Card title="Role Permissions" icon={<Settings size={20} />}>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-1/3">
                  Permission
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center justify-center gap-1">
                    <ShieldCheck size={14} className="text-red-600" />
                    Admin
                  </div>
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center justify-center gap-1">
                    <Shield size={14} className="text-blue-600" />
                    Supervisor
                  </div>
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  <div className="flex items-center justify-center gap-1">
                    <Eye size={14} className="text-green-600" />
                    Viewer
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {Object.entries(permissionCategories).map(([category, categoryPermissions]) => (
                <React.Fragment key={category}>
                  <tr className="bg-gray-100">
                    <td colSpan={4} className="px-4 py-2 text-sm font-semibold text-gray-700">
                      {category}
                    </td>
                  </tr>
                  {categoryPermissions.map((permission) => (
                    <tr key={permission.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <div className="text-sm font-medium text-gray-900">{permission.name}</div>
                        <div className="text-xs text-gray-500">{permission.description}</div>
                      </td>
                      {/* Admin column - always enabled and non-editable */}
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        <div className="inline-flex items-center justify-center">
                          <input
                            type="checkbox"
                            checked={permission.roles[UserRole.ADMIN]}
                            disabled={true}
                            className="h-4 w-4 text-red-600 focus:ring-red-500 border-gray-300 rounded cursor-not-allowed opacity-70"
                          />
                        </div>
                      </td>
                      {/* Supervisor column */}
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        <div className="inline-flex items-center justify-center">
                          <input
                            type="checkbox"
                            checked={permission.roles[UserRole.SUPERVISOR]}
                            onChange={() => handleTogglePermission(permission.id, UserRole.SUPERVISOR)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded cursor-pointer"
                          />
                        </div>
                      </td>
                      {/* Viewer column */}
                      <td className="px-4 py-3 whitespace-nowrap text-center">
                        <div className="inline-flex items-center justify-center">
                          <input
                            type="checkbox"
                            checked={permission.roles[UserRole.VIEWER]}
                            onChange={() => handleTogglePermission(permission.id, UserRole.VIEWER)}
                            className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded cursor-pointer"
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>

        <div className="mt-6 flex justify-end">
          <Button
            variant="primary"
            onClick={handleSave}
            isLoading={isLoading}
            leftIcon={<Save size={18} />}
          >
            Save Permissions
          </Button>
        </div>
      </Card>

      {/* Important Notes */}
      <Card>
        <div className="flex items-start gap-4">
          <AlertCircle className="text-warning-500 flex-shrink-0 mt-1" size={24} />
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Important Notes</h3>
            <ul className="text-sm text-gray-600 space-y-2">
              <li>• <strong>Administrator Role:</strong> Cannot be modified as it requires full system access.</li>
              <li>• <strong>Permission Changes:</strong> Take effect immediately for all users with the affected role.</li>
              <li>• <strong>Security Impact:</strong> Carefully consider the security implications before granting permissions.</li>
              <li>• <strong>Viewer Role:</strong> Typically used for colporters who need limited access to the system.</li>
              <li>• <strong>Supervisor Role:</strong> Intended for team leaders who manage colporters and daily operations.</li>
            </ul>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default ManageRolesPage;