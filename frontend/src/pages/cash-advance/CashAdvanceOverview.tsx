import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Clock, CheckCircle, XCircle, Calendar, DollarSign, User } from 'lucide-react';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Button from '../../components/ui/Button';
import { useCashAdvanceStore } from '../../stores/cashAdvanceStore';
import Spinner from '../../components/ui/Spinner';
import { CashAdvance } from '../../types';

const CashAdvanceOverview: React.FC = () => {
  const { t } = useTranslation();
  const { advances, isLoading, error, fetchAdvances, approveAdvance, rejectAdvance } = useCashAdvanceStore();
  const [selectedAdvance, setSelectedAdvance] = useState<CashAdvance | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchAdvances();
  }, [fetchAdvances]);

  const handleApprove = async (id: string) => {
    setActionLoading(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      await approveAdvance(id);
      setActionSuccess('Cash advance approved successfully');
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Failed to approve cash advance');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async (id: string) => {
    setActionLoading(true);
    setActionError(null);
    setActionSuccess(null);
    try {
      await rejectAdvance(id);
      setActionSuccess('Cash advance rejected successfully');
      setTimeout(() => setActionSuccess(null), 3000);
    } catch (error) {
      setActionError(error instanceof Error ? error.message : 'Failed to reject cash advance');
    } finally {
      setActionLoading(false);
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

  if (isLoading && advances.length === 0) {
    return (
      <div className="flex items-center justify-center h-64">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-danger-50 border border-danger-200 rounded-lg text-danger-700">
        <p className="font-medium">Error loading cash advances</p>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {actionSuccess && (
        <div className="p-4 bg-success-50 border border-success-200 rounded-lg text-success-700">
          <p className="font-medium">{actionSuccess}</p>
        </div>
      )}

      {actionError && (
        <div className="p-4 bg-danger-50 border border-danger-200 rounded-lg text-danger-700">
          <p className="font-medium">Error</p>
          <p>{actionError}</p>
        </div>
      )}

      <Card>
        <div className="space-y-4">
          {advances.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">{t('cashAdvance.noAdvancesYet')}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead>
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {t('common.student')}
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Week
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Weekly Sales
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Advance Amount
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Request Date
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {advances.map((advance) => (
                    <tr key={advance.id} className={advance.status === 'PENDING' ? 'bg-yellow-50/50' : ''}>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-900">
                        <div className="flex items-center gap-2">
                          <User size={16} className="text-gray-400" />
                          <span>{advance.personName}</span>
                          <Badge 
                            variant={advance.personType === 'COLPORTER' ? 'primary' : 'success'} 
                            size="sm"
                          >
                            {advance.personType}
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
                          <span>{advance.totalSales.toFixed(2)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-right font-medium text-gray-900">
                        <div className="flex items-center justify-end gap-1">
                          <DollarSign size={16} className="text-gray-400" />
                          <span>{advance.advanceAmount.toFixed(2)}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-center">
                        {getStatusBadge(advance.status)}
                      </td>
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {new Date(advance.requestDate).toLocaleDateString()}
                      </td>
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
                    Cash Advance Details
                  </h2>
                  <button
                    type="button"
                    onClick={() => setSelectedAdvance(null)}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Person</p>
                    <p className="font-medium">{selectedAdvance.personName}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Type</p>
                    <Badge 
                      variant={selectedAdvance.personType === 'COLPORTER' ? 'primary' : 'success'}
                    >
                      {selectedAdvance.personType}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Week</p>
                    <p className="font-medium">
                      {new Date(selectedAdvance.weekStartDate).toLocaleDateString()} - {new Date(selectedAdvance.weekEndDate).toLocaleDateString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Status</p>
                    {getStatusBadge(selectedAdvance.status)}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Weekly Sales</p>
                    <p className="font-medium">${selectedAdvance.totalSales.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Advance Amount</p>
                    <p className="font-medium">${selectedAdvance.advanceAmount.toFixed(2)}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Request Date</p>
                    <p className="font-medium">{new Date(selectedAdvance.requestDate).toLocaleDateString()}</p>
                  </div>
                  {selectedAdvance.approvedDate && (
                    <div>
                      <p className="text-sm font-medium text-gray-500">Approved Date</p>
                      <p className="font-medium">{new Date(selectedAdvance.approvedDate).toLocaleDateString()}</p>
                    </div>
                  )}
                </div>

                {selectedAdvance.status === 'PENDING' && (
                  <div className="flex justify-end gap-3 pt-4 border-t border-gray-200">
                    <Button
                      variant="outline"
                      onClick={() => setSelectedAdvance(null)}
                    >
                      Close
                    </Button>
                    <Button
                      variant="success"
                      onClick={() => {
                        handleApprove(selectedAdvance.id);
                        setSelectedAdvance(null);
                      }}
                      disabled={actionLoading}
                    >
                      Approve
                    </Button>
                    <Button
                      variant="danger"
                      onClick={() => {
                        handleReject(selectedAdvance.id);
                        setSelectedAdvance(null);
                      }}
                      disabled={actionLoading}
                    >
                      Reject
                    </Button>
                  </div>
                )}

                {selectedAdvance.status !== 'PENDING' && (
                  <div className="flex justify-end pt-4 border-t border-gray-200">
                    <Button
                      variant="outline"
                      onClick={() => setSelectedAdvance(null)}
                    >
                      Close
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