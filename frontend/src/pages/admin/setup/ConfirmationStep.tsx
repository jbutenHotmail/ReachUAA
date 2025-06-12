import React from 'react';
import { useTranslation } from 'react-i18next';
import { Check, Calendar, DollarSign, BookText, AlertTriangle, Users, User, UserCog } from 'lucide-react';
import Card from '../../../components/ui/Card';
import Button from '../../../components/ui/Button';
import Badge from '../../../components/ui/Badge';
import { Book, Colporter, Leader } from '../../../types';

interface ProgramFormData {
  name: string;
  motto: string;
  startDate: string;
  endDate: string;
  goal: number;
  workingDays: string[];
  logo?: string;
  colporterPercentage: number;
  leaderPercentage: number;
  colporterCashAdvancePercentage: number;
  leaderCashAdvancePercentage: number;
  books: Book[];
  colporters: Colporter[];
  leaders: Leader[];
}

interface ConfirmationStepProps {
  formData: ProgramFormData;
  onSubmit: () => void;
  onBack: () => void;
  isLoading: boolean;
}

const ConfirmationStep: React.FC<ConfirmationStepProps> = ({ 
  formData, 
  onSubmit, 
  onBack,
  isLoading
}) => {
  const { t } = useTranslation();
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getDayName = (day: string) => {
    const days: Record<string, string> = {
      monday: 'Monday',
      tuesday: 'Tuesday',
      wednesday: 'Wednesday',
      thursday: 'Thursday',
      friday: 'Friday',
      saturday: 'Saturday',
      sunday: 'Sunday'
    };
    return days[day] || day;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <Check className="text-primary-600" size={24} />
          Confirm Program Setup
        </h2>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={onBack}
          >
            Back
          </Button>
          <Button
            variant="primary"
            onClick={onSubmit}
            isLoading={isLoading}
          >
            Create Program
          </Button>
        </div>
      </div>

      <p className="text-gray-600">
        Please review the program details below before creating the program.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Program Information */}
        <Card title="Program Information" icon={<Calendar size={20} />}>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium text-gray-500">Program Name</p>
              <p className="text-lg font-semibold text-gray-900">{formData.name}</p>
            </div>
            
            <div>
              <p className="text-sm font-medium text-gray-500">Motto</p>
              <p className="text-gray-900">{formData.motto}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Start Date</p>
                <p className="text-gray-900">{formatDate(formData.startDate)}</p>
              </div>
              
              <div>
                <p className="text-sm font-medium text-gray-500">End Date</p>
                <p className="text-gray-900">{formatDate(formData.endDate)}</p>
              </div>
            </div>
            
            <div>
              <p className="text-sm font-medium text-gray-500">Financial Goal</p>
              <p className="text-lg font-semibold text-primary-600">${formData.goal.toLocaleString()}</p>
            </div>
            
            <div>
              <p className="text-sm font-medium text-gray-500">Working Days</p>
              <div className="flex flex-wrap gap-2 mt-1">
                {formData.workingDays.map(day => (
                  <Badge key={day} variant="primary" size="sm">
                    {getDayName(day)}
                  </Badge>
                ))}
              </div>
            </div>
          </div>
        </Card>

        {/* Financial Configuration */}
        <Card title="Financial Configuration" icon={<DollarSign size={20} />}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Colporter Percentage</p>
                <p className="text-lg font-semibold text-primary-600">{formData.colporterPercentage}%</p>
              </div>
              
              <div>
                <p className="text-sm font-medium text-gray-500">Leader Percentage</p>
                <p className="text-lg font-semibold text-primary-600">{formData.leaderPercentage}%</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Colporter Cash Advance</p>
                <p className="text-gray-900">{formData.colporterCashAdvancePercentage}%</p>
              </div>
              
              <div>
                <p className="text-sm font-medium text-gray-500">Leader Cash Advance</p>
                <p className="text-gray-900">{formData.leaderCashAdvancePercentage}%</p>
              </div>
            </div>
            
            <div className="p-3 bg-primary-50 rounded-lg">
              <p className="text-sm text-primary-700">
                <strong>Distribution Summary:</strong> For each $100 in sales, colporters will receive ${formData.colporterPercentage} and leaders will receive ${formData.leaderPercentage}.
              </p>
            </div>
          </div>
        </Card>
      </div>

      {/* Books */}
      <Card title="Program Books" icon={<BookText size={20} />}>
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            {formData.books.length} books have been added to the program.
          </p>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Book
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Category
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Price
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Initial Stock
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {formData.books.map((book) => (
                  <tr key={book.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="h-10 w-7 flex-shrink-0 mr-3">
                          <img
                            src={book.imageUrl || 'https://images.pexels.com/photos/159711/books-bookstore-book-reading-159711.jpeg'}
                            alt={book.title}
                            className="h-10 w-7 object-cover rounded shadow-sm"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-gray-900 truncate max-w-xs">
                            {book.title}
                          </div>
                          <div className="text-xs text-gray-500">
                            {book.author || 'Unknown author'}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {book.category}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-right">
                      <div className="text-sm font-semibold text-gray-900">
                        ${book.price.toFixed(2)}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      <Badge variant="success" size="sm">
                        {book.stock}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </Card>

      {/* People */}
      <Card title="Program People" icon={<Users size={20} />}>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Colporters ({formData.colporters.length})</h3>
              {formData.colporters.length > 0 ? (
                <ul className="divide-y divide-gray-200 border border-gray-200 rounded-md overflow-hidden">
                  {formData.colporters.map((colporter) => (
                    <li key={colporter.id} className="px-4 py-3 bg-white hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="h-8 w-8 rounded-full bg-primary-100 flex items-center justify-center text-primary-700 mr-3">
                            <User size={16} />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{colporter.name} {colporter.apellido}</p>
                            <p className="text-xs text-gray-500">{colporter.school}</p>
                          </div>
                        </div>
                        <Badge variant="primary" size="sm">
                          Age: {colporter.age}
                        </Badge>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-center py-4 bg-gray-50 rounded-md">
                  <p className="text-sm text-gray-500">No colporters added</p>
                </div>
              )}
            </div>
            
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">Leaders ({formData.leaders.length})</h3>
              {formData.leaders.length > 0 ? (
                <ul className="divide-y divide-gray-200 border border-gray-200 rounded-md overflow-hidden">
                  {formData.leaders.map((leader) => (
                    <li key={leader.id} className="px-4 py-3 bg-white hover:bg-gray-50">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center">
                          <div className="h-8 w-8 rounded-full bg-success-100 flex items-center justify-center text-success-700 mr-3">
                            <UserCog size={16} />
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">{leader.name} {leader.apellido}</p>
                            <p className="text-xs text-gray-500">{leader.institution}</p>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-center py-4 bg-gray-50 rounded-md">
                  <p className="text-sm text-gray-500">No leaders added</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </Card>

      {/* Important Notes */}
      <Card>
        <div className="flex items-start gap-4">
          <AlertTriangle className="text-warning-500 flex-shrink-0 mt-1" size={24} />
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Important Notes</h3>
            <ul className="text-sm text-gray-600 space-y-2">
              <li>• Once created, the program will be set as active.</li>
              <li>• You can modify most settings after creation in the Program Settings section.</li>
              <li>• Financial percentages can be adjusted, but it may affect existing calculations.</li>
              <li>• Books can be added, removed, or modified after program creation.</li>
              <li>• Additional colporters and leaders can be added later.</li>
              <li>• Make sure all information is correct before proceeding.</li>
            </ul>
          </div>
        </div>
      </Card>

      <div className="flex justify-end gap-3 pt-6">
        <Button
          variant="outline"
          onClick={onBack}
        >
          Back
        </Button>
        <Button
          variant="primary"
          onClick={onSubmit}
          isLoading={isLoading}
        >
          Create Program
        </Button>
      </div>
    </div>
  );
};

export default ConfirmationStep;