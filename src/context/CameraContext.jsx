import { createContext, useContext } from 'react';
import { useCameraTracker } from '../hooks/useCameraTracker';

const CameraContext = createContext(null);

export const CameraProvider = ({ children }) => {
  const tracker = useCameraTracker();
  return (
    <CameraContext.Provider value={tracker}>
      {children}
    </CameraContext.Provider>
  );
};

export const useCamera = () => useContext(CameraContext);
