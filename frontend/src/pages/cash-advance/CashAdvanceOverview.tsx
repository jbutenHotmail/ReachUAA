// CashAdvanceOverview.tsx
import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Clock, 
  CheckCircle, 
  XCircle, 
  Calendar, 
  DollarSign, 
  User, 
  Filter, 
  X as XIcon,
  RefreshCw
} from 'lucide-react';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { useCashAdvanceStore } from '../../stores/cashAdvanceStore';
import { CashAdvance } from '../../types';
import { clsx } from 'clsx';
import { useAuthStore } from '../../stores/authStore';
import { UserRole } from '../../types';
import LoadingScreen from '../../components/ui/LoadingScreen';
import { formatNumber } from '../../utils/numberUtils';

const CashAdvanceOverview: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { advances, isLoading, fetchAdvances, approveAdvance, rejectAdvance, wereAdvancesFetched } = useCashAdvanceStore();
  const [selectedAdvance, setSelectedAdvance] = useState<CashAdvance | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Check if user is admin (only admins can approve/reject)
  const isAdmin = user?.role === UserRole.ADMIN;
  
  // Filters
  const [showFilters, setShowFilters] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [personTypeFilter, setPersonTypeFilter] = useState<string>('');
  const [weekFilter, setWeekFilter] = useState<string>('');

  useEffect(() => {
    !wereAdvancesFetched && fetchAdvances();
  }, [fetchAdvances]);

  const handleApprove = async (id: string) => {
    if (!isAdmin) return;
    
    setActionLoading(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      await approveAdvance(id);
      setActionSuccess(t('cashAdvance.successApproved'));
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : t('cashAdvance.errorApprove'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (id: string) => {
    if (!isAdmin) return;
    
    setActionLoading(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      await rejectAdvance(id);
      setActionSuccess(t('cashAdvance.successRejected'));
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : t('cashAdvance.errorReject'));
    } finally {
      setActionLoading(false);
    }
  };

  const handleRefresh = async () => {
    setIsRefreshing(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      // Force refresh by resetting the fetch flag and calling fetchAdvances
      useCashAdvanceStore.setState({ wereAdvancesFetched: false });
      await fetchAdvances();
    } catch (error) {
      setActionError('Failed to refresh cash advances');
      setTimeout(() => setActionError(null), 5000);
    } finally {
      setIsRefreshing(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="warning" leftIcon={<Clock size={14} />}>{t('cashAdvance.pending')}</Badge>;
      case 'APPROVED':
        return <Badge variant="success" leftIcon={<CheckCircle size={14} />}>{t('cashAdvance.approved')}</Badge>;
      case 'REJECTED':
        return <Badge variant="danger" leftIcon={<XCircle size={14} />}>{t('cashAdvance.rejected')}</Badge>;
      default:
        return null;
    }
  };

  // Get unique weeks from advances
  const uniqueWeeks = React.useMemo(() => {
    const weeks = new Set<string>();
    advances.forEach(advance => {
      weeks.add(advance.weekStartDate);
    });
    return Array.from(weeks).sort();
  }, [advances]);

  // Apply filters
  const filteredAdvances = React.useMemo(() => {
    return advances.filter(advance => {
      const matchesStatus = !statusFilter || advance.status === statusFilter;
      const matchesPersonType = !personTypeFilter || advance.personType === personTypeFilter;
      const matchesWeek = !weekFilter || advance.weekStartDate === weekFilter;
      return matchesStatus && matchesPersonType && matchesWeek;
    });
  }, [advances, statusFilter, personTypeFilter, weekFilter]);

  // Calculate totals - ONLY APPROVED ADVANCES
  const totals = React.useMemo(() => {
    return filteredAdvances.reduce((acc, advance) => {
      if (advance.status === 'PENDING') {
        acc.pending.count++;
        acc.pending.amount += Number(advance.advanceAmount);
      } else if (advance.status === 'APPROVED') {
        acc.approved.count++;
        acc.approved.amount += Number(advance.advanceAmount);
      } else if (advance.status === 'REJECTED') {
        acc.rejected.count++;
        acc.rejected.amount += Number(advance.advanceAmount);
      }
      advance.status !== 'REJECTED' && acc.total.count++;
      advance.status !== 'REJECTED' && (acc.total.amount += Number(advance.advanceAmount));
      return acc;
    }, {
      pending: { count: 0, amount: 0 },
      approved: { count: 0, amount: 0 },
      rejected: { count: 0, amount: 0 },
      total: { count: 0, amount: 0 }
    });
  }, [filteredAdvances]);

  const clearFilters = () => {
    setStatusFilter('');
    setPersonTypeFilter('');
    setWeekFilter('');
  };

  if (isLoading) {
    return (
      <LoadingScreen message={t('cashAdvance.loading')} />
    );
  }

  // if (error) {
  //   return (
  //     <div className="p-4 bg-danger-50 border border-danger-200 rounded-lg text-danger-700">
  //       <p className="font-medium">{t('cashAdvance.errorLoading')}</p>
  //       <p>{error}</p>
  //     </div>
  //   );
  // }

  return (
    <div className="space-y-6">
      {actionSuccess && (
        <div className="p-4 bg-success-50 border border-success-200 rounded-lg text-success-700">
          <p className="font-medium">{actionSuccess}</p>
        </div>
      )}

      {actionError && (
        <div className="p-4 bg-danger-50 border border-danger-200 rounded-lg text-danger-700">
          <p className="font-medium">{t('cashAdvance.error')}</p>
          <p>{actionError}</p>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-500">{t('cashAdvance.totalAdvances')}</p>
            <p className="mt-2 text-2xl font-bold text-gray-900">{totals.total.count}</p>
            {console.log(totals)}
            <p className="text-lg font-semibold text-gray-700">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(totals.total.amount)}</p>
          </div>
        </Card>
        
        <Card>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-500">{t('cashAdvance.pending')}</p>
            <p className="mt-2 text-2xl font-bold text-warning-600">{totals.pending.count}</p>
            <p className="text-lg font-semibold text-warning-700">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(totals.pending.amount)}</p>
          </div>
        </Card>
        
        <Card>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-500">{t('cashAdvance.approved')}</p>
            <p className="mt-2 text-2xl font-bold text-success-600">{totals.approved.count}</p>
            <p className="text-lg font-semibold text-success-700">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(totals.approved.amount)}</p>
          </div>
        </Card>
        
        <Card>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-500">{t('cashAdvance.rejected')}</p>
            <p className="mt-2 text-2xl font-bold text-danger-600">{totals.rejected.count}</p>
            <p className="text-lg font-semibold text-danger-700">{new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(totals.rejected.amount)}</p>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            leftIcon={<RefreshCw size={16} className={isRefreshing ? 'animate-spin' : ''} />}
            onClick={handleRefresh}
            disabled={isRefreshing}
          >
            {t('common.refresh')}
          </Button>
          <Button
            variant="outline"
            leftIcon={<Filter size={16} />}
            onClick={() => setShowFilters(!showFilters)}
          >
            {showFilters ? t('cashAdvance.hideFilters') : t('cashAdvance.showFilters')}
          </Button>
        </div>
        
        {(statusFilter || personTypeFilter || weekFilter) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
          >
            {t('cashAdvance.clearFilters')}
          </Button>
        )}
      </div>

      {showFilters && (
        <Card>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('cashAdvance.status')}
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm py-2"
              >
                <option value="">{t('cashAdvance.allStatuses')}</option>
                <option value="PENDING">{t('cashAdvance.pending')}</option>
                <option value="APPROVED">{t('cashAdvance.approved')}</option>
                <option value="REJECTED">{t('cashAdvance.rejected')}</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('cashAdvance.personType')}
              </label>
              <select
                value={personTypeFilter}
                onChange={(e) => setPersonTypeFilter(e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm py-2"
              >
                <option value="">{t('cashAdvance.allTypes')}</option>
                <option value="COLPORTER">{t('cashAdvance.colporter')}</option>
                <option value="LEADER">{t('cashAdvance.leader')}</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                {t('cashAdvance.week')}
              </label>
              <select
                value={weekFilter}
                onChange={(e) => setWeekFilter(e.target.value)}
                className="block w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm py-2"
              >
                <option value="">{t('cashAdvance.allWeeks')}</option>
                {uniqueWeeks.map(week => (
                  <option key={week} value={week}>
                    {t('cashAdvance.weekOf')} {new Date(week).toLocaleDateString()}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </Card>
      )}

      <Card>
        <div className="space-y-4">
          {filteredAdvances.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">{t('cashAdvance.noAdvancesYet')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('cashAdvance.student')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('cashAdvance.week')}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('cashAdvance.weeklySales')}
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('cashAdvance.advanceAmount')}
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('cashAdvance.status')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('cashAdvance.requestDate')}
                    </th>
                    {isAdmin && (
                      <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {t('cashAdvance.actions')}
                      </th>
                    )}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredAdvances.map((advance) => (
                    <tr key={advance.id} className={clsx(
                      advance.status === 'PENDING' ? 'bg-yellow-50/50' : 
                      advance.status === 'REJECTED' ? 'bg-red-50/50' : ''
                    )}>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center gap-2">
                          <User size={16} className="text-gray-400" />
                          <span>{advance.personName}</span>
                          <Badge 
                            variant={advance.personType === 'COLPORTER' ? 'primary' : 'success'} 
                            size="sm"
                          >
                            {t(`cashAdvance.${advance.personType.toLowerCase()}`)}
                          </Badge>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        <div className="flex items-center gap-2">
                          <Calendar size={16} className="text-gray-400" />
                          <span>
                            {new Date(advance.weekStartDate).toLocaleDateString()} - {new Date(advance.weekEndDate).toLocaleDateString()}
                          </span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                        <div className="flex items-center justify-end gap-1">
                          <DollarSign size={16} className="text-gray-400" />
                          <span>{formatNumber(advance.advanceAmount)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                        <div className="flex items-center justify-end gap-1">
                          <DollarSign size={16} className="text-gray-400" />
                          <span>{formatNumber(advance.totalSales)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                        {getStatusBadge(advance.status)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {new Date(advance.requestDate).toLocaleDateString()}
                      </td>
                      {isAdmin && (
                        <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                          {advance.status === 'PENDING' && (
                            <div className="flex items-center justify-center gap-2">
                              <Button
                                variant="success"
                                size="sm"
                                onClick={() => handleApprove(advance.id)}
                                disabled={actionLoading}
                              >
                                <CheckCircle size={16} />
                              </Button>
                              <Button
                                variant="danger"
                                size="sm"
                                onClick={() => handleReject(advance.id)}
                                disabled={actionLoading}
                              >
                                <XCircle size={16} />
                              </Button>
                            </div>
                          )}
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </Card>

      {selectedAdvance && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl">
            <Card>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-gray-900">
                    {t('cashAdvance.detailsTitle')}
                  </h2>
                  <button
                    type="button"
                    onClick={() => setSelectedAdvance(null)}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <XIcon size={20} />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">{t('cashAdvance.person')}</p>
                    <p className="font-medium">{selectedAdvance.personName}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">{t('cashAdvance.type')}</p>
                    <Badge 
                      variant={selectedAdvance.personType === 'COLPORTER' ? 'primary' : 'success'}
                    >
                      {t(`cashAdvance.${selectedAdvance.personType.toLowerCase()}`)}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">{t('cashAdvance.week')}</p>
                    <p className="font-medium">
                      {new Date(selectedAdvance.weekStartDate).toLocaleDateString()} - {new Date(selectedAdvance.weekEndDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">{t('cashAdvance.status')}</p>
                    {getStatusBadge(selectedAdvance.status)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">{t('cashAdvance.weeklySales')}</p>
                    <p className="font-medium">${formatNumber(selectedAdvance.totalSales)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">{t('cashAdvance.advanceAmount')}</p>
                    <p className="font-medium">${formatNumber(selectedAdvance.advanceAmount)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">{t('cashAdvance.requestDate')}</p>
                    <p className="font-medium">{new Date(selectedAdvance.requestDate).toLocaleDateString()}</p>
                  </div>
                  {selectedAdvance.approvedDate && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">{t('cashAdvance.approvedDate')}</p>
                      <p className="font-medium">{new Date(selectedAdvance.approvedDate).toLocaleDateString()}</p>
                    </div>
                  )}
                </div>

                {selectedAdvance.status === 'PENDING' && isAdmin && (
                  <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                    <Button
                      variant="outline"
                      onClick={() => setSelectedAdvance(null)}
                    >
                      {t('cashAdvance.close')}
                    </Button>
                    <Button
                      variant="success"
                      onClick={() => {
                        handleApprove(selectedAdvance.id);
                        setSelectedAdvance(null);
                      }}
                      disabled={actionLoading}
                    >
                      {t('cashAdvance.approve')}
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => {
                        handleReject(selectedAdvance.id);
                        setSelectedAdvance(null);
                      }}
                      disabled={actionLoading}
                    >
                      {t('cashAdvance.reject')}
                    </Button>
                  </div>
                )}

                {selectedAdvance.status !== 'PENDING' && (
                  <div className="flex justify-end pt-4 border-t border-gray-200">
                    <Button
                      variant="outline"
                      onClick={() => setSelectedAdvance(null)}
                    >
                      {t('cashAdvance.close')}
                    </Button>
                  </div>
                )}
              </div>
            </Card>
          </div>
        </div>
      )}
    </div>
  );
};

export default CashAdvanceOverview;