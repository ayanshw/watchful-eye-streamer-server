
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Code } from "lucide-react";

interface CodeCardProps {
  children: React.ReactNode;
}

const CodeCard = ({ children }: CodeCardProps) => {
  return (
    <Card className="bg-card">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center">
          <Code className="h-5 w-5 mr-2" />
          Implementation Code
        </CardTitle>
      </CardHeader>
      <CardContent>
        {children}
      </CardContent>
    </Card>
  );
};

export default CodeCard;
