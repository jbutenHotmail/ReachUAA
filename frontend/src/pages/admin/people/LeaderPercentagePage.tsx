import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Percent, 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  ToggleLeft, 
  ToggleRight,
  Users,
  DollarSign,
  CheckCircle,
  AlertTriangle,
  X
} from 'lucide-react';

// Components
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Input from '../../../components/ui/Input';
import Badge from '../../../components/ui/Badge';
import LoadingScreen from '../../../components/ui/LoadingScreen';
import AddLeaderPercentageForm from './AddLeaderPercentageForm';

// Stores and Types
import { useLeaderPercentageStore } from '../../../stores/leaderPercentageStore';
import { useUserStore } from '../../../stores/userStore';
import { useProgramStore } from '../../../stores/programStore';
import { LeaderPercentage } from '../../../types';

// Interfaces
interface Notification {
  message: string;
  type: 'success' | 'error';
}

// Helper function
const formatNumber = (num: number, decimals: number = 1): string => {
  return num.toFixed(decimals);
};

// Helper Components
const NotificationBanner: React.FC<{
  message: string;
  type: 'success' | 'error';
  onClose: () => void;
}> = ({ message, type, onClose }) => {
  return (
    <div className={`p-4 border rounded-lg flex items-center justify-between ${
      type === 'success' ? 'bg-success-50 border-success-200' : 'bg-danger-50 border-danger-200'
    }`}>
      <div className="flex items-start gap-3">
        {type === 'success' ? (
          <CheckCircle className="text-success-500 flex-shrink-0 mt-0.5" size={20} />
        ) : (
          <AlertTriangle className="text-danger-500 flex-shrink-0 mt-0.5" size={20} />
        )}
        <p className={type === 'success' ? 'text-success-700' : 'text-danger-700'}>{message}</p>
      </div>
      <Button variant="ghost" size="sm" onClick={onClose}>
        <X size={16} />
      </Button>
    </div>
  );
};

const SummaryCards: React.FC<{
  defaultPercentage: number;
  leaderPercentages: LeaderPercentage[];
}> = ({ defaultPercentage, leaderPercentages }) => {
  const { t } = useTranslation();
  const averagePercentage = leaderPercentages.length > 0 
    ? leaderPercentages.reduce((sum, p) => sum + p.percentage, 0) / leaderPercentages.length
    : defaultPercentage;

  return (
    <div className="grid grid-cols-3 gap-3 sm:gap-4 md:gap-6">
      <Card className="p-3 sm:p-4">
        <div className="text-center">
          <div className="flex items-center justify-center mb-1 sm:mb-2">
            <Percent className="text-primary-600" size={18} />
          </div>
          <p className="text-xs sm:text-sm font-medium text-gray-500">{t('leaderPercentages.globalPercentage')}</p>
          <p className="mt-1 text-lg sm:text-2xl font-bold text-primary-600">{defaultPercentage}%</p>
          <p className="text-[10px] sm:text-xs text-gray-500">{t('leaderPercentages.programSetting')}</p>
        </div>
      </Card>
      
      <Card className="p-3 sm:p-4">
        <div className="text-center">
          <div className="flex items-center justify-center mb-1 sm:mb-2">
            <Users className="text-success-600" size={18} />
          </div>
          <p className="text-xs sm:text-sm font-medium text-gray-500">{t('leaderPercentages.leadersWithPercentage')}</p>
          <p className="mt-1 text-lg sm:text-2xl font-bold text-success-600">{leaderPercentages.length}</p>
          <p className="text-[10px] sm:text-xs text-gray-500">{t('leaderPercentages.customPercentages')}</p>
        </div>
      </Card>
      
      <Card className="p-3 sm:p-4">
        <div className="text-center">
          <div className="flex items-center justify-center mb-1 sm:mb-2">
            <DollarSign className="text-warning-600" size={18} />
          </div>
          <p className="text-xs sm:text-sm font-medium text-gray-500">{t('leaderPercentages.averagePercentage')}</p>
          <p className="mt-1 text-lg sm:text-2xl font-bold text-warning-600">
            {formatNumber(averagePercentage, 1)}%
          </p>
          <p className="text-[10px] sm:text-xs text-gray-500">{t('leaderPercentages.customPercentagesDescription')}</p>
        </div>
      </Card>
    </div>
  );
};

