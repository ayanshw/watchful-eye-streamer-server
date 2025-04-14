
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CirclePower, Timer, Cpu, Users } from "lucide-react";

interface ServerStatusProps {
  isConnected: boolean;
  serverStatus: {
    isRunning: boolean;
    uptime: string;
    processingRate: string;
    connectedClients: number;
  };
}

const ServerStatus = ({ isConnected, serverStatus }: ServerStatusProps) => {
  return (
    <Card className="bg-card">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center justify-between">
          <span>Server Status</span>
          <span className={`flex items-center text-sm ${serverStatus.isRunning ? "text-surveillance-success" : "text-surveillance-danger"}`}>
            <CirclePower className="h-4 w-4 mr-1" />
            {serverStatus.isRunning ? "Online" : "Offline"}
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between border-b border-surveillance-accent/20 pb-2">
            <div className="flex items-center">
              <Timer className="h-4 w-4 mr-2 text-muted-foreground" />
              <span className="text-sm">Uptime</span>
            </div>
            <span className="text-sm font-mono">{serverStatus.uptime}</span>
          </div>
          
          <div className="flex items-center justify-between border-b border-surveillance-accent/20 pb-2">
            <div className="flex items-center">
              <Cpu className="h-4 w-4 mr-2 text-muted-foreground" />
              <span className="text-sm">Processing Rate</span>
            </div>
            <span className="text-sm font-mono">{serverStatus.processingRate}</span>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <Users className="h-4 w-4 mr-2 text-muted-foreground" />
              <span className="text-sm">Connected Clients</span>
            </div>
            <span className="text-sm font-mono">{serverStatus.connectedClients}</span>
          </div>
          
          <div className="pt-2 text-xs text-muted-foreground border-t border-surveillance-accent/20 mt-2">
            <p>Python YOLO Server v1.0</p>
            <p>UDP Port: 8090</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default ServerStatus;
