import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ScanSearch, Save, Settings, Radio, AlertTriangle, Eye, Video } from "lucide-react";
import { toast } from "sonner";

interface ControlPanelProps {
  isConnected: boolean;
  isSurveillanceMode: boolean;
  onToggleSurveillanceMode: () => void;
}

const ControlPanel = ({ 
  isConnected,
  isSurveillanceMode,
  onToggleSurveillanceMode 
}: ControlPanelProps) => {
  const handleModeToggle = async () => {
    try {
      // Send mode change request to the server
      const response = await fetch('/api/camera/mode', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          surveillance_mode: !isSurveillanceMode
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to change mode');
      }

      // If server accepted the change, update local state
      onToggleSurveillanceMode();
      
    } catch (error) {
      console.error('Error changing camera mode:', error);
      toast.error('Failed to change camera mode');
    }
  };

  return (
    <Card className="bg-card">
      <CardHeader className="pb-3">
        <CardTitle>Control Panel</CardTitle>
        <CardDescription>
          Manage the ESP32-CAM and YOLO processing
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="camera" className="w-full">
          <TabsList className="grid grid-cols-3 mb-4">
            <TabsTrigger value="camera">Camera</TabsTrigger>
            <TabsTrigger value="detection">Detection</TabsTrigger>
            <TabsTrigger value="network">Network</TabsTrigger>
          </TabsList>
          
          <TabsContent value="camera" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="surveillance-mode">Surveillance Mode</Label>
                <div className="text-xs text-muted-foreground">
                  {isSurveillanceMode ? "15fps" : "1fps"} streaming rate
                </div>
              </div>
              <Switch 
                id="surveillance-mode" 
                checked={isSurveillanceMode}
                onCheckedChange={handleModeToggle}
                disabled={!isConnected}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <Button 
                className="h-auto py-4 flex-col space-y-1"
                variant="outline"
                disabled={!isConnected}
              >
                <Video className="h-4 w-4" />
                <span className="text-xs">Record</span>
              </Button>
              <Button 
                className="h-auto py-4 flex-col space-y-1"
                variant="outline"
                disabled={!isConnected}
              >
                <Save className="h-4 w-4" />
                <span className="text-xs">Snapshot</span>
              </Button>
            </div>
          </TabsContent>
          
          <TabsContent value="detection" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="use-yolo">YOLO Processing</Label>
                <div className="text-xs text-muted-foreground">
                  Enable object detection
                </div>
              </div>
              <Switch 
                id="use-yolo" 
                checked={true}
                disabled={!isConnected}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="person-alerts">Person Alerts</Label>
                <div className="text-xs text-muted-foreground">
                  Alert when persons detected
                </div>
              </div>
              <Switch 
                id="person-alerts" 
                checked={true}
                disabled={!isConnected}
              />
            </div>
            
            <Button 
              className="w-full h-auto py-4 flex-col space-y-1"
              variant="outline"
              disabled={!isConnected}
            >
              <ScanSearch className="h-4 w-4" />
              <span className="text-xs">Detection Settings</span>
            </Button>
          </TabsContent>
          
          <TabsContent value="network" className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="space-y-0.5">
                <Label>UDP Connection</Label>
                <div className="text-xs text-muted-foreground">
                  {isConnected ? "Connected" : "Disconnected"}
                </div>
              </div>
              <div className={`w-3 h-3 rounded-full ${isConnected ? "bg-surveillance-success" : "bg-surveillance-danger"}`}></div>
            </div>
            
            <div className="grid grid-cols-2 gap-2">
              <Button 
                className="h-auto py-4 flex-col space-y-1"
                variant="outline"
              >
                <Radio className="h-4 w-4" />
                <span className="text-xs">Reconnect</span>
              </Button>
              <Button 
                className="h-auto py-4 flex-col space-y-1"
                variant="outline"
                disabled={!isConnected}
              >
                <Settings className="h-4 w-4" />
                <span className="text-xs">Settings</span>
              </Button>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default ControlPanel;
