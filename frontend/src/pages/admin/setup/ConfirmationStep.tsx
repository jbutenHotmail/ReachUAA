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
    return new Date(dateString).toLocaleDateString('es-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getDayName = (day: string) => {
    const days: Record<string, string> = {
      monday: t('programSettings.days.monday'),
      tuesday: t('programSettings.days.tuesday'),
      wednesday: t('programSettings.days.wednesday'),
      thursday: t('programSettings.days.thursday'),
      friday: t('programSettings.days.friday'),
      saturday: t('programSettings.days.saturday'),
      sunday: t('programSettings.days.sunday')
    };
    return days[day] || day;
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-semibold text-gray-900 flex items-center gap-2">
          <Check className="text-primary-600" size={24} />
          {t('confirmationStep.title')}
        </h2>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={onBack}
          >
            {t('common.back')}
          </Button>
          <Button
            variant="primary"
            onClick={onSubmit}
            isLoading={isLoading}
          >
            {t('confirmationStep.createProgram')}
          </Button>
        </div>
      </div>

      <p className="text-gray-600">
        {t('confirmationStep.description')}
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card title={t('confirmationStep.programInformation')} icon={<Calendar size={20} />}>
          <div className="space-y-4">
            {/* Logo Section */}
            <div>
              <p className="text-sm font-medium text-gray-500">{t('confirmationStep.programLogo')}</p>
              <div className="mt-2">
                {formData.logo ? (
                  <img
                    src={formData.logo}
                    alt={t('confirmationStep.programLogo')}
                    className="h-24 w-24 object-contain rounded-md shadow-sm"
                    onError={(e) => {
                      e.currentTarget.src = 'https://via.placeholder.com/96?text=Logo';
                    }}
                  />
                ) : (
                  <div className="h-24 w-24 flex items-center justify-center bg-gray-100 rounded-md">
                    <span className="text-sm text-gray-500">{t('confirmationStep.noLogo')}</span>
                  </div>
                )}
              </div>
            </div>

            <div>
              <p className="text-sm font-medium text-gray-500">{t('confirmationStep.programName')}</p>
              <p className="text-lg font-semibold text-gray-900">{formData.name}</p>
            </div>
            
            <div>
              <p className="text-sm font-medium text-gray-500">{t('confirmationStep.motto')}</p>
              <p className="text-gray-900">{formData.motto}</p>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">{t('confirmationStep.startDate')}</p>
                <p className="text-gray-900">{formatDate(formData.startDate)}</p>
              </div>
              
              <div>
                <p className="text-sm font-medium text-gray-500">{t('confirmationStep.endDate')}</p>
                <p className="text-gray-900">{formatDate(formData.endDate)}</p>
              </div>
            </div>
            
            <div>
              <p className="text-sm font-medium text-gray-500">{t('confirmationStep.financialGoal')}</p>
              <p className="text-lg font-semibold text-primary-600">${formData.goal.toLocaleString()}</p>
            </div>
            
            <div>
              <p className="text-sm font-medium text-gray-500">{t('confirmationStep.workingDays')}</p>
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

        <Card title={t('confirmationStep.financialConfiguration')} icon={<DollarSign size={20} />}>
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">{t('confirmationStep.colporterPercentage')}</p>
                <p className="text-lg font-semibold text-primary-600">{formData.colporterPercentage}%</p>
              </div>
              
              <div>
                <p className="text-sm font-medium text-gray-500">{t('confirmationStep.leaderPercentage')}</p>
                <p className="text-lg font-semibold text-primary-600">{formData.leaderPercentage}%</p>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm font-medium text-gray-500">{t('confirmationStep.colporterCashAdvance')}</p>
                <p className="text-gray-900">{formData.colporterCashAdvancePercentage}%</p>
              </div>
              
              <div>
                <p className="text-sm font-medium text-gray-500">{t('confirmationStep.leaderCashAdvance')}</p>
                <p className="text-gray-900">{formData.leaderCashAdvancePercentage}%</p>
              </div>
            </div>
            
            <div className="p-3 bg-primary-50 rounded-lg">
              <p className="text-sm text-primary-700">
                <strong>{t('confirmationStep.distributionSummary', {
                  colporterPercentage: formData.colporterPercentage,
                  leaderPercentage: formData.leaderPercentage
                })}</strong>
              </p>
            </div>
          </div>
        </Card>
      </div>

      <Card title={t('confirmationStep.programBooks')} icon={<BookText size={20} />}>
        <div className="space-y-4">
          <p className="text-sm text-gray-600">
            {t('confirmationStep.booksAdded', { count: formData.books.length })}
          </p>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('confirmationStep.book')}
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('confirmationStep.category')}
                  </th>
                  <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('confirmationStep.price')}
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    {t('confirmationStep.initialStock')}
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
                            src={book.image_url || 'https://images.pexels.com/photos/159711/books-bookstore-book-reading-159711.jpeg'}
                            alt={book.title}
                            className="h-10 w-7 object-cover rounded shadow-sm"
                          />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="text-sm font-medium text-gray-900 truncate max-w-xs">
                            {book.title}
                          </div>
                          <div className="text-xs text-gray-500">
                            {book.author || t('confirmationStep.unknownAuthor')}
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

      <Card title={t('confirmationStep.programPeople')} icon={<Users size={20} />}>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <h3 className="text-sm font-medium text-gray-700 mb-2">{t('confirmationStep.colporters', { count: formData.colporters.length })}</h3>
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
                          {t('confirmationStep.age')}: {colporter.age}
                        </Badge>
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-center py-4 bg-gray-50 rounded-md">
                  <p className="text-sm text-gray-500">{t('confirmationStep.noColporters')}</p>
                </div>
              )}
            </div>
            
            <div>
  <h3 className="text-sm font-medium text-gray-700 mb-2">{t('confirmationStep.leaders', { count: formData.leaders.length })}</h3>
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
      <p className="text-sm text-gray-500">{t('confirmationStep.noLeaders')}</p>
    </div>
  )}
</div>
          </div>
        </div>
      </Card>

      <Card>
        <div className="flex items-start gap-4">
          <AlertTriangle className="text-warning-500 flex-shrink-0 mt-1" size={24} />
          <div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('confirmationStep.importantNotes')}</h3>
            <ul className="text-sm text-gray-600 space-y-2">
              <li>{t('confirmationStep.noteProgramActive')}</li>
              <li>{t('confirmationStep.noteSettingsModifiable')}</li>
              <li>{t('confirmationStep.noteFinancialImpact')}</li>
              <li>{t('confirmationStep.noteBooksModifiable')}</li>
              <li>{t('confirmationStep.notePeopleAddLater')}</li>
              <li>{t('confirmationStep.noteVerifyInformation')}</li>
            </ul>
          </div>
        </div>
      </Card>

      <div className="flex justify-end gap-3 pt-6">
        <Button
          variant="outline"
          onClick={onBack}
        >
          {t('common.back')}
        </Button>
        <Button
          variant="primary"
          onClick={onSubmit}
          isLoading={isLoading}
        >
          {t('confirmationStep.createProgram')}
        </Button>
      </div>
    </div>
  );
};

export default ConfirmationStep;