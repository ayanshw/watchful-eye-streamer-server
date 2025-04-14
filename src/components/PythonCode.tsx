
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import CodeCard from "./code/CodeCard";
import PythonTab from "./code/PythonTab";
import ESP32Tab from "./code/ESP32Tab";

const PythonCode = () => {
  return (
    <CodeCard>
      <Tabs defaultValue="python">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="python">Python Server</TabsTrigger>
          <TabsTrigger value="esp32">ESP32-CAM Client</TabsTrigger>
        </TabsList>
        
        <TabsContent value="python">
          <PythonTab />
        </TabsContent>
        
        <TabsContent value="esp32">
          <ESP32Tab />
        </TabsContent>
      </Tabs>
    </CodeCard>
  );
};

export default PythonCode;
