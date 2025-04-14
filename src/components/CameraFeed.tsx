
import { useState, useEffect } from "react";

interface CameraFeedProps {
  isConnected: boolean;
  isSurveillanceMode: boolean;
  currentFps: number;
}

interface Detection {
  id: string;
  label: string;
  confidence: number;
  box: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

const CameraFeed = ({ isConnected, isSurveillanceMode, currentFps }: CameraFeedProps) => {
  const [frameCount, setFrameCount] = useState(0);
  const [detections, setDetections] = useState<Detection[]>([]);

  // Simulate camera feed updates
  useEffect(() => {
    if (!isConnected) return;

    const frameInterval = 1000 / currentFps;
    
    const interval = setInterval(() => {
      setFrameCount(prev => prev + 1);
      
      // Randomly update detections
      if (Math.random() > 0.7) {
        const possibleLabels = ["person", "car", "dog", "cat", "bicycle"];
        const colors = {
          person: "border-red-500 bg-red-500/20",
          car: "border-blue-500 bg-blue-500/20",
          dog: "border-green-500 bg-green-500/20",
          cat: "border-yellow-500 bg-yellow-500/20",
          bicycle: "border-purple-500 bg-purple-500/20"
        };
        
        const newDetections: Detection[] = Array(Math.floor(Math.random() * 3) + 1)
          .fill(null)
          .map(() => {
            const label = possibleLabels[Math.floor(Math.random() * possibleLabels.length)];
            return {
              id: Math.random().toString(36).substring(2, 9),
              label,
              confidence: Number((0.7 + Math.random() * 0.29).toFixed(2)),
              box: {
                x: Math.random() * 70 + 10,
                y: Math.random() * 70 + 10,
                width: Math.random() * 20 + 10,
                height: Math.random() * 20 + 10
              }
            };
          });
        
        setDetections(newDetections);
      }
    }, frameInterval);

    return () => clearInterval(interval);
  }, [isConnected, currentFps]);

  const getColorClass = (label: string) => {
    switch(label) {
      case "person": return "border-red-500";
      case "car": return "border-blue-500";
      case "dog": return "border-green-500";
      case "cat": return "border-yellow-500";
      case "bicycle": return "border-purple-500";
      default: return "border-white";
    }
  };

  const getLabelBgClass = (label: string) => {
    switch(label) {
      case "person": return "bg-red-500";
      case "car": return "bg-blue-500";
      case "dog": return "bg-green-500";
      case "cat": return "bg-yellow-500";
      case "bicycle": return "bg-purple-500";
      default: return "bg-white";
    }
  };

  return (
    <div className="bg-card rounded-lg p-4 shadow-lg">
      <h2 className="text-lg font-semibold mb-4">Camera Feed</h2>
      
      <div className="video-feed aspect-video mb-2">
        {!isConnected ? (
          <div className="w-full h-full flex items-center justify-center bg-surveillance-accent/10">
            <p className="text-center text-muted-foreground animate-pulse-slow">
              Connecting to ESP32-CAM...
            </p>
          </div>
        ) : (
          <>
            {/* Simulated video feed */}
            <div 
              className="w-full h-full bg-surveillance p-0 relative overflow-hidden"
              style={{ 
                backgroundImage: "url('data:image/svg+xml,%3Csvg width=\"100\" height=\"100\" viewBox=\"0 0 100 100\" xmlns=\"http://www.w3.org/2000/svg\"%3E%3Cpath d=\"M11 18c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm48 25c3.866 0 7-3.134 7-7s-3.134-7-7-7-7 3.134-7 7 3.134 7 7 7zm-43-7c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm63 31c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM34 90c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zm56-76c1.657 0 3-1.343 3-3s-1.343-3-3-3-3 1.343-3 3 1.343 3 3 3zM12 86c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm28-65c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm23-11c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-6 60c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm29 22c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zM32 63c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm57-13c2.76 0 5-2.24 5-5s-2.24-5-5-5-5 2.24-5 5 2.24 5 5 5zm-9-21c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM60 91c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM35 41c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2zM12 60c1.105 0 2-.895 2-2s-.895-2-2-2-2 .895-2 2 .895 2 2 2z\" fill=\"%232A3238\" fill-opacity=\"0.2\" fill-rule=\"evenodd\"/%3E%3C/svg%3E')",
                backgroundSize: "cover"
              }}
            >
              {/* Bounding boxes for detections */}
              {detections.map(detection => (
                <div 
                  key={detection.id}
                  className={`bounding-box ${getColorClass(detection.label)}`}
                  style={{
                    left: `${detection.box.x}%`,
                    top: `${detection.box.y}%`,
                    width: `${detection.box.width}%`,
                    height: `${detection.box.height}%`
                  }}
                >
                  <div className={`detection-label ${getLabelBgClass(detection.label)}`}>
                    {detection.label} {(detection.confidence * 100).toFixed(0)}%
                  </div>
                </div>
              ))}
              
              {/* FPS indicator */}
              <div className="fps-indicator">
                {currentFps} FPS
              </div>
              
              {/* Recording indicator */}
              <div className="recording-indicator animate-recording"></div>
            </div>
          </>
        )}
      </div>
      
      <div className="text-xs text-muted-foreground">
        <span>Mode: </span>
        <span className={isSurveillanceMode ? "text-surveillance-danger" : "text-surveillance-success"}>
          {isSurveillanceMode ? "Surveillance (15fps)" : "Normal (1fps)"}
        </span>
        {isConnected && (
          <span className="ml-4">Frame: {frameCount}</span>
        )}
      </div>
    </div>
  );
};

export default CameraFeed;
