import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Plus, Search, Filter, Download, 
  Clock, CheckCircle, XCircle, DollarSign, 
  AlertTriangle, Pencil, Trash2
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
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';
import AddChargeForm from './AddChargeForm';
import { useChargeStore } from '../../stores/chargeStore';
import { Charge } from '../../types';

const columnHelper = createColumnHelper<Charge>();

const ChargesPage: React.FC = () => {
  const { t } = useTranslation();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingCharge, setEditingCharge] = useState<Charge | null>(null);

  const { 
    charges, 
    isLoading, 
    fetchCharges, 
    createCharge, 
    updateCharge,
    deleteCharge,
    applyCharge,
    cancelCharge
  } = useChargeStore();

  useEffect(() => {
    fetchCharges();
  }, [fetchCharges]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge variant="warning\" leftIcon={<Clock size={14} />}>{t('transactions.pending')}</Badge>;
      case 'APPLIED':
        return <Badge variant="success" leftIcon={<CheckCircle size={14} />}>{t('transactions.approved')}</Badge>;
      case 'CANCELLED':
        return <Badge variant="danger" leftIcon={<XCircle size={14} />}>{t('transactions.rejected')}</Badge>;
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

  const getPersonTypeBadge = (type: string) => {
    return (
      <Badge 
        variant={type === 'COLPORTER' ? 'primary' : 'success'}
      >
        {type}
      </Badge>
    );
  };

  const handleAddCharge = async (data: Omit<Charge, 'id' | 'createdAt' | 'updatedAt'>) => {
    try {
      await createCharge(data);
      setShowAddForm(false);
    } catch (error) {
      console.error('Error creating charge:', error);
    }
  };

  const handleEditCharge = async (data: Partial<Charge>) => {
    if (!editingCharge) return;
    try {
      await updateCharge(editingCharge.id, data);
      setEditingCharge(null);
    } catch (error) {
      console.error('Error updating charge:', error);
    }
  };

  const handleDeleteCharge = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this charge?')) return;
    try {
      await deleteCharge(id);
    } catch (error) {
      console.error('Error deleting charge:', error);
    }
  };

  const handleApplyCharge = async (id: string) => {
    if (!window.confirm('Are you sure you want to apply this charge?')) return;
    try {
      await applyCharge(id);
    } catch (error) {
      console.error('Error applying charge:', error);
    }
  };

  const handleCancelCharge = async (id: string) => {
    if (!window.confirm('Are you sure you want to cancel this charge?')) return;
    try {
      await cancelCharge(id);
    } catch (error) {
      console.error('Error cancelling charge:', error);
    }
  };

  const columns = [
    columnHelper.accessor('date', {
      header: 'Date',
      cell: info => new Date(info.getValue()).toLocaleDateString(),
    }),
    columnHelper.accessor('personName', {
      header: 'Person',
      cell: info => (
        <div>
          <div className="font-medium text-gray-900">{info.getValue()}</div>
          <div className="text-sm text-gray-500">{getPersonTypeBadge(info.row.original.personType)}</div>
        </div>
      ),
    }),
    columnHelper.accessor('reason', {
      header: 'Reason',
      cell: info => (
        <div>
          <div className="font-medium text-gray-900">{info.getValue()}</div>
          {info.row.original.description && (
            <div className="text-sm text-gray-500 truncate max-w-xs">
              {info.row.original.description}
            </div>
          )}
        </div>
      ),
    }),
    columnHelper.accessor('category', {
      header: 'Category',
      cell: info => getCategoryBadge(info.getValue()),
    }),
    columnHelper.accessor('amount', {
      header: 'Amount',
      cell: info => (
        <div className="flex items-center gap-1 font-medium text-red-600">
          <DollarSign size={14} />
          {info.getValue().toFixed(2)}
        </div>
      ),
    }),
    columnHelper.accessor('appliedByName', {
      header: 'Applied By',
      cell: info => (
        <div className="text-sm text-gray-600">{info.getValue()}</div>
      ),
    }),
    columnHelper.accessor('status', {
      header: 'Status',
      cell: info => getStatusBadge(info.getValue()),
    }),
    columnHelper.display({
      id: 'actions',
      header: 'Actions',
      cell: info => (
        <div className="flex items-center gap-2">
          {info.row.original.status === 'PENDING' && (
            <>
              <Button
                variant="success"
                size="sm"
                onClick={() => handleApplyCharge(info.row.original.id)}
              >
                <CheckCircle size={14} />
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => handleCancelCharge(info.row.original.id)}
              >
                <XCircle size={14} />
              </Button>
            </>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setEditingCharge(info.row.original)}
          >
            <Pencil size={14} />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDeleteCharge(info.row.original.id)}
          >
            <Trash2 size={14} className="text-danger-600" />
          </Button>
        </div>
      ),
    }),
  ];

  const filteredCharges = charges.filter(charge => {
    const matchesSearch = charge.personName.toLowerCase().includes(globalFilter.toLowerCase()) ||
                         charge.reason.toLowerCase().includes(globalFilter.toLowerCase());
    const matchesStatus = !statusFilter || charge.status === statusFilter;
    const matchesType = !typeFilter || charge.personType === typeFilter;
    return matchesSearch && matchesStatus && matchesType;
  });

  const table = useReactTable({
    data: filteredCharges,
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

  // Calculate totals
  const totals = filteredCharges.reduce((acc, charge) => {
    if (charge.status === 'APPLIED') {
      acc.applied += charge.amount;
    } else if (charge.status === 'PENDING') {
      acc.pending += charge.amount;
    }
    acc.total += charge.amount;
    return acc;
  }, { applied: 0, pending: 0, total: 0 });

  return (
    <div className="space-y-6">
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
            <p className="mt-1 text-2xl font-bold text-red-600">${totals.total.toFixed(2)}</p>
            <p className="text-xs text-gray-500">All time</p>
          </div>
        </Card>
        
        <Card>
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <CheckCircle className="text-success-500" size={24} />
            </div>
            <p className="text-sm font-medium text-gray-500">Applied Charges</p>
            <p className="mt-1 text-2xl font-bold text-success-600">${totals.applied.toFixed(2)}</p>
            <p className="text-xs text-gray-500">Processed</p>
          </div>
        </Card>
        
        <Card>
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <Clock className="text-warning-500" size={24} />
            </div>
            <p className="text-sm font-medium text-gray-500">Pending Charges</p>
            <p className="mt-1 text-2xl font-bold text-warning-600">${totals.pending.toFixed(2)}</p>
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
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
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

              <Button
                variant="outline"
                leftIcon={<Filter size={18} />}
              >
                Filter
              </Button>
            </div>
            
            <Button
              variant="outline"
              leftIcon={<Download size={18} />}
            >
              Export
            </Button>
          </div>

          <div className="overflow-x-auto">
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