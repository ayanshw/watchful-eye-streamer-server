
import { useState, useEffect } from "react";
import CameraFeed from "@/components/CameraFeed";
import ControlPanel from "@/components/ControlPanel";
import DetectionLog from "@/components/DetectionLog";
import ServerStatus from "@/components/ServerStatus";
import PythonCode from "@/components/PythonCode";
import Header from "@/components/Header";
import { toast } from "sonner";

export interface DetectionEvent {
  id: string;
  objectType: string;
  confidence: number;
  timestamp: Date;
}

const Index = () => {
  const [isConnected, setIsConnected] = useState(false);
  const [isSurveillanceMode, setIsSurveillanceMode] = useState(false);
  const [currentFps, setCurrentFps] = useState<number>(1);
  const [detections, setDetections] = useState<DetectionEvent[]>([]);
  const [serverStatus, setServerStatus] = useState({
    isRunning: false,
    uptime: "00:00:00",
    processingRate: "0",
    connectedClients: 0
  });

  // Simulate connecting to the server
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsConnected(true);
      setServerStatus({
        isRunning: true,
        uptime: "00:00:05",
        processingRate: "24ms",
        connectedClients: 1
      });
      toast.success("Connected to YOLO processing server");
    }, 2000);

    return () => clearTimeout(timer);
  }, []);

  // Update server status periodically
  useEffect(() => {
    if (!isConnected) return;

    const interval = setInterval(() => {
      setServerStatus(prev => {
        // Parse the previous uptime
        const [hours, minutes, seconds] = prev.uptime.split(':').map(Number);
        let newSeconds = seconds + 5;
        let newMinutes = minutes;
        let newHours = hours;

        if (newSeconds >= 60) {
          newSeconds = newSeconds % 60;
          newMinutes += 1;
        }

        if (newMinutes >= 60) {
          newMinutes = newMinutes % 60;
          newHours += 1;
        }

        // Format the new uptime
        const uptimeString = `${String(newHours).padStart(2, '0')}:${String(newMinutes).padStart(2, '0')}:${String(newSeconds).padStart(2, '0')}`;

        return {
          ...prev,
          uptime: uptimeString,
          processingRate: `${Math.floor(20 + Math.random() * 8)}ms`
        };
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [isConnected]);

  // Simulate detections
  useEffect(() => {
    if (!isConnected) return;

    const interval = setInterval(() => {
      if (Math.random() > 0.5) {
        const objectTypes = ["person", "car", "dog", "cat", "bicycle"];
        const newDetection: DetectionEvent = {
          id: Math.random().toString(36).substring(2, 9),
          objectType: objectTypes[Math.floor(Math.random() * objectTypes.length)],
          confidence: Number((0.7 + Math.random() * 0.29).toFixed(2)),
          timestamp: new Date()
        };
        
        setDetections(prev => [newDetection, ...prev].slice(0, 100));
        
        if (newDetection.objectType === "person" && newDetection.confidence > 0.9) {
          toast("Person detected", {
            description: `High confidence (${newDetection.confidence})`,
            duration: 3000
          });
        }
      }
    }, isSurveillanceMode ? 1000 : 3000);

    return () => clearInterval(interval);
  }, [isConnected, isSurveillanceMode]);

  const toggleSurveillanceMode = () => {
    const newMode = !isSurveillanceMode;
    setIsSurveillanceMode(newMode);
    setCurrentFps(newMode ? 15 : 1);
    toast.info(`Switched to ${newMode ? "surveillance" : "normal"} mode`);
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      
      <main className="flex-grow container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main video feed */}
          <div className="lg:col-span-2">
            <CameraFeed 
              isConnected={isConnected} 
              isSurveillanceMode={isSurveillanceMode}
              currentFps={currentFps}
            />
            
            <div className="mt-6">
              <ControlPanel 
                isConnected={isConnected}
                isSurveillanceMode={isSurveillanceMode}
                onToggleSurveillanceMode={toggleSurveillanceMode}
              />
            </div>
            
            <div className="mt-6">
              <PythonCode />
            </div>
          </div>
          
          {/* Side panel */}
          <div className="space-y-6">
            <ServerStatus 
              isConnected={isConnected}
              serverStatus={serverStatus}
            />
            
            <DetectionLog detections={detections} />
          </div>
        </div>
      </main>
    </div>
  );
};

export default Index;
