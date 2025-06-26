import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  UserPlus, Search, Download, 
  Mail, Phone, Building2, MapPin, User,
  Pencil, Trash2, UserCog
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

const AllPeoplePage: React.FC = () => {
  const { t } = useTranslation();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState<'COLPORTER' | 'LEADER' | ''>('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const {program} = useProgramStore();

  const { 
    people, 
    fetchPeople,
    isLoading: peopleLoading,
    error: peopleError,
    werePeopleFetched,
    createPerson,
    updatePerson,
    deletePerson
  } = useUserStore();

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const programId = program?.id;
        !werePeopleFetched && await fetchPeople(programId);
      } catch (err) {
        setError(err instanceof Error ? err.message : t('peoplePage.errorLoadingPeople'));
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [fetchPeople, werePeopleFetched, t]);

  const handleAddPerson = () => {
    setShowAddForm(true);
    setEditingPerson(null);
  };

  const handleAddOrEditPerson = async (data: any) => {
    try {
      if (editingPerson) {
        await updatePerson(editingPerson.id, data);
      } else {
        await createPerson(data);
      }
      
      setShowAddForm(false);
      setEditingPerson(null);
    } catch (error) {
      console.error('Error saving person:', error);
    }
  };

  const handleEditPerson = (person: Person) => {
    setEditingPerson(person);
    setShowAddForm(true);
  };

  const handleDeletePerson = async (id: string, type: 'COLPORTER' | 'LEADER') => {
    if (window.confirm(t('peoplePage.confirmDelete'))) {
      try {
        await deletePerson(id, type);
      } catch (error) {
        console.error(`Error deleting ${type.toLowerCase()}:`, error);
      }
    }
  };

  const columns = [
    columnHelper.accessor('name', {
      header: t('leaderForm.name'),
      cell: info => (
        <div className="flex items-center gap-3">
          <div className={`h-10 w-10 rounded-full flex items-center justify-center text-white ${
            info.row.original.personType === 'COLPORTER' 
              ? 'bg-primary-600' 
              : 'bg-success-600'
          }`}>
            {info.row.original.personType === 'COLPORTER' 
              ? <User size={20} /> 
              : <UserCog size={20} />
            }
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
    columnHelper.accessor(row => row.personType === 'COLPORTER' ? row.school : row.institution, {
      id: 'organization',
      header: t('peoplePage.organization'),
      cell: info => (
        <div className="flex items-center gap-1">
          <Building2 size={16} className="text-gray-400" />
          <span>{info.getValue()}</span>
        </div>
      ),
    }),
    columnHelper.accessor('address', {
      header: t('leaderForm.address'),
      cell: info => (
        <div className="flex items-center gap-1">
          <MapPin size={16} className="text-gray-400" />
          <span>{info.getValue()}</span>
        </div>
      ),
    }),
    columnHelper.accessor('personType', {
      header: t('peoplePage.type'),
      cell: info => (
        <Badge
          variant={info.getValue() === 'COLPORTER' ? 'primary' : 'success'}
          rounded
        >
          {t(`personForm.${info.getValue().toLowerCase()}`)}
        </Badge>
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
            onClick={() => handleEditPerson(info.row.original)}
          >
            <Pencil size={16} className="text-primary-600" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => handleDeletePerson(info.row.original.id, info.row.original.personType)}
          >
            <Trash2 size={16} className="text-danger-600" />
          </Button>
        </div>
      ),
    }),
  ];

  const filteredPeople = React.useMemo(() => {
    return people.filter(person => {
      const matchesSearch = person.name.toLowerCase().includes(globalFilter.toLowerCase()) ||
                          person.email.toLowerCase().includes(globalFilter.toLowerCase());
      const matchesType = !typeFilter || person.personType === typeFilter;
      return matchesSearch && matchesType;
    });
  }, [people, globalFilter, typeFilter]);

  const table = useReactTable({
    data: filteredPeople,
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

  if (isLoading || peopleLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingScreen message={t('peoplePage.loadingPeople')} />
      </div>
    );
  }

  if (error || peopleError) {
    return (
      <div className="p-4 bg-danger-50 border border-danger-200 rounded-lg text-danger-700">
        <p className="font-medium">{t('peoplePage.errorLoadingPeople')}</p>
        <p>{error || peopleError}</p>
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
                placeholder={t('peoplePage.searchPlaceholder')}
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                leftIcon={<Search size={18} />}
                className="w-full sm:w-64"
              />
              
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value as 'COLPORTER' | 'LEADER' | '')}
                className="block w-full sm:w-48 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              >
                <option value="">{t('common.allTypes')}</option>
                <option value="COLPORTER">{t('common.colporters')}</option>
                <option value="LEADER">{t('common.leaders')}</option>
              </select>
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                leftIcon={<Download size={18} />}
              >
                {t('common.export')}
              </Button>
              
              <Button
                variant="primary"
                leftIcon={<UserPlus size={18} />}
                onClick={handleAddPerson}
              >
                {t('common.addPerson')}
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

      {showAddForm && (
        <AddPersonForm
          onClose={() => {
            setShowAddForm(false);
            setEditingPerson(null);
          }}
          onSubmit={handleAddOrEditPerson}
          initialData={editingPerson || undefined}
          initialPersonType={editingPerson?.personType}
        />
      )}
    </div>
  );
};

export default AllPeoplePage;