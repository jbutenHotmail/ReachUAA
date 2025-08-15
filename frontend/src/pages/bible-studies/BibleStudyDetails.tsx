import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  const { user } = useAuthStore();
  const { bibleStudies, updateBibleStudy, isLoading } = useBibleStudyStore();
  const [editingStudy, setEditingStudy] = useState<BibleStudy | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const study = bibleStudies.find(s => Number(s.id) === Number(id));
  const isViewer = user?.role === UserRole.VIEWER;
  const canEdit = isViewer || user?.role === UserRole.ADMIN;

  const handleEditStudy = async (data: any) => {
    if (!editingStudy) return;
    try {
      await updateBibleStudy(editingStudy.id, data);
      setEditingStudy(null);
      setSuccess('Estudio bíblico actualizado exitosamente');
      setTimeout(() => setSuccess(null), 5000);
    } catch (error) {
      console.error('Error updating bible study:', error);
    }
  };

  const getTypeBadge = (type: string) => {
    const variants = {
      'Estudio Bíblico': 'primary',
      'Grupo de Oración': 'success',
      'Matrimonio y Familia': 'warning'
    } as const;
    
    return <Badge variant={variants[type as keyof typeof variants] || 'secondary'}>{type}</Badge>;
  };

  if (isLoading) {
    return <LoadingScreen message="Cargando detalles del estudio..." />;
  }

  if (!study) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Estudio bíblico no encontrado</p>
        <Button
          variant="outline"
          className="mt-4"
          onClick={() => navigate('/bible-studies')}
        >
          Volver
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
            onClick={() => navigate('/bible-studies')}
          >
            <ChevronLeft size={20} />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <BookOpen className="text-primary-600" size={28} />
              Detalles del Estudio Bíblico
            </h1>
            <p className="text-sm text-gray-500 mt-1">
              Información completa del estudio registrado
            </p>
          </div>
        </div>
        
        {canEdit && (
          <Button
            variant="primary"
            leftIcon={<Edit size={16} />}
            onClick={() => setEditingStudy(study)}
          >
            Editar
          </Button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <Card title="Información de la Persona" icon={<Users size={20} />}>
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
                  <p className="text-sm font-medium text-gray-500">Teléfono</p>
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
                  <p className="text-sm font-medium text-gray-500">Municipio</p>
                  <div className="flex items-center gap-2 mt-1">
                    <MapPin size={16} className="text-gray-400" />
                    <p className="text-gray-900">{study.municipalityName || 'No especificado'}</p>
                  </div>
                </div>
              </div>
              
              {study.address && (
                <div>
                  <p className="text-sm font-medium text-gray-500">Dirección</p>
                  <div className="flex items-start gap-2 mt-1">
                    <MapPin size={16} className="text-gray-400 mt-0.5" />
                    <p className="text-gray-900">{study.address}</p>
                  </div>
                </div>
              )}
              
              {study.location && (
                <div>
                  <p className="text-sm font-medium text-gray-500">Lugar de Trabajo</p>
                  <div className="flex items-center gap-2 mt-1">
                    <MapPin size={16} className="text-gray-400" />
                    <p className="text-gray-900">{study.location}</p>
                  </div>
                </div>
              )}
            </div>
          </Card>

          <Card title="Información del Estudio" icon={<BookOpen size={20} />}>
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium text-gray-500">Tipo de Estudio</p>
                <div className="mt-1">
                  {getTypeBadge(study.studyType)}
                </div>
              </div>
              
              {study.interestTopic && (
                <div>
                  <p className="text-sm font-medium text-gray-500">Tema de Interés</p>
                  <p className="text-gray-900 mt-1">{study.interestTopic}</p>
                </div>
              )}
              
              {study.notes && (
                <div>
                  <p className="text-sm font-medium text-gray-500">Notas</p>
                  <div className="mt-1 p-3 bg-gray-50 rounded-lg">
                    <p className="text-gray-900 whitespace-pre-wrap">{study.notes}</p>
                  </div>
                </div>
              )}
            </div>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card title="Información del Registro" icon={<FileText size={20} />}>
            <div className="space-y-4">
              {!isViewer && (
                <div>
                  <p className="text-sm font-medium text-gray-500">Registrado por</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Users size={16} className="text-gray-400" />
                    <p className="text-gray-900">{study.colporterName}</p>
                  </div>
                </div>
              )}
              
              <div>
                <p className="text-sm font-medium text-gray-500">Fecha de Registro</p>
                <div className="flex items-center gap-2 mt-1">
                  <Calendar size={16} className="text-gray-400" />
                  <p className="text-gray-900">
                    {new Date(study.createdAt).toLocaleDateString('es-ES', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </div>
              
              <div>
                <p className="text-sm font-medium text-gray-500">Última Actualización</p>
                <div className="flex items-center gap-2 mt-1">
                  <Calendar size={16} className="text-gray-400" />
                  <p className="text-gray-900">
                    {new Date(study.updatedAt).toLocaleDateString('es-ES', {
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </p>
                </div>
              </div>
            </div>
          </Card>

          {/* Quick Actions */}
          <Card title="Acciones Rápidas" className="mt-6">
            <div className="space-y-3">
              <Button
                variant="outline"
                fullWidth
                leftIcon={<Phone size={16} />}
                onClick={() => window.open(`tel:${study.phone}`)}
              >
                Llamar
              </Button>
              
              <Button
                variant="outline"
                fullWidth
                leftIcon={<MessageCircle size={16} />}
                onClick={() => window.open(`sms:${study.phone}`)}
              >
                Enviar SMS
              </Button>
              
              {study.address && (
                <Button
                  variant="outline"
                  fullWidth
                  leftIcon={<MapPin size={16} />}
                  onClick={() => window.open(`https://maps.google.com/?q=${encodeURIComponent(study.address || '')}`)}
                >
                  Ver en Mapa
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