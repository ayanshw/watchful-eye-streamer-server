
import { Camera } from "lucide-react";

const Header = () => {
  return (
    <header className="bg-surveillance-accent/30 border-b border-muted py-4">
      <div className="container mx-auto px-4 flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Camera className="h-8 w-8 text-surveillance-accent" />
          <div>
            <h1 className="text-xl font-bold">WatchfulEye</h1>
            <p className="text-xs text-muted-foreground">YOLO v8 Object Detection System</p>
          </div>
        </div>
        
        <div className="text-sm text-muted-foreground">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full bg-surveillance-success animate-pulse"></div>
              <span>ESP32-CAM</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-2 h-2 rounded-full bg-surveillance-success animate-pulse"></div>
              <span>YOLO v8</span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
