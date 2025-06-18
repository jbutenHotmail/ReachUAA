import React, { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Calendar, 
  TrendingDown, 
  TrendingUp,
  Package,
  Edit3,
  Save,
  X
} from 'lucide-react';
import { useInventoryStore } from '../../stores/inventoryStore';
import { useTransactionStore } from '../../stores/transactionStore';
import { useAuthStore } from '../../stores/authStore';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';
import LoadingScreen from '../../components/ui/LoadingScreen';
import { UserRole, InventoryCount, BookSize } from '../../types';

const InventoryTracking: React.FC = () => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  const { books, fetchBooks, updateInventoryCount, inventoryCounts: storedCounts, fetchInventoryCounts, isLoading, wereBooksLoaded } = useInventoryStore();
  const { transactions, fetchTransactions, wereTransactionsFetched } = useTransactionStore();
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<number>(0);
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [confirmingDiscrepancy, setConfirmingDiscrepancy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    if (!wereBooksLoaded) {
      fetchBooks();
    }
    if (!wereTransactionsFetched) {
      fetchTransactions(selectedDate);
    }
    fetchInventoryCounts(selectedDate);
  }, [fetchBooks, fetchTransactions, fetchInventoryCounts, selectedDate, wereBooksLoaded, wereTransactionsFetched]);

  // Filter only active books
  const activeBooks = books.filter(book => book.is_active);

  // Create inventory counts for display
  const inventoryCounts = React.useMemo(() => {
    // If we have stored counts, use them as the base
    if (storedCounts.length > 0) {
      return activeBooks.map(book => {
        // Find existing count for this book
        const existingCount = storedCounts.find(
          ic => ic.book_id === book.id && ic.count_date.toString().split('T')[0] === selectedDate
        );
        
        if (existingCount) {
          // Use the stored system_count directly from the database
          return {
            ...existingCount,
            id: book.id,
            book_title: book.title,
            book_size: book.size,
            // Status is now determined by the database status if available, or calculated
            status: existingCount.status || 
              (existingCount.manual_count === null 
                ? 'PENDING' 
                : existingCount.manual_count === existingCount.system_count 
                  ? 'VERIFIED' 
                  : 'DISCREPANCY')
          };
        } else {
          // For books without counts, create a new entry
          // Calculate books delivered from APPROVED transactions
          const deliveredCount = transactions
            .filter(t => t.status === 'APPROVED') // Only count APPROVED transactions
            .reduce((total, transaction) => {
              const bookInTransaction = transaction.books?.find(b => b.id === book.id);
              return total + (bookInTransaction?.quantity || 0);
            }, 0);

          // System count = initial stock - delivered books
          const systemCount = Math.max(0, book.stock - deliveredCount);
          
          return {
            id: book.id,
            book_id: book.id,
            book_title: book.title,
            book_size: book.size,
            system_count: systemCount,
            manual_count: null,
            discrepancy: 0,
            updated_at: new Date().toISOString(),
            updatedBy: '',
            count_date: selectedDate,
            status: 'PENDING',
          };
        }
      });
    } else {
      // If no stored counts, calculate them based on current data
      return activeBooks.map(book => {
        // Calculate books delivered from APPROVED transactions
        const deliveredCount = transactions
          .filter(t => t.status === 'APPROVED') // Only count APPROVED transactions
          .reduce((total, transaction) => {
            const bookInTransaction = transaction.books?.find(b => b.id === book.id);
            return total + (bookInTransaction?.quantity || 0);
          }, 0);

        // System count = initial stock - delivered books
        const systemCount = Math.max(0, book.stock - deliveredCount);
        
        return {
          id: book.id,
          book_id: book.id,
          book_title: book.title,
          book_size: book.size,
          system_count: systemCount,
          manual_count: null,
          discrepancy: 0,
          updated_at: new Date().toISOString(),
          updatedBy: '',
          count_date: selectedDate,
          status: 'PENDING',
        };
      });
    }
  }, [activeBooks, transactions, storedCounts, selectedDate]);

  const handleEdit = (id: string, currentValue: number | null) => {
    setEditingId(id);
    setEditValue(currentValue || 0);
  };

  const handleSave = async (id: string) => {
    const countToUpdate = inventoryCounts.find(count => count.id === id);
    if (!countToUpdate) return;
    
    try {
      setError(null);
      setSuccess(null);
      
      // Save the count but don't confirm discrepancy yet
      await updateInventoryCount(id, {
        manualCount: editValue,
        countDate: selectedDate,
        systemCount: countToUpdate.system_count,
        confirmDiscrepancy: false, // Don't update the book stock yet
        setVerified: editValue === countToUpdate.system_count // Mark as verified if counts match
      });
      
      setEditingId(null);
      setSuccess('Count updated successfully');
      
      // Refresh the inventory counts
      await fetchInventoryCounts(selectedDate);
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred while updating the count');
      console.error('Error updating inventory count:', error);
    }
  };

  const handleConfirmDiscrepancy = async (id: string) => {
    const countToUpdate = inventoryCounts.find(count => count.id === id);
    if (!countToUpdate || countToUpdate.manual_count === null) return;
    
    try {
      setError(null);
      setSuccess(null);
      
      // Update the count and confirm the discrepancy (update book stock)
      // Also set the status to VERIFIED even if there's a discrepancy
      await updateInventoryCount(id, {
        manualCount: countToUpdate.manual_count,
        countDate: selectedDate,
        systemCount: countToUpdate.system_count, // Keep the original system count for audit
        confirmDiscrepancy: true, // Update the book stock to match manual count
        setVerified: true // Mark as verified even if there's a discrepancy
      });
      
      // Refresh data to get updated books
      await fetchBooks();
      await fetchInventoryCounts(selectedDate);
      
      setConfirmingDiscrepancy(null);
      setSuccess('Inventory count verified and stock updated');
      setTimeout(() => setSuccess(null), 3000);
    } catch (error) {
      setError(error instanceof Error ? error.message : 'An error occurred while confirming the discrepancy');
      console.error('Error confirming discrepancy:', error);
    }
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditValue(0);
  };

  const getStatusBadge = (status: string, discrepancy: number) => {
    switch (status) {
      case 'VERIFIED':
        return <Badge variant="success" leftIcon={<CheckCircle size={14} />}>Verified</Badge>;
      case 'DISCREPANCY':
        return (
          <Badge 
            variant="danger" 
            leftIcon={discrepancy > 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          >
            {discrepancy > 0 ? `+${discrepancy}` : discrepancy}
          </Badge>
        );
      default:
        return <Badge variant="warning" leftIcon={<AlertTriangle size={14} />}>Pending</Badge>;
    }
  };

  const totalDiscrepancies = inventoryCounts.reduce((sum, count) => sum + Math.abs(count.discrepancy), 0);
  const verifiedCount = inventoryCounts.filter(count => count.status === 'VERIFIED').length;
  const discrepancyCount = inventoryCounts.filter(count => count.status === 'DISCREPANCY').length;

  const canEdit = user?.role === UserRole.ADMIN || user?.role === UserRole.SUPERVISOR;

  if (isLoading) {
    return (
      <LoadingScreen message="Loading inventory data..." />
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <p className="text-sm text-gray-500 mt-1">
            Track inventory discrepancies between system counts and manual counts
          </p>
        </div>
        
        <div className="flex items-center gap-4">
          <Input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="w-auto"
          />
        </div>
      </div>

      {error && (
        <div className="p-4 bg-danger-50 border border-danger-200 rounded-lg text-danger-700">
          <p className="font-medium">Error</p>
          <p>{error}</p>
        </div>
      )}

      {success && (
        <div className="p-4 bg-success-50 border border-success-200 rounded-lg text-success-700">
          <p className="font-medium">Success</p>
          <p>{success}</p>
        </div>
      )}

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <Card>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-500">Total Books</p>
            <p className="mt-2 text-3xl font-bold text-gray-900">{inventoryCounts.length}</p>
          </div>
        </Card>
        
        <Card>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-500">Verified</p>
            <p className="mt-2 text-3xl font-bold text-success-600">{verifiedCount}</p>
          </div>
        </Card>
        
        <Card>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-500">Discrepancies</p>
            <p className="mt-2 text-3xl font-bold text-danger-600">{discrepancyCount}</p>
          </div>
        </Card>
        
        <Card>
          <div className="text-center">
            <p className="text-sm font-medium text-gray-500">Total Lost/Found</p>
            <p className="mt-2 text-3xl font-bold text-warning-600">{totalDiscrepancies}</p>
          </div>
        </Card>
      </div>

      {/* Inventory Table */}
      <Card>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead>
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Book Title
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Size
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  System Count
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Manual Count
                </th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Updated
                </th>
                {canEdit && (
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {inventoryCounts.map((count) => (
                <tr 
                  key={count.id}
                  className={count.status === 'DISCREPANCY' ? 'bg-red-50' : count.status === 'VERIFIED' ? 'bg-green-50' : ''}
                >
                  <td className="px-4 py-3 whitespace-nowrap">
                    <div className="flex items-center">
                      <Package size={20} className="text-gray-400 mr-3" />
                      <div>
                        <div className="text-sm font-medium text-gray-900">{count.book_title}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-center">
                    <Badge 
                      variant={count.book_size === BookSize.LARGE ? "primary" : "success"}
                      size="sm"
                    >
                      {count.book_size === BookSize.LARGE ? "Large" : "Small"}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-center">
                    <Badge variant="primary">{count.system_count}</Badge>
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-center">
                    {editingId === count.id ? (
                      <div className="flex items-center justify-center gap-2">
                        <Input
                          type="number"
                          min="0"
                          value={editValue}
                          onChange={(e) => setEditValue(parseInt(e.target.value) || 0)}
                          className="w-20 text-center"
                        />
                        <Button
                          variant="success"
                          size="sm"
                          onClick={() => handleSave(count.id)}
                        >
                          <Save size={14} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={handleCancel}
                        >
                          <X size={14} />
                        </Button>
                      </div>
                    ) : (
                      <Badge variant={count.manual_count !== null ? "success" : "secondary"}>
                        {count.manual_count !== null ? count.manual_count : 'Not Set'}
                      </Badge>
                    )}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-center">
                    {getStatusBadge(count.status || 'PENDING', count.discrepancy)}
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                    {count.updated_at ? (
                      <div>
                        <div>{new Date(count.updated_at).toLocaleDateString()}</div>
                        {count.updatedBy && (
                          <div className="text-xs text-gray-400">by {count.updatedBy}</div>
                        )}
                      </div>
                    ) : (
                      '-'
                    )}
                  </td>
                  {canEdit && (
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-2">
                        {editingId !== count.id && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(count.id, count.manual_count)}
                          >
                            <Edit3 size={16} />
                          </Button>
                        )}
                        {/* Show confirm button for discrepancies that haven't been verified yet */}
                        {count.status === 'DISCREPANCY' && count.manual_count !== null && (
                          confirmingDiscrepancy === count.id ? (
                            <div className="flex items-center gap-2">
                              <Button
                                variant="success"
                                size="sm"
                                onClick={() => handleConfirmDiscrepancy(count.id)}
                              >
                                <CheckCircle size={14} />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setConfirmingDiscrepancy(null)}
                              >
                                <X size={14} />
                              </Button>
                            </div>
                          ) : (
                            <Button
                              variant="warning"
                              size="sm"
                              onClick={() => setConfirmingDiscrepancy(count.id)}
                              title="Confirm discrepancy and update book stock"
                            >
                              Confirm
                            </Button>
                          )
                        )}
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {/* Discrepancy Summary */}
      {discrepancyCount > 0 && (
        <Card>
          <div className="flex items-start gap-4">
            <AlertTriangle className="text-warning-500 flex-shrink-0 mt-1" size={24} />
            <div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Inventory Discrepancies Detected</h3>
              <p className="text-sm text-gray-600 mb-4">
                There are {discrepancyCount} books with discrepancies between system counts and manual counts. 
                This could indicate lost books, theft, or data entry errors.
              </p>
              <div className="space-y-2">
                {inventoryCounts
                  .filter(count => count.status === 'DISCREPANCY')
                  .map(count => (
                    <div key={count.id} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                      <span className="text-sm font-medium">{count.book_title}</span>
                      <span className={`text-sm font-semibold ${count.discrepancy > 0 ? 'text-success-600' : 'text-danger-600'}`}>
                        {count.discrepancy > 0 ? `+${count.discrepancy}` : count.discrepancy} books
                      </span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};

export default InventoryTracking;