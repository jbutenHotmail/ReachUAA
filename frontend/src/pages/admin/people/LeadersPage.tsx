import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Search, Download, Filter, 
  Mail, Phone, Building2, MapPin, UserCog,
  Pencil, Trash2
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
import AddPersonForm from './AddPersonForm';
import { useUserStore } from '../../../stores/userStore';
import { Person } from '../../../types';
import LoadingScreen from '../../../components/ui/LoadingScreen';

const columnHelper = createColumnHelper<Person>();

const LeadersPage: React.FC = () => {
  const { t } = useTranslation();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingLeader, setEditingLeader] = useState<Person | null>(null);

  const { 
    people, 
    isLoading, 
    error,
    fetchPeople,
    createPerson,
    updatePerson,
    deletePerson,
    werePeopleFetched
  } = useUserStore();

  useEffect(() => {
    !werePeopleFetched && fetchPeople();
  }, [fetchPeople, werePeopleFetched]);

  const leaders = people.filter(person => person.personType === 'LEADER');

  const handleAddLeader = async (data: any) => {
    try {
      await createPerson({
        ...data,
        personType: 'LEADER'
      });
      setShowAddForm(false);
    } catch (error) {
      console.error('Error creating leader:', error);
    }
  };

  const handleEditLeader = async (data: any) => {
    if (!editingLeader) return;
    try {
      await updatePerson(editingLeader.id, {
        ...data,
        personType: 'LEADER'
      });
      setEditingLeader(null);
      setShowAddForm(false); // Close the form after editing
    } catch (error) {
      console.error('Error updating leader:', error);
    }
  };

  const handleDeleteLeader = async (id: string) => {
    if (!window.confirm(t('leadersPage.confirmDelete'))) return;
    try {
      await deletePerson(id, 'LEADER');
    } catch (error) {
      console.error('Error deleting leader:', error);
    }
  };

  const columns = [
    columnHelper.accessor('name', {
      header: t('leaderForm.name'),
      cell: info => (
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-success-100 flex items-center justify-center text-success-700">
            <UserCog size={20} />
          </div>
          <div>
            <div className="font-medium text-gray-900">{`${info.getValue()} ${info.row.original.apellido}`}</div>
            <div className="text-sm text-gray-500">{info.row.original.email}</div>
          </div>
        </div>
      ),
    }),
    columnHelper.accessor('phone', {
      header: t('peoplePage.contact'),
      cell: info => (
        <div className="space-y-1">
          <div className="flex items-center gap-1 text-gray-600">
            <Phone size={14} />
            <span>{info.getValue()}</span>
          </div>
          <div className="flex items-center gap-1 text-gray-600">
            <Mail size={14} />
            <span>{info.row.original.email}</span>
          </div>
        </div>
      ),
    }),
    columnHelper.accessor('institution', {
      header: t('leaderForm.institution'),
      cell: info => (
        <div className="flex items-center gap-1">
          <Building2 size={16} className="text-gray-400" />
          <span className="text-sm">{info.getValue()}</span>
        </div>
      ),
    }),
    columnHelper.accessor('address', {
      header: t('leaderForm.address'),
      cell: info => (
        <div className="flex items-center gap-1">
          <MapPin size={16} className="text-gray-400" />
          <span className="text-sm">{info.getValue()}</span>
        </div>
      ),
    }),
    columnHelper.accessor('status', {
      header: t('peoplePage.status'),
      cell: info => (
        <Badge
          variant={info.getValue() === 'ACTIVE' ? 'success' : 'danger'}
          rounded
        >
          {info.getValue()}
        </Badge>
      ),
    }),
    columnHelper.accessor('createdAt', {
      header: t('peoplePage.createdAt'),
      cell: info => new Date(info.getValue()).toLocaleDateString('es-US'),
    }),
    columnHelper.display({
      id: 'actions',
      header: t('peoplePage.actions'),
      cell: info => (
        <div className="flex items-center justify-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setEditingLeader(info.row.original);
              setShowAddForm(true);
            }}
          >
            <Pencil size={16} className="text-primary-600" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDeleteLeader(info.row.original.id)}
          >
            <Trash2 size={16} className="text-danger-600" />
          </Button>
        </div>
      ),
    }),
  ];

  const filteredLeaders = leaders.filter(leader => 
    leader.name.toLowerCase().includes(globalFilter.toLowerCase()) ||
    leader.apellido.toLowerCase().includes(globalFilter.toLowerCase()) ||
    leader.email.toLowerCase().includes(globalFilter.toLowerCase())
  );

  const table = useReactTable({
    data: filteredLeaders,
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
        <LoadingScreen message={t('leadersPage.loadingLeaders')} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-danger-50 border border-danger-200 rounded-lg text-danger-700">
        <p className="font-medium">{t('leadersPage.errorLoadingLeaders')}</p>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <Input
                placeholder={t('leadersPage.searchPlaceholder')}
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                leftIcon={<Search size={18} />}
                className="w-full sm:w-64"
              />
              
              <Button
                variant="outline"
                leftIcon={<Filter size={18} />}
              >
                {t('common.filter')}
              </Button>
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                leftIcon={<Download size={18} />}
              >
                {t('common.export')}
              </Button>
            </div>
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

      {(showAddForm || editingLeader) && (
        <AddPersonForm
          onClose={() => {
            setShowAddForm(false);
            setEditingLeader(null);
          }}
          onSubmit={editingLeader ? handleEditLeader : handleAddLeader}
          initialData={editingLeader || undefined}
          initialPersonType="LEADER"
        />
      )}
    </div>
  );
};

export default LeadersPage;