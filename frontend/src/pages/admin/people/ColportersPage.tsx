import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  Mail, Phone, School, MapPin, User,
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
  const { program } = useProgramStore();
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
    
    if(!werePeopleFetched) {
      const programId = program?.id;
      fetchPeople(programId);
    }  
  }, [fetchPeople, werePeopleFetched]);

  const colporters = people.filter(person => person.personType === 'COLPORTER');

  const handleAddColporter = async (data: any) => {
    try {
      await createPerson({
        ...data,
        personType: 'COLPORTER'
      });
      setShowAddForm(false);
    } catch (error) {
      console.error('Error creating colporter:', error);
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
      setShowAddForm(false); // Close the form after editing
    } catch (error) {
      console.error('Error updating colporter:', error);
    }
  };

  const handleDeleteColporter = async (id: string) => {
    if (!window.confirm(t('colportersPage.confirmDelete'))) return;
    try {
      await deletePerson(id, 'COLPORTER');
    } catch (error) {
      console.error('Error deleting colporter:', error);
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
    }),
    columnHelper.display({
      id: 'actions',
      header: t('peoplePage.actions'),
      cell: info => (
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setEditingColporter(info.row.original);
              setShowAddForm(true);
            }}
          >
            <Pencil size={16} className="text-primary-600" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDeleteColporter(info.row.original.id)}
          >
            <Trash2 size={16} className="text-danger-600" />
          </Button>
        </div>
      ),
    }),
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

  if (error) {
    return (
      <div className="p-4 bg-danger-50 border border-danger-200 rounded-lg text-danger-700">
        <p className="font-medium">{t('colportersPage.errorLoadingColporters')}</p>
        <p>{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <div className="space-y-4">

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