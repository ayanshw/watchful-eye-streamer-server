
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { type DetectionEvent } from "@/pages/Index";
import { formatDistanceToNow } from "date-fns";

interface DetectionLogProps {
  detections: DetectionEvent[];
}

const DetectionLog = ({ detections }: DetectionLogProps) => {
  const getIconColor = (objectType: string) => {
    switch(objectType) {
      case "person": return "text-red-500";
      case "car": return "text-blue-500";
      case "dog": return "text-green-500";
      case "cat": return "text-yellow-500";
      case "bicycle": return "text-purple-500";
      default: return "text-gray-500";
    }
  };

  return (
    <Card className="bg-card">
      <CardHeader className="pb-2">
        <CardTitle>Detection Log</CardTitle>
      </CardHeader>
      <CardContent>
        {detections.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <p>No detections yet</p>
            <p className="text-xs mt-1">Detections will appear here</p>
          </div>
        ) : (
          <ScrollArea className="h-[320px]">
            <div className="space-y-2">
              {detections.map((detection) => (
                <div 
                  key={detection.id}
                  className="bg-secondary p-2 rounded-md text-sm flex items-start justify-between"
                >
                  <div>
                    <div className="flex items-center">
                      <span className={`font-semibold capitalize ${getIconColor(detection.objectType)}`}>
                        {detection.objectType}
                      </span>
                      <span className="ml-2 text-xs bg-surveillance-accent/40 rounded-md px-1.5 py-0.5">
                        {(detection.confidence * 100).toFixed(0)}%
                      </span>
                    </div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(detection.timestamp, { addSuffix: true })}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

export default DetectionLog;
