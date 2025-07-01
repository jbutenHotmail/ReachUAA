import { useEffect } from 'react';
import { useAuthStore } from '../../stores/authStore';
import { useNavigate } from 'react-router-dom';

/**
 * Componente que escucha los eventos de almacenamiento para detectar
 * cuando se borra el auth-storage y desloguear automáticamente al usuario
 */
const StorageEventListener: React.FC = () => {
  const { checkStorageAndLogout } = useAuthStore();
  const navigate = useNavigate();

  useEffect(() => {
    // Función para manejar cambios en el localStorage
    const handleStorageChange = (event: StorageEvent) => {
      // Si el evento es null, significa que localStorage fue limpiado
      if (event.key === null || event.key === 'auth-storage') {
        const wasLoggedOut = checkStorageAndLogout();
        if (wasLoggedOut) {
          navigate('/login');
        }
      }
    };

    // Agregar el event listener
    window.addEventListener('storage', handleStorageChange);

    // Limpiar el event listener cuando el componente se desmonte
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [checkStorageAndLogout, navigate]);

  // Este componente no renderiza nada visible
  return null;
};

export default StorageEventListener;