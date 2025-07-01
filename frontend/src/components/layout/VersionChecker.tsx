import React, { useEffect } from 'react';
import { checkForUpdates } from '../../utils/versionControl';

const VersionChecker: React.FC = () => {
  useEffect(() => {
    // Comprobar actualizaciones al cargar el componente
    checkForUpdates();
    
    // Configurar un intervalo para comprobar actualizaciones periódicamente
    const intervalId = setInterval(() => {
      checkForUpdates();
    }, 5 * 60 * 1000); // Comprobar cada 5 minutos
    
    // Comprobar también cuando la ventana recupera el foco
    const handleFocus = () => {
      checkForUpdates();
    };
    
    window.addEventListener('focus', handleFocus);
    
    // Limpiar el intervalo y el event listener cuando el componente se desmonte
    return () => {
      clearInterval(intervalId);
      window.removeEventListener('focus', handleFocus);
    };
  }, []);
  
  // Este componente no renderiza nada visible
  return null;
};

export default VersionChecker;