const LeaderTable: React.FC<{
  filteredPercentages: LeaderPercentage[];
  defaultPercentage: number;
  onEdit: (percentage: LeaderPercentage) => void;
  onDelete: (id: string) => void;
  onToggleStatus: (id: string) => void;
}> = ({ filteredPercentages, defaultPercentage, onEdit, onDelete, onToggleStatus }) => {
  const { t } = useTranslation();
  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead>
          <tr>
            <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{t('leaderPercentages.leader')}</th>
            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">{t('leaderPercentages.customPercentage')}</th>
            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">{t('leaderPercentages.vsGlobal', { percentage: defaultPercentage })}</th>
            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">{t('leaderPercentages.status')}</th>
            <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">{t('leaderPercentages.actions')}</th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {filteredPercentages.map((percentage) => {
            const difference = percentage.percentage - defaultPercentage;
            const isHigher = difference > 0;
            return (
              <tr key={percentage.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-success-100 flex items-center justify-center text-success-700">
                      <Users size={20} />
                    </div>
                    <div>
                      <div className="font-medium text-gray-900">{percentage.leaderName}</div>
                      <div className="text-sm text-gray-500">ID: {percentage.leaderId}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-center">
                  <Badge variant={isHigher ? "success" : difference < 0 ? "warning" : "primary"} size="lg">
                    {percentage.percentage}%
                  </Badge>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-center">
                  <div className={`flex items-center justify-center gap-1 ${
                    isHigher ? 'text-success-600' : difference < 0 ? 'text-warning-600' : 'text-gray-600'
                  }`}>
                    {difference > 0 && '+'}
                    {difference.toFixed(1)}%
                    {isHigher && <span className="text-xs">↑</span>}
                    {difference < 0 && <span className="text-xs">↓</span>}
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-center">
                  <button onClick={() => onToggleStatus(percentage.id)} className="flex items-center justify-center mx-auto">
                    {percentage.isActive ? (
                      <ToggleRight size={24} className="text-success-600" />
                    ) : (
                      <ToggleLeft size={24} className="text-gray-400" />
                    )}
                  </button>
                </td>
                <td className="px-4 py-3 whitespace-nowrap text-center">
                  <div className="flex items-center justify-center gap-2">
                    <Button variant="ghost" size="sm" onClick={() => onEdit(percentage)}>
                      <Edit size={16} className="text-primary-600" />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => onDelete(percentage.id)}>
                      <Trash2 size={16} className="text-danger-600" />
                    </Button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};

const LeaderPercentagesPage: React.FC = () => {
  const { t } = useTranslation();
  const { program } = useProgramStore();
  const { people, fetchPeople, werePeopleFetched } = useUserStore();
  const { 
    leaderPercentages, 
    isLoading, 
    fetchLeaderPercentages, 
    updateLeaderPercentage,
    deleteLeaderPercentage,
    toggleLeaderPercentageStatus,
    werePercentagesFetched
  } = useLeaderPercentageStore();

  // State
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingPercentage, setEditingPercentage] = useState<LeaderPercentage | null>(null);
  const [notification, setNotification] = useState<Notification | null>(null);

  // Derived Data
  const defaultPercentage = program?.financialConfig?.leader_percentage 
    ? parseFloat(program.financialConfig.leader_percentage) 
    : 15;
  const leaders = people.filter(person => person.personType === 'LEADER');
  const leadersWithoutPercentages = leaders.filter(leader => 
    !leaderPercentages.some(p => p.leaderId === leader.id)
  );
  const filteredPercentages = searchTerm
    ? leaderPercentages.filter(percentage => 
        percentage.leaderName.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : leaderPercentages;

  // Effects
  useEffect(() => {
    if (!werePeopleFetched) fetchPeople(program?.id);
    if (!werePercentagesFetched) fetchLeaderPercentages();
  }, [fetchPeople, fetchLeaderPercentages, werePeopleFetched, werePercentagesFetched, program]);

  // Handlers
  const showNotification = (message: string, type: 'success' | 'error') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const handleAddPercentage = async (data: any) => {
    try {
      await useLeaderPercentageStore.getState().createLeaderPercentage(data);
      setShowAddForm(false);
      showNotification(t('leaderPercentages.successCreated'), 'success');
    } catch (error) {
      showNotification(error instanceof Error ? error.message : t('leaderPercentages.errorCreated'), 'error');
    }
  };

  const handleEditPercentage = async (data: any) => {
    if (!editingPercentage) return;
    try {
      await updateLeaderPercentage(editingPercentage.id, data);
      setEditingPercentage(null);
      setShowAddForm(false);
      showNotification(t('leaderPercentages.successUpdated'), 'success');
    } catch (error) {
      showNotification(error instanceof Error ? error.message : t('leaderPercentages.errorUpdated'), 'error');
    }
  };

  const handleDeletePercentage = async (id: string) => {
    if (!window.confirm(t('leaderPercentages.confirmDelete'))) return;
    try {
      await deleteLeaderPercentage(id);
      showNotification(t('leaderPercentages.successDeleted'), 'success');
    } catch (error) {
      showNotification(error instanceof Error ? error.message : t('leaderPercentages.errorDeleted'), 'error');
    }
  };

  const handleToggleStatus = async (id: string) => {
    try {
      await toggleLeaderPercentageStatus(id);
      showNotification(t('leaderPercentages.successStatusUpdated'), 'success');
    } catch (error) {
      showNotification(error instanceof Error ? error.message : t('leaderPercentages.errorStatusUpdated'), 'error');
    }
  };

  // Render
  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingScreen message={t('leaderPercentages.loadingMessage')} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {notification && (
        <NotificationBanner
          message={notification.message}
          type={notification.type}
          onClose={() => setNotification(null)}
        />
      )}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <SummaryCards defaultPercentage={defaultPercentage} leaderPercentages={leaderPercentages} />
        <Button
          variant="primary"
          leftIcon={<Plus size={18} />}
          onClick={() => setShowAddForm(true)}
          disabled={leadersWithoutPercentages.length === 0}
        >
          {t('leaderPercentages.addPercentage')}
        </Button>
      </div>

      <Card>
        <div className="space-y-4">
          <Input
            placeholder={t('leaderPercentages.searchPlaceholder')}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            leftIcon={<Search size={18} />}
            className="w-full sm:w-64"
          />
          {filteredPercentages.length > 0 ? (
            <LeaderTable
              filteredPercentages={filteredPercentages}
              defaultPercentage={defaultPercentage}
              onEdit={setEditingPercentage}
              onDelete={handleDeletePercentage}
              onToggleStatus={handleToggleStatus}
            />
          ) : (
            <div className="text-center py-8">
              <Percent size={48} className="mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm ? t('leaderPercentages.noResults') : t('leaderPercentages.noPercentages')}
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                {searchTerm 
                  ? t('leaderPercentages.searchNoResults') 
                  : t('leaderPercentages.noPercentagesDescription')}
              </p>
              {!searchTerm && leadersWithoutPercentages.length > 0 && (
                <Button
                  variant="primary"
                  leftIcon={<Plus size={18} />}
                  onClick={() => setShowAddForm(true)}
                >
                  {t('leaderPercentages.addFirstPercentage')}
                </Button>
              )}
            </div>
          )}
        </div>
      </Card>

      <Card>
        <div className="flex items-start gap-4">
          <AlertTriangle className="text-primary-500 flex-shrink-0 mt-1" size={24} />
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('leaderPercentages.importantInfo')}</h3>
            <ul className="text-sm text-gray-600 space-y-2">
              <li>{t('leaderPercentages.globalPercentageNote', { percentage: defaultPercentage })}</li>
              <li>{t('leaderPercentages.customPercentageOverride')}</li>
              <li>{t('leaderPercentages.earningsCalculation')}</li>
              <li>{t('leaderPercentages.activeInactiveStatus')}</li>
              <li>{t('leaderPercentages.leadersWithoutPercentage')}</li>
            </ul>
          </div>
        </div>
      </Card>

      {(showAddForm || editingPercentage) && (
        <AddLeaderPercentageForm
          onClose={() => {
            setShowAddForm(false);
            setEditingPercentage(null);
          }}
          onSubmit={editingPercentage ? handleEditPercentage : handleAddPercentage}
          initialData={editingPercentage || undefined}
          availableLeaders={leadersWithoutPercentages}
          defaultPercentage={defaultPercentage}
        />
      )}
    </div>
  );
};

export default LeaderPercentagesPage;