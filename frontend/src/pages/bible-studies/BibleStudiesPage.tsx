import React, { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useNavigate } from 'react-router-dom';
import { 
  BookOpen, 
  Plus, 
  Search, 
  Phone, 
  MapPin, 
  Calendar,
  Eye,
  Edit,
  Trash2,
  Users,
  MessageCircle,
  User
} from 'lucide-react';
import { useBibleStudyStore } from '../../stores/bibleStudyStore';
import { useAuthStore } from '../../stores/authStore';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Badge from '../../components/ui/Badge';
import AddBibleStudyForm from './AddBibleStudyForm';
import { UserRole, BibleStudy } from '../../types';
import LoadingScreen from '../../components/ui/LoadingScreen';

const BibleStudiesPage: React.FC = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const { 
    bibleStudies, 
    municipalities,
    isLoading, 
    fetchBibleStudies, 
    fetchMunicipalities,
    createBibleStudy, 
    updateBibleStudy, 
    deleteBibleStudy,
    wereBibleStudiesFetched,
    wereMunicipalitiesFetched
  } = useBibleStudyStore();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingStudy, setEditingStudy] = useState<BibleStudy | null>(null);
  const [typeFilter, setTypeFilter] = useState<string>('');
  const [municipalityFilter, setMunicipalityFilter] = useState<string>('');
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const isViewer = user?.role === UserRole.VIEWER;

  useEffect(() => {
    if (!wereBibleStudiesFetched) {
      fetchBibleStudies();
    }
    if (!wereMunicipalitiesFetched) {
      fetchMunicipalities(1); // Puerto Rico
    }
  }, [fetchBibleStudies, fetchMunicipalities, wereBibleStudiesFetched, wereMunicipalitiesFetched]);

  const filteredStudies = bibleStudies.filter(study => {
    const matchesSearch = searchTerm
      ? study.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        study.phone.includes(searchTerm) ||
        (study.location && study.location.toLowerCase().includes(searchTerm.toLowerCase())) ||
        (study.municipalityName && study.municipalityName.toLowerCase().includes(searchTerm.toLowerCase()))
      : true;
    
    const matchesType = typeFilter ? study.studyType === typeFilter : true;
    const matchesMunicipality = municipalityFilter ? study.municipalityId?.toString() === municipalityFilter : true;
    
    return matchesSearch && matchesType && matchesMunicipality;
  });

  const handleAddStudy = async (data: any) => {
    try {
      await createBibleStudy(data);
      setShowAddForm(false);
      setSuccess('Estudio bíblico creado exitosamente');
      setTimeout(() => setSuccess(null), 5000);
    } catch (error) {
      setError('Error al crear el estudio bíblico');
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleEditStudy = async (data: any) => {
    if (!editingStudy) return;
    try {
      await updateBibleStudy(editingStudy.id, data);
      setEditingStudy(null);
      setSuccess('Estudio bíblico actualizado exitosamente');
      setTimeout(() => setSuccess(null), 5000);
    } catch (error) {
      setError('Error al actualizar el estudio bíblico');
      setTimeout(() => setError(null), 5000);
    }
  };

  const handleDeleteStudy = async (id: string) => {
    if (!window.confirm('¿Estás seguro de que quieres eliminar este estudio bíblico?')) {
      return;
    }
    
    try {
      await deleteBibleStudy(id);
      setSuccess('Estudio bíblico eliminado exitosamente');
      setTimeout(() => setSuccess(null), 5000);
    } catch (error) {
      setError('Error al eliminar el estudio bíblico');
      setTimeout(() => setError(null), 5000);
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

  // Calculate totals by type
  const totals = filteredStudies.reduce((acc, study) => {
    acc.total++;
    if (study.studyType === 'Estudio Bíblico') acc.biblico++;
    if (study.studyType === 'Grupo de Oración') acc.oracion++;
    if (study.studyType === 'Matrimonio y Familia') acc.familia++;
    return acc;
  }, { total: 0, biblico: 0, oracion: 0, familia: 0 });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <LoadingScreen message="Cargando estudios bíblicos..." />
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

      {error && (
        <div className="p-4 bg-danger-50 border border-danger-200 rounded-lg text-danger-700">
          <p className="font-medium">{error}</p>
        </div>
      )}
      
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <BookOpen className="text-primary-600" size={28} />
            Estudios Bíblicos
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            {isViewer 
              ? 'Registra personas interesadas en estudios bíblicos'
              : 'Gestiona todos los estudios bíblicos registrados por los colportores'
            }
          </p>
        </div>
        
        {isViewer && (
          <Button
            variant="primary"
            leftIcon={<Plus size={18} />}
            onClick={() => setShowAddForm(true)}
          >
            Nuevo Estudio
          </Button>
        )}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <BookOpen className="text-primary-600" size={24} />
            </div>
            <p className="text-sm font-medium text-gray-500">Total</p>
            <p className="mt-1 text-2xl font-bold text-primary-600">{totals.total}</p>
          </div>
        </Card>
        
        <Card>
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <BookOpen className="text-blue-500" size={24} />
            </div>
            <p className="text-sm font-medium text-gray-500">Estudio Bíblico</p>
            <p className="mt-1 text-2xl font-bold text-blue-600">{totals.biblico}</p>
          </div>
        </Card>
        
        <Card>
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <MessageCircle className="text-success-500" size={24} />
            </div>
            <p className="text-sm font-medium text-gray-500">Grupo de Oración</p>
            <p className="mt-1 text-2xl font-bold text-success-600">{totals.oracion}</p>
          </div>
        </Card>
        
        <Card>
          <div className="text-center">
            <div className="flex items-center justify-center mb-2">
              <Users className="text-warning-500" size={24} />
            </div>
            <p className="text-sm font-medium text-gray-500">Matrimonio y Familia</p>
            <p className="mt-1 text-2xl font-bold text-warning-600">{totals.familia}</p>
          </div>
        </Card>
      </div>

      <Card>
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row justify-between gap-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <Input
                placeholder="Buscar por nombre, teléfono, lugar o municipio..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                leftIcon={<Search size={18} />}
                className="w-full sm:w-64"
              />
              
              <select
                value={typeFilter}
                onChange={(e) => setTypeFilter(e.target.value)}
                className="block w-full sm:w-48 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              >
                <option value="">Todos los Tipos</option>
                <option value="Estudio Bíblico">Estudio Bíblico</option>
                <option value="Grupo de Oración">Grupo de Oración</option>
                <option value="Matrimonio y Familia">Matrimonio y Familia</option>
              </select>

              <select
                value={municipalityFilter}
                onChange={(e) => setMunicipalityFilter(e.target.value)}
                className="block w-full sm:w-48 rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring-primary-500 sm:text-sm"
              >
                <option value="">Todos los Municipios</option>
                {municipalities.map(municipality => (
                  <option key={municipality.id} value={municipality.id}>
                    {municipality.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Mobile View */}
          <div className="block lg:hidden space-y-4">
            {filteredStudies.map((study) => (
              <div key={study.id} className="p-4 border border-gray-200 rounded-lg bg-white">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-start gap-3">
                    {study.photoUrl && (
                      <img 
                        src={study.photoUrl} 
                        alt={study.name}
                        className="w-12 h-12 rounded-full object-cover"
                      />
                    )}
                    <div>
                      <h3 className="font-medium text-gray-900">{study.name}</h3>
                      <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                        <Phone size={14} />
                        <span>{study.phone}</span>
                      </div>
                      {study.municipalityName && (
                        <div className="flex items-center gap-1 text-sm text-gray-500 mt-1">
                          <MapPin size={14} />
                          <span>{study.municipalityName}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    {getTypeBadge(study.studyType)}
                  </div>
                </div>

                {!isViewer && (
                  <div className="flex items-center gap-1 text-sm text-gray-500 mb-2">
                    <Users size={14} />
                    <span>Por: {study.colporterName}</span>
                  </div>
                )}

                <div className="flex items-center gap-1 text-sm text-gray-500 mb-3">
                  <Calendar size={14} />
                  <span>{new Date(study.createdAt).toLocaleDateString()}</span>
                </div>

                <div className="flex justify-end gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => navigate(`/bible-studies/${study.id}`)}
                  >
                    <Eye size={14} />
                  </Button>
                  {(isViewer || user?.role === UserRole.ADMIN) && (
                    <>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setEditingStudy(study);
                          setShowAddForm(true);
                        }}
                      >
                        <Edit size={14} />
                      </Button>
                      <Button
                        variant="danger"
                        size="sm"
                        onClick={() => handleDeleteStudy(study.id)}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Desktop Table */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Persona
                  </th>
                  {!isViewer && (
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Colportor
                    </th>
                  )}
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contacto
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Municipio
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Tipo
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredStudies.map((study) => (
                  <tr key={study.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-3">
                        {study.photoUrl ? (
                          <img 
                            src={study.photoUrl} 
                            alt={study.name}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center">
                            <User size={20} className="text-gray-400" />
                          </div>
                        )}
                        <div>
                          <div className="font-medium text-gray-900">{study.name}</div>
                          {study.physicalDescription && (
                            <div className="text-sm text-gray-500 truncate max-w-xs">
                              {study.physicalDescription}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    {!isViewer && (
                      <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                        {study.colporterName}
                      </td>
                    )}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <div className="flex items-center gap-1 text-sm text-gray-900">
                        <Phone size={14} className="text-gray-400" />
                        {study.phone}
                      </div>
                      {study.location && (
                        <div className="text-sm text-gray-500 truncate max-w-xs">
                          {study.location}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <MapPin size={14} className="text-gray-400" />
                        {study.municipalityName || 'No especificado'}
                      </div>
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      {getTypeBadge(study.studyType)}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {new Date(study.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3 whitespace-nowrap text-center">
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => navigate(`/bible-studies/${study.id}`)}
                        >
                          <Eye size={14} />
                        </Button>
                        {(isViewer || user?.role === UserRole.ADMIN) && (
                          <>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingStudy(study);
                                setShowAddForm(true);
                              }}
                            >
                              <Edit size={14} />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteStudy(study.id)}
                            >
                              <Trash2 size={14} className="text-danger-600" />
                            </Button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {filteredStudies.length === 0 && (
            <div className="text-center py-8">
              <BookOpen size={48} className="mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                {searchTerm ? 'No se encontraron estudios' : 'No hay estudios bíblicos registrados'}
              </h3>
              <p className="text-sm text-gray-500 mb-4">
                {searchTerm 
                  ? 'Intenta ajustar los términos de búsqueda' 
                  : isViewer 
                    ? 'Comienza registrando tu primer estudio bíblico'
                    : 'Los colportores pueden registrar estudios bíblicos desde su dashboard'
                }
              </p>
              {isViewer && (
                <Button
                  variant="primary"
                  leftIcon={<Plus size={18} />}
                  onClick={() => setShowAddForm(true)}
                >
                  Registrar Estudio
                </Button>
              )}
            </div>
          )}
        </div>
      </Card>

      {(showAddForm || editingStudy) && (
        <AddBibleStudyForm
          onClose={() => {
            setShowAddForm(false);
            setEditingStudy(null);
          }}
          onSubmit={editingStudy ? handleEditStudy : handleAddStudy}
          initialData={editingStudy || undefined}
        />
      )}
    </div>
  );
};

export default BibleStudiesPage;