import { useEffect, useRef, useState } from 'react';
import { Camera, CameraOff, Loader, AlertTriangle, GripHorizontal, Minimize2, Maximize2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useTheme } from '../context/ThemeContext';

export default function CameraTracker({ tracker }) {
  const { isDark } = useTheme();
  const { videoRef, isActive, modelsLoaded, cameraError, cameraEnabled, startCamera, stopCamera } = tracker;

  const [minimized, setMinimized] = useState(false);
  const [pos, setPos] = useState({ x: window.innerWidth - 320, y: 80 });
  const dragging = useRef(false);
  const offset   = useRef({ x: 0, y: 0 });
  const widgetRef = useRef(null);

  // Toast on status change
  useEffect(() => {
    if (!cameraEnabled) return;
    if (!isActive) {
      toast.error('⚠️ You are not visible! Please return to study.', { duration: 5000, id: 'inactive-toast' });
    } else {
      toast.dismiss('inactive-toast');
    }
  }, [isActive, cameraEnabled]);

  // Drag handlers
  const onMouseDown = (e) => {
    dragging.current = true;
    offset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y };
    e.preventDefault();
  };

  useEffect(() => {
    const onMouseMove = (e) => {
      if (!dragging.current) return;
      const w = widgetRef.current?.offsetWidth  || 300;
      const h = widgetRef.current?.offsetHeight || 200;
      setPos({
        x: Math.min(Math.max(0, e.clientX - offset.current.x), window.innerWidth  - w),
        y: Math.min(Math.max(0, e.clientY - offset.current.y), window.innerHeight - h),
      });
    };
    const onMouseUp = () => { dragging.current = false; };
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup',   onMouseUp);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup',   onMouseUp);
    };
  }, []);

  return (
    <div
      ref={widgetRef}
      style={{ position: 'fixed', left: pos.x, top: pos.y, zIndex: 1000, width: 280 }}
      className={`rounded-2xl shadow-2xl shadow-black/40 overflow-hidden
        ${isDark ? 'bg-gray-900/90 border border-white/10' : 'bg-white/90 border border-black/10'}
        backdrop-blur-md`}
    >
      {/* Drag handle / header */}
      <div
        onMouseDown={onMouseDown}
        className={`flex items-center justify-between px-3 py-2 cursor-grab active:cursor-grabbing select-none
          ${isDark ? 'bg-white/5' : 'bg-black/5'}`}
      >
        <div className="flex items-center gap-2">
          <GripHorizontal size={14} className="text-gray-400" />
          <Camera size={14} className="text-violet-400" />
          <span className="text-xs font-semibold">Camera Tracker</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Status dot */}
          {cameraEnabled && (
            <span className={`flex items-center gap-1 text-xs font-medium
              ${isActive ? 'text-green-400' : 'text-red-400 animate-pulse'}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-green-400' : 'bg-red-400'}`} />
              {isActive ? 'Active' : 'Inactive'}
            </span>
          )}
          {/* Minimize toggle */}
          <button
            onMouseDown={e => e.stopPropagation()}
            onClick={() => setMinimized(p => !p)}
            className={`p-1 rounded-lg transition-all ${isDark ? 'hover:bg-white/10' : 'hover:bg-black/10'}`}
          >
            {minimized ? <Maximize2 size={13} /> : <Minimize2 size={13} />}
          </button>
        </div>
      </div>

      {/* Body — hidden when minimized */}
      {!minimized && (
        <div className="p-3 space-y-3">
          {/* Camera feed */}
          {cameraEnabled && (
            <div className="relative rounded-xl overflow-hidden bg-black" style={{ aspectRatio: '4/3' }}>
              <video ref={videoRef} muted playsInline className="w-full h-full object-cover scale-x-[-1]" />

              {/* Inactive overlay */}
              {!isActive && (
                <div className="absolute inset-0 bg-red-900/70 flex flex-col items-center justify-center gap-1">
                  <AlertTriangle size={24} className="text-red-300" />
                  <p className="text-white text-xs font-semibold">No face detected!</p>
                </div>
              )}

              {/* Live indicator */}
              {isActive && (
                <div className="absolute top-2 left-2 flex items-center gap-1 bg-black/50 px-2 py-0.5 rounded-lg">
                  <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
                  <span className="text-white text-xs">Live</span>
                </div>
              )}
            </div>
          )}

          {/* Error */}
          {cameraError && (
            <div className="flex items-center gap-2 p-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs">
              <AlertTriangle size={13} /> {cameraError}
            </div>
          )}

          {/* Button */}
          {!cameraEnabled ? (
            <button
              onClick={startCamera}
              disabled={!modelsLoaded}
              className="w-full flex items-center justify-center gap-2 py-2 bg-gradient-to-r from-violet-600 to-purple-600
                text-white rounded-xl text-xs font-medium hover:from-violet-500 hover:to-purple-500
                transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {!modelsLoaded
                ? <><Loader size={12} className="animate-spin" /> Loading model...</>
                : <><Camera size={12} /> Enable Camera</>
              }
            </button>
          ) : (
            <button
              onClick={stopCamera}
              className="w-full flex items-center justify-center gap-2 py-2 bg-red-500/20 border border-red-500/30
                text-red-400 rounded-xl text-xs font-medium hover:bg-red-500/30 transition-all"
            >
              <CameraOff size={12} /> Disable Camera
            </button>
          )}

          {!cameraEnabled && (
            <p className={`text-center text-xs ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>
              Inactive after 5s of no face
            </p>
          )}
        </div>
      )}
    </div>
  );
}
