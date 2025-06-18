import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Plus, Search, Edit, DollarSign, AlertTriangle, X, CheckCircle } from 'lucide-react';
import { useChargeStore } from '../../stores/chargeStore';
import { useAuthStore } from '../../stores/authStore';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';
import Spinner from '../../components/ui/Spinner';
import AddChargeForm from './AddChargeForm';
import { UserRole, Charge } from '../../types';

const ChargesPage: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { charges, isLoading, fetchCharges, createCharge, updateCharge, deleteCharge, applyCharge, cancelCharge, wereChargesFetched } = useChargeStore();
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
      setSuccess('Charge created successfully');
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
      setSuccess('Charge updated successfully');
      setTimeout(() => setSuccess(null), 5000);
    } catch (error) {
      console.error('Error updating charge:', error);
    }
  };

  const handleDeleteCharge = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this charge?')) return;
    try {
      await deleteCharge(id);
      setSuccess('Charge deleted successfully');
      setTimeout(() => setSuccess(null), 5000);
    } catch (error) {
      console.error('Error deleting charge:', error);
    }
  };

  const handleApplyCharge = async (id: string) => {
    if (!canToggleChargeStatus) return;
    
    if (!window.confirm('Are you sure you want to apply this charge?')) return;
    try {
      await applyCharge(id);
      setSuccess('Charge applied successfully');
      setTimeout(() => setSuccess(null), 5000);
    } catch (error) {
      console.error('Error applying charge:', error);
    }
  };

  const handleCancelCharge = async (id: string) => {
    if (!canToggleChargeStatus) return;
    
    if (!window.confirm('Are you sure you want to cancel this charge?')) return;
    try {
      await cancelCharge(id);
      setSuccess('Charge cancelled successfully');
      setTimeout(() => setSuccess(null), 5000);
    } catch (error) {
      console.error('Error cancelling charge:', error);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="warning">Pending</Badge>;
      case 'APPLIED':
        return <Badge variant="success">Applied</Badge>;
      case 'CANCELLED':
        return <Badge variant="danger">Cancelled</Badge>;
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
    
    return <Badge variant={variants[category as keyof typeof variants] || 'secondary'}>{category}</Badge>;
  };
  console.log(finalFilteredCharges);
  // Calculate totals - ONLY APPLIED CHARGES
  const appliedCharges = finalFilteredCharges.filter(c => c.status === 'APPLIED');
  const pendingCharges = finalFilteredCharges.filter(c => c.status === 'PENDING');  
  const appliedTotal = appliedCharges.reduce((sum, charge) => sum + charge.amount, 0);
  const pendingTotal = pendingCharges.reduce((sum, charge) => sum + charge.amount, 0);
  const totalAmount = appliedTotal + pendingTotal;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
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
            Charges & Fines
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Manage charges, fines, and deductions for colporters and leaders
          </p>
        </div>
        
        <Button
          variant="primary"
          leftIcon={<Plus size={18} />}
          onClick={() => setShowAddForm(true)}
        >
          Add Charge
        </Button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <DollarSign className="text-red-500" size={24} />
            </div>
            <p className="text-sm font-medium text-gray-500">Total Charges</p>
            <p className="mt-1 text-2xl font-bold text-red-600">${totalAmount.toFixed(2)}</p>
            <p className="text-xs text-gray-500">All time</p>
          </div>
        </Card>
        
        <Card>
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <CheckCircle className="text-success-500" size={24} />
            </div>
            <p className="text-sm font-medium text-gray-500">Applied Charges</p>
            <p className="mt-1 text-2xl font-bold text-success-600">${appliedTotal.toFixed(2)}</p>
            <p className="text-xs text-gray-500">Processed</p>
          </div>
        </Card>
        
        <Card>
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <AlertTriangle className="text-warning-500" size={24} />
            </div>
            <p className="text-sm font-medium text-gray-500">Pending Charges</p>
            <p className="mt-1 text-2xl font-bold text-warning-600">${pendingTotal.toFixed(2)}</p>
            <p className="text-xs text-gray-500">Awaiting approval</p>
          </div>
        </Card>
      </div>

      <Card>
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <Input
                placeholder="Search charges..."
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
                <option value="">All Status</option>
                <option value="PENDING">Pending</option>
                <option value="APPLIED">Applied</option>
                <option value="CANCELLED">Cancelled</option>
              </select>

              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="block w-full sm:w-48 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              >
                <option value="">All Types</option>
                <option value="COLPORTER">Colporters</option>
                <option value="LEADER">Leaders</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('expenses.date')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Person
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Reason
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
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
                        <div className="text-sm text-gray-500">{charge.personType}</div>
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