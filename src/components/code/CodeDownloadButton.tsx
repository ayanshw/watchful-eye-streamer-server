
import { Button } from "@/components/ui/button";
import { Download } from "lucide-react";

interface CodeDownloadButtonProps {
  onClick: () => void;
  children: React.ReactNode;
}

const CodeDownloadButton = ({ onClick, children }: CodeDownloadButtonProps) => {
  return (
    <Button onClick={onClick} className="w-full">
      <Download className="h-4 w-4 mr-2" />
      {children}
    </Button>
  );
};

export default CodeDownloadButton;
