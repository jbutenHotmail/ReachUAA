import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  UserPlus, Search, Download, Filter, 
  Mail, Phone, Building2, MapPin, User,
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
import AddColporterForm from './AddColporterForm';
import AddLeaderForm from './AddLeaderForm';
import { useUserStore } from '../../../stores/userStore';
import { Person } from '../../../types';
import Spinner from '../../../components/ui/Spinner';

const columnHelper = createColumnHelper<Person>();

const AllPeoplePage: React.FC = () => {
  const { t } = useTranslation();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [typeFilter, setTypeFilter] = useState<'COLPORTER' | 'LEADER' | ''>('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [addPersonType, setAddPersonType] = useState<'COLPORTER' | 'LEADER'>('COLPORTER');
  const [editingPerson, setEditingPerson] = useState<Person | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const { 
    people, 
    fetchPeople,
    isLoading: peopleLoading,
    error: peopleError
  } = useUserStore();

  useEffect(() => {
    const loadData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        await fetchPeople();
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load people data');
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [fetchPeople]);

  const handleAddPerson = () => {
    setShowAddForm(true);
    setAddPersonType('COLPORTER'); // Default to colporter
  };

  const handleAddPersonTypeSelect = (type: 'COLPORTER' | 'LEADER') => {
    setAddPersonType(type);
  };

  const handleAddColporter = async (data: any) => {
    try {
      // In a real implementation, this would call an API to create a colporter
      console.log('Creating colporter:', data);
      setShowAddForm(false);
    } catch (error) {
      console.error('Error creating colporter:', error);
    }
  };

  const handleAddLeader = async (data: any) => {
    try {
      // In a real implementation, this would call an API to create a leader
      console.log('Creating leader:', data);
      setShowAddForm(false);
    } catch (error) {
      console.error('Error creating leader:', error);
    }
  };

  const handleEditPerson = (person: Person) => {
    setEditingPerson(person);
    setAddPersonType(person.personType);
    setShowAddForm(true);
  };

  const handleDeletePerson = async (id: string, type: 'COLPORTER' | 'LEADER') => {
    if (window.confirm('Are you sure you want to delete this person?')) {
      try {
        // In a real implementation, this would call an API to delete a person
        console.log(`Deleting ${type.toLowerCase()}:`, id);
      } catch (error) {
        console.error(`Error deleting ${type.toLowerCase()}:`, error);
      }
    }
  };

  const columns = [
    columnHelper.accessor('name', {
      header: 'Name',
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
      header: 'Contact',
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
      header: 'Organization',
      cell: info => (
        <div className="flex items-center gap-1">
          <Building2 size={16} className="text-gray-400" />
          <span>{info.getValue()}</span>
        </div>
      ),
    }),
    columnHelper.accessor('address', {
      header: 'Address',
      cell: info => (
        <div className="flex items-center gap-1">
          <MapPin size={16} className="text-gray-400" />
          <span>{info.getValue()}</span>
        </div>
      ),
    }),
    columnHelper.accessor('personType', {
      header: 'Type',
      cell: info => (
        <Badge
          variant={info.getValue() === 'COLPORTER' ? 'primary' : 'success'}
          rounded
        >
          {info.getValue()}
        </Badge>
      ),
    }),
    columnHelper.accessor('status', {
      header: 'Status',
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
      header: 'Created At',
      cell: info => new Date(info.getValue()).toLocaleDateString(),
    }),
    columnHelper.display({
      id: 'actions',
      header: 'Actions',
      cell: info => (
        <div className="flex items-center gap-2">
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
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || peopleError) {
    return (
      <div className="p-4 bg-danger-50 border border-danger-200 rounded-lg text-danger-700">
        <p className="font-medium">Error loading people</p>
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
                placeholder="Search people..."
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
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                leftIcon={<Download size={18} />}
              >
                Export
              </Button>
              
              <Button
                variant="primary"
                leftIcon={<UserPlus size={18} />}
                onClick={handleAddPerson}
              >
                Add Person
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

      {/* Add Person Type Selection Modal */}
      {showAddForm && !editingPerson && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <Card>
              <div className="space-y-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  Select Person Type
                </h2>
                
                <div className="grid grid-cols-2 gap-4">
                  <button
                    onClick={() => handleAddPersonTypeSelect('COLPORTER')}
                    className={`p-4 rounded-lg border-2 flex flex-col items-center justify-center gap-2 transition-colors ${
                      addPersonType === 'COLPORTER' 
                        ? 'border-primary-500 bg-primary-50 text-primary-700' 
                        : 'border-gray-200 hover:border-primary-200 hover:bg-primary-50/50'
                    }`}
                  >
                    <User size={24} className={addPersonType === 'COLPORTER' ? 'text-primary-600' : 'text-gray-400'} />
                    <span className="font-medium">Colporter</span>
                  </button>
                  
                  <button
                    onClick={() => handleAddPersonTypeSelect('LEADER')}
                    className={`p-4 rounded-lg border-2 flex flex-col items-center justify-center gap-2 transition-colors ${
                      addPersonType === 'LEADER' 
                        ? 'border-success-500 bg-success-50 text-success-700' 
                        : 'border-gray-200 hover:border-success-200 hover:bg-success-50/50'
                    }`}
                  >
                    <User size={24} className={addPersonType === 'LEADER' ? 'text-success-600' : 'text-gray-400'} />
                    <span className="font-medium">Leader</span>
                  </button>
                </div>
                
                <div className="flex justify-end gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setShowAddForm(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="primary"
                    onClick={() => {
                      // Continue to the appropriate form based on selection
                      if (addPersonType === 'COLPORTER') {
                        // Show colporter form directly
                        setShowAddForm(true);
                      } else {
                        // Show leader form directly
                        setShowAddForm(true);
                      }
                    }}
                  >
                    Continue
                  </Button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      )}

      {/* Render the appropriate form based on selection */}
      {showAddForm && (
        <>
          {addPersonType === 'COLPORTER' ? (
            <AddColporterForm
              onClose={() => {
                setShowAddForm(false);
                setEditingPerson(null);
              }}
              onSubmit={handleAddColporter}
              initialData={editingPerson?.personType === 'COLPORTER' ? editingPerson : undefined}
            />
          ) : (
            <AddLeaderForm
              onClose={() => {
                setShowAddForm(false);
                setEditingPerson(null);
              }}
              onSubmit={handleAddLeader}
              initialData={editingPerson?.personType === 'LEADER' ? editingPerson : undefined}
            />
          )}
        </>
      )}
    </div>
  );
};

export default AllPeoplePage;