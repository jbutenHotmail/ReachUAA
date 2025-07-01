import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Mail, Phone, School, MapPin, User,
 X, Search
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
import { useProgramStore } from '../../../stores/programStore';

const columnHelper = createColumnHelper<Person>();

const ColportersPage: React.FC = () => {
  const { t } = useTranslation();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingColporter, setEditingColporter] = useState<Person | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { program } = useProgramStore();
  const { 
    people, 
    isLoading, 
    fetchPeople,
    createPerson,
    updatePerson,
    werePeopleFetched
  } = useUserStore();

  // Clear feedback messages when component unmounts
  useEffect(() => {
    return () => {
      setError(null);
      setSuccess(null);
    };
  }, []);

  useEffect(() => {
    if(!werePeopleFetched) {
      const programId = program?.id;
      fetchPeople(programId);
    }  
  }, [fetchPeople, werePeopleFetched, program]);

  const colporters = people.filter(person => person.personType === 'COLPORTER');

  const handleAddColporter = async (data: any) => {
    try {
      await createPerson({
        ...data,
        personType: 'COLPORTER'
      });
      setShowAddForm(false);
      setSuccess(t('personForm.createSuccess'));
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      setError(error instanceof Error ? error.message : t('personForm.errorSaving'));
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleEditColporter = async (data: any) => {
    if (!editingColporter) return;
    try {
      await updatePerson(editingColporter.id, {
        ...data,
        personType: 'COLPORTER'
      });
      setEditingColporter(null);
      setShowAddForm(false);
      setSuccess(t('personForm.updateSuccess'));
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      setError(error instanceof Error ? error.message : t('personForm.errorSaving'));
      setTimeout(() => setError(null), 5000);
    }
  };

  const columns = [
    columnHelper.accessor('name', {
      header: t('leaderForm.name'),
      cell: info => (
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-primary-100 flex items-center justify-center text-primary-700">
            <User size={20} />
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
    columnHelper.accessor('school', {
      header: t('colportersPage.school'),
      cell: info => (
        <div className="flex items-center gap-1">
          <School size={16} className="text-gray-400" />
          <span className="text-sm">{info.getValue()}</span>
        </div>
      ),
    }),
    columnHelper.accessor('age', {
      header: t('colportersPage.age'),
      cell: info => (
        <Badge variant="secondary" size="sm">
          {info.getValue()}
        </Badge>
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
    })
   
  ];

  const filteredColporters = colporters.filter(colporter => 
    colporter.name.toLowerCase().includes(globalFilter.toLowerCase()) ||
    colporter.apellido.toLowerCase().includes(globalFilter.toLowerCase()) ||
    colporter.email.toLowerCase().includes(globalFilter.toLowerCase())
  );

  const table = useReactTable({
    data: filteredColporters,
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
        <LoadingScreen message={t('colportersPage.loadingColporters')} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {success && (
        <div className="p-4 bg-success-50 border border-success-200 rounded-lg flex items-center justify-between">
          <p className="text-success-700">{success}</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setSuccess(null)}
          >
            <X size={16} />
          </Button>
        </div>
      )}

      {error && (
        <div className="p-4 bg-danger-50 border border-danger-200 rounded-lg flex items-center justify-between">
          <p className="text-danger-700">{error}</p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setError(null)}
          >
            <X size={16} />
          </Button>
        </div>
      )}

      <Card>
        <div className="space-y-4">
          <div className="flex justify-between items-center mb-4">
            <Input
              placeholder={t('colportersPage.searchPlaceholder')}
              value={globalFilter}
              onChange={(e) => setGlobalFilter(e.target.value)}
              leftIcon={<Search size={18} />}
              className="w-full sm:w-64"
            />
            
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

      {(showAddForm || editingColporter) && (
        <AddPersonForm
          onClose={() => {
            setShowAddForm(false);
            setEditingColporter(null);
          }}
          onSubmit={editingColporter ? handleEditColporter : handleAddColporter}
          initialData={editingColporter || undefined}
          initialPersonType="COLPORTER"
        />
      )}
    </div>
  );
};

export default ColportersPage;