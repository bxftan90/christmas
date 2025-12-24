import React, { useEffect, useRef, useState } from 'react';
import { TreeState } from '../types';

interface GestureControllerProps {
  onStateChange: (state: TreeState) => void;
  onCameraMove: (x: number, y: number) => void;
  onPhotoGrab: (isGrabbing: boolean) => void;
}

declare global {
  interface Window {
    Hands: any;
    Camera: any;
  }
}

export const GestureController: React.FC<GestureControllerProps> = ({ 
    onStateChange, 
    onCameraMove,
    onPhotoGrab 
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const lastGestureTime = useRef<number>(0);
  const currentStateRef = useRef<TreeState>(TreeState.TREE_SHAPE);
  const [isReady, setIsReady] = useState(false);
  const handsRef = useRef<any>(null);
  const cameraRef = useRef<any>(null);

  useEffect(() => {
    // Check if scripts are loaded
    if (!window.Hands || !window.Camera) {
        console.warn("MediaPipe scripts not loaded yet. Gestures disabled.");
        return;
    }

    if (!videoRef.current) return;

    try {
        const hands = new window.Hands({
          locateFile: (file: string) => {
            return `https://cdn.jsdelivr.net/npm/@mediapipe/hands/${file}`;
          },
        });

        hands.setOptions({
          maxNumHands: 1,
          modelComplexity: 1,
          minDetectionConfidence: 0.7,
          minTrackingConfidence: 0.7,
        });

        hands.onResults((results: any) => {
          if (results.multiHandLandmarks && results.multiHandLandmarks.length > 0) {
            const landmarks = results.multiHandLandmarks[0];
            processGestures(landmarks);
          }
        });

        handsRef.current = hands;

        const camera = new window.Camera(videoRef.current, {
          onFrame: async () => {
            if (videoRef.current && handsRef.current) {
              await handsRef.current.send({ image: videoRef.current });
            }
          },
          width: 640,
          height: 480,
        });

        camera.start();
        cameraRef.current = camera;
        setIsReady(true);

    } catch (error) {
        console.error("Failed to initialize gesture control:", error);
    }

    return () => {
        // Cleanup usually not provided by Camera utils, but we can stop sending
        if (cameraRef.current) {
            // some versions expose stop, others dont. safe to ignore in this demo context
        }
    }
  }, []);

  const processGestures = (landmarks: any[]) => {
      const now = Date.now();
      // Rate limit state changes
      if (now - lastGestureTime.current < 500) return;

      const wrist = landmarks[0];
      const tips = [8, 12, 16, 20]; // Index, Middle, Ring, Pinky
      const mcp = [5, 9, 13, 17]; // Knuckles
      
      let fingersOpen = 0;
      tips.forEach((tipIdx, i) => {
          const tip = landmarks[tipIdx];
          const knuckle = landmarks[mcp[i]];
          // Distance from wrist
          const distTip = Math.hypot(tip.x - wrist.x, tip.y - wrist.y);
          const distKnuckle = Math.hypot(knuckle.x - wrist.x, knuckle.y - wrist.y);
          if (distTip > distKnuckle * 1.2) fingersOpen++;
      });
      
      const thumbTip = landmarks[4];
      // Check pinch (Thumb tip near Index tip)
      const indexTip = landmarks[8];
      const pinchDist = Math.hypot(thumbTip.x - indexTip.x, thumbTip.y - indexTip.y);
      const isPinching = pinchDist < 0.05;

      // --- State Machine Logic ---
      
      let newState = currentStateRef.current;

      if (isPinching && currentStateRef.current === TreeState.SCATTERED) {
          // GRAB -> Photo View
          onPhotoGrab(true);
          newState = TreeState.PHOTO_VIEW;
      } else if (fingersOpen >= 4) {
          // OPEN PALM -> Scatter
          newState = TreeState.SCATTERED;
          onPhotoGrab(false);
      } else if (fingersOpen === 0 && !isPinching) {
          // FIST -> Assemble
          newState = TreeState.TREE_SHAPE;
          onPhotoGrab(false);
      }

      if (newState !== currentStateRef.current) {
          currentStateRef.current = newState;
          onStateChange(newState);
          lastGestureTime.current = now;
      }

      // --- Camera Control Logic (Rotation) ---
      // If Scattered and hand moves
      if (currentStateRef.current === TreeState.SCATTERED) {
          const x = (0.5 - wrist.x) * 4; 
          const y = (0.5 - wrist.y) * 2;
          onCameraMove(x, y);
      }
  };

  return (
    <div className={`fixed top-4 left-4 z-50 transition-opacity duration-1000 ${isReady ? 'opacity-50 hover:opacity-100' : 'opacity-0'}`}>
      <video ref={videoRef} className="w-32 h-24 rounded-lg border border-emerald-500 transform scale-x-[-1]" autoPlay playsInline muted />
      <div className="text-[10px] text-emerald-300 bg-black/80 p-1 mt-1 rounded">
        Gesture Control Active
      </div>
    </div>
  );
};
