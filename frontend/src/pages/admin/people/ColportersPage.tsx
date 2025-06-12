import React, { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  UserPlus, Search, Download, Filter, 
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
import Input from '../../../components/ui/Input';
import Badge from '../../../components/ui/Badge';
import AddColporterForm from './AddColporterForm';
import { useUserStore } from '../../../stores/userStore';
import { Person } from '../../../types';
import Spinner from '../../../components/ui/Spinner';

const columnHelper = createColumnHelper<Person>();

const ColportersPage: React.FC = () => {
  const { t } = useTranslation();
  const [sorting, setSorting] = useState<SortingState>([]);
  const [globalFilter, setGlobalFilter] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingColporter, setEditingColporter] = useState<Person | null>(null);

  const { 
    people, 
    isLoading, 
    error,
    fetchPeople,
  } = useUserStore();

  useEffect(() => {
    fetchPeople();
  }, [fetchPeople]);

  // Filter only colporters
  const colporters = people.filter(person => person.personType === 'COLPORTER');

  const handleAddColporter = async (data: any) => {
    try {
      // In a real implementation, this would call an API to create a colporter
      console.log('Creating colporter:', data);
      setShowAddForm(false);
    } catch (error) {
      console.error('Error creating colporter:', error);
    }
  };

  const handleEditColporter = async (data: any) => {
    if (!editingColporter) return;
    try {
      // In a real implementation, this would call an API to update a colporter
      console.log('Updating colporter:', data);
      setEditingColporter(null);
    } catch (error) {
      console.error('Error updating colporter:', error);
    }
  };

  const handleDeleteColporter = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this colporter?')) return;
    try {
      // In a real implementation, this would call an API to delete a colporter
      console.log('Deleting colporter:', id);
    } catch (error) {
      console.error('Error deleting colporter:', error);
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
    columnHelper.accessor('school', {
      header: 'School',
      cell: info => (
        <div className="flex items-center gap-1">
          <School size={16} className="text-gray-400" />
          <span className="text-sm">{info.getValue()}</span>
        </div>
      ),
    }),
    columnHelper.accessor('age', {
      header: 'Age',
      cell: info => (
        <Badge variant="secondary" size="sm">
          {info.getValue()}
        </Badge>
      ),
    }),
    columnHelper.accessor('address', {
      header: 'Address',
      cell: info => (
        <div className="flex items-center gap-1">
          <MapPin size={16} className="text-gray-400" />
          <span className="text-sm">{info.getValue()}</span>
        </div>
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
            onClick={() => setEditingColporter(info.row.original)}
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
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 bg-danger-50 border border-danger-200 rounded-lg text-danger-700">
        <p className="font-medium">Error loading colporters</p>
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
                placeholder="Search colporters..."
                value={globalFilter}
                onChange={(e) => setGlobalFilter(e.target.value)}
                leftIcon={<Search size={18} />}
                className="w-full sm:w-64"
              />
              
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
                onClick={() => setShowAddForm(true)}
              >
                Add Colporter
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

      {(showAddForm || editingColporter) && (
        <AddColporterForm
          onClose={() => {
            setShowAddForm(false);
            setEditingColporter(null);
          }}
          onSubmit={editingColporter ? handleEditColporter : handleAddColporter}
          initialData={editingColporter || undefined}
        />
      )}
    </div>
  );
};

export default ColportersPage;