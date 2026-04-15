import { useEffect, useRef, useState, useCallback } from 'react';
import * as faceapi from 'face-api.js';
import api from '../api';
import { playAlertTone } from '../utils/alertTone';

const INACTIVE_AFTER_MS = 5000;
const PING_INTERVAL_MS  = 10000;
const MODEL_URL         = '/models';

export const useCameraTracker = () => {
  const videoRef        = useRef(null);
  const streamRef       = useRef(null);
  const detectionRef    = useRef(null);
  const lastFaceSeenRef = useRef(Date.now());
  const pingRef         = useRef(null);
  const alertedRef      = useRef(false);

  const [isActive,      setIsActive]      = useState(true);
  const [modelsLoaded,  setModelsLoaded]  = useState(false);
  const [cameraError,   setCameraError]   = useState(null);
  const [cameraEnabled, setCameraEnabled] = useState(false);

  // Load face-api model once
  useEffect(() => {
    faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL)
      .then(() => setModelsLoaded(true))
      .catch(() => setCameraError('Failed to load face detection model'));
  }, []);

  // Once cameraEnabled=true the video element is rendered — attach stream here
  useEffect(() => {
    if (!cameraEnabled || !streamRef.current || !videoRef.current) return;
    videoRef.current.srcObject = streamRef.current;
    videoRef.current.play().catch(() => {});
  }, [cameraEnabled]);

  const stopCamera = useCallback(() => {
    clearInterval(detectionRef.current);
    clearInterval(pingRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setCameraEnabled(false);
    setIsActive(true);
  }, []);

  const startCamera = useCallback(async () => {
    if (!modelsLoaded) return;
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      lastFaceSeenRef.current = Date.now();
      alertedRef.current = false;

      // Show video element first, then useEffect above attaches the stream
      setCameraEnabled(true);

      // Face detection every 1 second
      detectionRef.current = setInterval(async () => {
        if (!videoRef.current || videoRef.current.readyState < 2) return;
        const detection = await faceapi.detectSingleFace(
          videoRef.current,
          new faceapi.TinyFaceDetectorOptions({ inputSize: 160, scoreThreshold: 0.4 })
        );
        if (detection) {
          lastFaceSeenRef.current = Date.now();
          alertedRef.current = false;
          setIsActive(true);
        } else {
          if (Date.now() - lastFaceSeenRef.current >= INACTIVE_AFTER_MS) {
            setIsActive(false);
            if (!alertedRef.current) {
              alertedRef.current = true;
              playAlertTone();
            }
          }
        }
      }, 1000);

      // Ping backend every 10 seconds
      pingRef.current = setInterval(() => {
        const active = (Date.now() - lastFaceSeenRef.current) < INACTIVE_AFTER_MS;
        api.post('/activity/ping', { isActive: active }).catch(() => {});
      }, PING_INTERVAL_MS);

    } catch (err) {
      setCameraError(err.name === 'NotAllowedError'
        ? 'Camera permission denied. Please allow camera access.'
        : 'Could not access camera.');
    }
  }, [modelsLoaded]);

  useEffect(() => () => stopCamera(), [stopCamera]);

  return { videoRef, isActive, modelsLoaded, cameraError, cameraEnabled, startCamera, stopCamera };
};
