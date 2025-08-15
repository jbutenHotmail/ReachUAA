// ChargesPage.tsx
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Search, DollarSign, AlertTriangle, X, CheckCircle } from 'lucide-react';
import { useChargeStore } from '../../stores/chargeStore';
import { useAuthStore } from '../../stores/authStore';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';
import AddChargeForm from './AddChargeForm';
import { UserRole, Charge } from '../../types';
import LoadingScreen from '../../components/ui/LoadingScreen';

const ChargesPage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { charges, isLoading, fetchCharges, createCharge, updateCharge, 
    applyCharge, cancelCharge, wereChargesFetched } = useChargeStore();
  const [searchTerm, setSearchTerm] = React.useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCharge, setEditingCharge] = useState<Charge | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    !wereChargesFetched && fetchCharges();
  }, [fetchCharges]);

  const filteredCharges = searchTerm
    ? charges.filter(charge => 
        charge.personName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        charge.reason.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : charges;

  // Apply additional filters
  const finalFilteredCharges = filteredCharges.filter(charge => {
    const matchesStatus = !statusFilter || charge.status === statusFilter;
    const matchesType = !typeFilter || charge.personType === typeFilter;
    return matchesStatus && matchesType;
  });
  
  // Check if user can toggle charge status (Admin only)
  const canToggleChargeStatus = user?.role === UserRole.ADMIN;

  const handleAddCharge = async (data: Omit<Charge, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      await createCharge(data);
      setShowAddForm(false);
      setSuccess(t('charges.successCreated'));
      setTimeout(() => setSuccess(null), 5000);
    } catch (error) {
      console.error('Error creating charge:', error);
    }
  };

  const handleEditCharge = async (data: Partial<Charge>) => {
    if (!editingCharge) return;
    try {
      await updateCharge(editingCharge.id, data);
      setEditingCharge(null);
      setSuccess(t('charges.successUpdated'));
      setTimeout(() => setSuccess(null), 5000);
    } catch (error) {
      console.error('Error updating charge:', error);
    }
  };

  const handleApplyCharge = async (id: string) => {
    if (!canToggleChargeStatus) return;
    
    if (!window.confirm(t('charges.confirmApply'))) return;
    try {
      await applyCharge(id);
      setSuccess(t('charges.successApplied'));
      setTimeout(() => setSuccess(null), 5000);
    } catch (error) {
      console.error('Error applying charge:', error);
    }
  };

  const handleCancelCharge = async (id: string) => {
    if (!canToggleChargeStatus) return;
    
    if (!window.confirm(t('charges.confirmCancel'))) return;
    try {
      await cancelCharge(id);
      setSuccess(t('charges.successCancelled'));
      setTimeout(() => setSuccess(null), 5000);
    } catch (error) {
      console.error('Error cancelling charge:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="warning">{t('charges.pending')}</Badge>;
      case 'APPLIED':
        return <Badge variant="success">{t('charges.applied')}</Badge>;
      case 'CANCELLED':
        return <Badge variant="danger">{t('charges.cancelled')}</Badge>;
      default:
        return null;
    }
  };

  const getCategoryBadge = (category: string) => {
    const variants = {
      'FINE': 'danger',
      'DEDUCTION': 'warning',
      'PENALTY': 'danger',
      'OTHER': 'secondary'
    } as const;
    
    return <Badge variant={variants[category as keyof typeof variants] || 'secondary'}>{t(`charges.${category.toLowerCase()}`)}</Badge>;
  };

  // Calculate totals - ONLY APPLIED AND PENDING CHARGES
  const appliedCharges = finalFilteredCharges.filter(c => c.status === 'APPLIED');
  const pendingCharges = finalFilteredCharges.filter(c => c.status === 'PENDING');  
  const appliedTotal = appliedCharges.reduce((sum, charge) => sum + charge.amount, 0);
  const pendingTotal = pendingCharges.reduce((sum, charge) => sum + charge.amount, 0);
  const totalAmount = appliedTotal + pendingTotal;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingScreen message={t('charges.loading')} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {success && (
        <div className="p-4 bg-success-50 border border-success-200 rounded-lg text-success-700">
          <p className="font-medium">{success}</p>
        </div>
      )}
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <AlertTriangle className="text-warning-600" size={28} />
            {t('charges.title')}
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {t('charges.description')}
          </p>
        </div>
        
        <Button
          variant="primary"
          leftIcon={<Plus size={18} />}
          onClick={() => setShowAddForm(true)}
        >
          {t('charges.addCharge')}
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <DollarSign className="text-red-500" size={24} />
            </div>
            <p className="text-sm font-medium text-gray-500">{t('charges.totalCharges')}</p>
            <p className="mt-1 text-2xl font-bold text-red-600">${totalAmount.toFixed(2)}</p>
            <p className="text-xs text-gray-500">{t('charges.allTime')}</p>
          </div>
        </Card>
        
        <Card>
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <CheckCircle className="text-success-500" size={24} />
            </div>
            <p className="text-sm font-medium text-gray-500">{t('charges.applied')}</p>
            <p className="mt-1 text-2xl font-bold text-success-600">${appliedTotal.toFixed(2)}</p>
            <p className="text-xs text-gray-500">{t('charges.processed')}</p>
          </div>
        </Card>
        
        <Card>
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <AlertTriangle className="text-warning-500" size={24} />
            </div>
            <p className="text-sm font-medium text-gray-500">{t('charges.pending')}</p>
            <p className="mt-1 text-2xl font-bold text-warning-600">${Number(pendingTotal).toFixed(2)}</p>
            <p className="text-xs text-gray-500">{t('charges.awaiting')}</p>
          </div>
        </Card>
      </div>

      <Card>
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <Input
                placeholder={t('charges.searchPlaceholder')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                leftIcon={<Search size={18} />}
                className="w-full sm:w-64"
              />
              
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="block w-full sm:w-48 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              >
                <option value="">{t('charges.allStatus')}</option>
                <option value="PENDING">{t('charges.pending')}</option>
                <option value="APPLIED">{t('charges.applied')}</option>
                <option value="CANCELLED">{t('charges.cancelled')}</option>
              </select>

              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="block w-full sm:w-48 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              >
                <option value="">{t('charges.allTypes')}</option>
                <option value="COLPORTER">{t('charges.colporter')}</option>
                <option value="LEADER">{t('charges.leader')}</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('charges.date')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('charges.person')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('charges.reason')}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('charges.amount')}
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('charges.category')}
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('charges.status')}
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('charges.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {finalFilteredCharges.map((charge) => (
                  <tr key={charge.id} className={`hover:bg-gray-50 transition-colors ${
                    charge.status === 'PENDING' ? 'bg-yellow-50/50' :
                    charge.status === 'CANCELLED' ? 'bg-red-50/50' : ''
                  }`}>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      {new Date(charge.date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      <div>
                        <div className="font-medium text-gray-900">{charge.personName}</div>
                        <div className="text-sm text-gray-500">{t(`charges.${charge.personType.toLowerCase()}`)}</div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                      <div>
                        <div className="font-medium text-gray-900">{charge.reason}</div>
                        {charge.description && (
                          <div className="text-sm text-gray-500 truncate max-w-xs">
                            {charge.description}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium text-red-600">
                      <div className="flex items-center gap-1 justify-end">
                        <DollarSign size={14} />
                        {charge.amount.toFixed(2)}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                      {getCategoryBadge(charge.category)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                      {getStatusBadge(charge.status)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                      {charge.status === 'PENDING' && canToggleChargeStatus && (
                        <div className="flex items-center justify-center gap-2">
                          <Button
                            variant="success"
                            size="sm"
                            onClick={() => handleApplyCharge(charge.id)}
                          >
                            <CheckCircle size={14} />
                          </Button>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => handleCancelCharge(charge.id)}
                          >
                            <X size={14} />
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Card>

      {(showAddForm || editingCharge) && (
        <AddChargeForm
          onClose={() => {
            setShowAddForm(false);
            setEditingCharge(null);
          }}
          onSubmit={editingCharge ? handleEditCharge : handleAddCharge}
          initialData={editingCharge || undefined}
        />
      )}
    </div>
  );
};

export default ChargesPage;