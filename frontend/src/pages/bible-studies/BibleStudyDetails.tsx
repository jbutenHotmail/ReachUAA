import React, { useState } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { 
  ChevronLeft, 
  BookOpen, 
  Phone, 
  MapPin, 
  Calendar,
  MessageCircle,
  Edit,
  Users,
  FileText,
  User
} from 'lucide-react';
import { useBibleStudyStore } from '../../stores/bibleStudyStore';
import { useAuthStore } from '../../stores/authStore';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import AddBibleStudyForm from './AddBibleStudyForm';
import { UserRole, BibleStudy } from '../../types';
import LoadingScreen from '../../components/ui/LoadingScreen';

const BibleStudyDetails: React.FC = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuthStore();
  const { bibleStudies, updateBibleStudy, isLoading } = useBibleStudyStore();
  const [editingStudy, setEditingStudy] = useState<BibleStudy | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const study = bibleStudies.find(s => Number(s.id) === Number(id));
  const isViewer = user?.role === UserRole.VIEWER;
  const canEdit = isViewer || user?.role === UserRole.ADMIN;

  // Determine where to go back based on where we came from
  const getBackPath = () => {
    if (location.state?.from?.includes('/daily-report/')) {
      return location.state.from;
    }
    return '/bible-studies';
  };

  const handleEditStudy = async (data: any) => {
    if (!editingStudy) return;
    try {
      await updateBibleStudy(editingStudy.id, data);
      setEditingStudy(null);
      setSuccess(t('bibleStudyDetails.successUpdated'));
      setTimeout(() => setSuccess(null), 5000);
    } catch (error) {
      console.error('Error updating bible study:', error);
    }
  };

  const getTypeBadge = (type: string) => {
    const variants = {
      [t('bibleStudyDetails.studyTypeBibleStudy')]: 'primary',
      [t('bibleStudyDetails.studyTypePrayerGroup')]: 'success',
      [t('bibleStudyDetails.studyTypeMarriageFamily')]: 'warning'
    } as const;
    
    return <Badge variant={variants[type as keyof typeof variants] || 'secondary'}>{type}</Badge>;
  };

  if (isLoading) {
    return <LoadingScreen message={t('bibleStudyDetails.loadingMessage')} />;
  }

  if (!study) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">{t('bibleStudyDetails.notFound')}</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => navigate('/bible-studies')}
        >
          {t('common.back')}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {success && (
        <div className="p-4 bg-success-50 border border-success-200 rounded-lg text-success-700">
          <p className="font-medium">{success}</p>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => navigate(getBackPath())}
          >
            <ChevronLeft size={20} />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <BookOpen className="text-primary-600" size={28} />
              {t('bibleStudyDetails.title')}
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              {t('bibleStudyDetails.description')}
            </p>
          </div>
        </div>
        
        {canEdit && (
          <Button
            variant="primary"
            leftIcon={<Edit size={16} />}
            onClick={() => setEditingStudy(study)}
          >
            {t('common.edit')}
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card title={t('bibleStudyDetails.personInfo')} icon={<Users size={20} />}>
            <div className="space-y-4">
              <div className="flex items-start gap-4">
                {study.photoUrl ? (
                  <img 
                    src={study.photoUrl} 
                    alt={study.name}
                    className="w-20 h-20 rounded-full object-cover border-2 border-gray-200"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-full bg-gray-200 flex items-center justify-center border-2 border-gray-200">
                    <User size={32} className="text-gray-400" />
                  </div>
                )}
                <div className="flex-1">
                  <h3 className="text-xl font-semibold text-gray-900">{study.name}</h3>
                  {study.physicalDescription && (
                    <p className="text-sm text-gray-600 mt-1">{study.physicalDescription}</p>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">{t('bibleStudyDetails.phoneLabel')}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Phone size={16} className="text-gray-400" />
                    <a 
                      href={`tel:${study.phone}`}
                      className="text-primary-600 hover:text-primary-700 font-medium"
                    >
                      {study.phone}
                    </a>
                  </div>
                </div>
                
                <div>
                  <p className="text-sm font-medium text-gray-500">{t('bibleStudyDetails.municipalityLabel')}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <MapPin size={16} className="text-gray-400" />
                    <p className="text-gray-900">{study.municipalityName || t('bibleStudyDetails.municipalityNotSpecified')}</p>
                  </div>
                </div>
              </div>
              
              {study.address && (
                <div>
                  <p className="text-sm font-medium text-gray-500">{t('bibleStudyDetails.addressLabel')}</p>
                  <div className="flex items-start gap-2 mt-1">
                    <MapPin size={16} className="text-gray-400 mt-0.5" />
                    <p className="text-gray-900">{study.address}</p>
                  </div>
                </div>
              )}
              
              {study.location && (
                <div>
                  <p className="text-sm font-medium text-gray-500">{t('bibleStudyDetails.workplaceLabel')}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <MapPin size={16} className="text-gray-400" />
                    <p className="text-gray-900">{study.location}</p>
                  </div>
                </div>
              )}
            </div>
          </Card>

          <Card title={t('bibleStudyDetails.studyInfo')} icon={<BookOpen size={20} />}>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-500">{t('bibleStudyDetails.studyTypeLabel')}</p>
                <div className="mt-1">
                  {getTypeBadge(study.studyType)}
                </div>
              </div>
              
              {study.interestTopic && (
                <div>
                  <p className="text-sm font-medium text-gray-500">{t('bibleStudyDetails.interestTopicLabel')}</p>
                  <p className="text-gray-900 mt-1">{study.interestTopic}</p>
                </div>
              )}
              
              {study.notes && (
                <div>
                  <p className="text-sm font-medium text-gray-500">{t('bibleStudyDetails.notesLabel')}</p>
                  <div className="mt-1 p-3 bg-gray-50 rounded-lg">
                    <p className="text-gray-900 whitespace-pre-wrap">{study.notes}</p>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card title={t('bibleStudyDetails.registrationInfo')} icon={<FileText size={20} />}>
            <div className="space-y-4">
              {!isViewer && (
                <div>
                  <p className="text-sm font-medium text-gray-500">{t('bibleStudyDetails.registeredBy')}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Users size={16} className="text-gray-400" />
                    <p className="text-gray-900">{study.colporterName}</p>
                  </div>
                </div>
              )}
              
              <div>
                <p className="text-sm font-medium text-gray-500">{t('bibleStudyDetails.registrationDate')}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Calendar size={16} className="text-gray-400" />
                  <p className="text-gray-900">
                    {new Date(study.createdAt).toLocaleDateString('en-US', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </div>
              
              <div>
                <p className="text-sm font-medium text-gray-500">{t('bibleStudyDetails.lastUpdated')}</p>
                <div className="flex items-center gap-2 mt-1">
                  <Calendar size={16} className="text-gray-400" />
                  <p className="text-gray-900">
                    {new Date(study.updatedAt).toLocaleDateString('en-US', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </div>
            </div>
          </Card>

          <Card title={t('bibleStudyDetails.quickActions')} className="mt-6">
            <div className="space-y-3">
              <Button
                variant="outline"
                fullWidth
                leftIcon={<Phone size={16} />}
                onClick={() => window.open(`tel:${study.phone}`)}
              >
                {t('bibleStudyDetails.call')}
              </Button>
              
              <Button
                variant="outline"
                fullWidth
                leftIcon={<MessageCircle size={16} />}
                onClick={() => window.open(`sms:${study.phone}`)}
              >
                {t('bibleStudyDetails.sendSMS')}
              </Button>
              
              {study.address && (
                <Button
                  variant="outline"
                  fullWidth
                  leftIcon={<MapPin size={16} />}
                  onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(study.address || '')}`)}
                >
                  {t('bibleStudyDetails.viewOnMap')}
                </Button>
              )}
            </div>
          </Card>
        </div>
      </div>

      {editingStudy && (
        <AddBibleStudyForm
          onClose={() => setEditingStudy(null)}
          onSubmit={handleEditStudy}
          initialData={editingStudy}
        />
      )}
    </div>
  );
};

export default BibleStudyDetails;