import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Interfaz para el estado del control de versiones
interface VersionState {
  version: string;
  lastChecked: number;
  forceRefresh: boolean;
  manualCheckEnabled: boolean; // Nueva propiedad para control manual
}

// Interfaz para el store de control de versiones
interface VersionStore extends VersionState {
  checkVersion: () => Promise<boolean>;
  setForceRefresh: (value: boolean) => void;
  setManualCheckEnabled: (value: boolean) => void; // Nuevo método para control manual
  triggerManualCheck: () => void; // Nuevo método para forzar comprobación manual
}

// Generar una versión basada en la fecha y hora actual
const generateVersion = (): string => {
  return new Date().toISOString();
};

// Crear el store de control de versiones
export const useVersionStore = create<VersionStore>()(
  persist(
    (set, get) => ({
      version: generateVersion(),
      lastChecked: Date.now(),
      forceRefresh: false,
      manualCheckEnabled: true, // Por defecto, el control manual está activado

      // Comprobar si hay una nueva versión disponible
      checkVersion: async () => {
        // Si el control manual está desactivado, no hacer nada
        if (get().manualCheckEnabled) {
          return false;
        }
        
        // En producción, esto podría ser una llamada a un endpoint que devuelve la versión actual
        const now = Date.now();
        const lastChecked = get().lastChecked;
        
        // Comprobar cada 5 minutos (300000 ms)
        if (now - lastChecked > 300000) {
          try {
            // En un entorno real, aquí haríamos una petición al servidor
            // para obtener la versión actual de la aplicación
            const newVersion = generateVersion();
            const currentVersion = get().version;
            
            // Si la versión ha cambiado, actualizar el estado
            if (newVersion !== currentVersion) {
              set({ 
                version: newVersion, 
                lastChecked: now,
                forceRefresh: true 
              });
              return true;
            }
            
            // Actualizar la hora de la última comprobación
            set({ lastChecked: now });
          } catch (error) {
            console.error('Error checking version:', error);
          }
        }
        
        return get().forceRefresh;
      },
      
      // Establecer si se debe forzar la actualización
      setForceRefresh: (value: boolean) => {
        set({ forceRefresh: value });
      },
      
      // Establecer si el control manual está activado
      setManualCheckEnabled: (value: boolean) => {
        set({ manualCheckEnabled: value });
      },
      
      // Forzar una comprobación manual
      triggerManualCheck: () => {
        set({ 
          version: generateVersion(),
          lastChecked: Date.now(),
          forceRefresh: true
        });
      }
    }),
    {
      name: 'app-version-storage',
      partialize: (state) => ({ 
        version: state.version,
        manualCheckEnabled: state.manualCheckEnabled
      }),
    }
  )
);

// Función para comprobar si hay una nueva versión disponible y recargar la página si es necesario
export const checkForUpdates = async (): Promise<void> => {
  const versionStore = useVersionStore.getState();
  const needsRefresh = await versionStore.checkVersion();
  
  if (needsRefresh) {
    // Mostrar un mensaje al usuario antes de recargar
    if (window.confirm('Hay una nueva versión disponible. ¿Desea actualizar ahora?')) {
      // Limpiar la caché antes de recargar
      if ('caches' in window) {
        try {
          const cacheNames = await window.caches.keys();
          await Promise.all(
            cacheNames.map(cacheName => window.caches.delete(cacheName))
          );
        } catch (err) {
          console.error('Error clearing cache:', err);
        }
      }
      
      // Recargar la página para obtener la nueva versión
      window.location.reload(true);
    } else {
      // Si el usuario no quiere actualizar ahora, restablecer el estado
      versionStore.setForceRefresh(false);
    }
  }
};

// Función para forzar una actualización manualmente
export const forceUpdate = (): void => {
  const versionStore = useVersionStore.getState();
  versionStore.triggerManualCheck();
  checkForUpdates();
};
