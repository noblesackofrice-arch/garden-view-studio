import { useState, useRef } from "react";
import FloorPlanViewer from "@/components/FloorPlanViewer";
import DetailSidebar from "@/components/DetailSidebar";
import { Leaf } from "lucide-react";

const Index = () => {
  const [floorPlanSrc, setFloorPlanSrc] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleUpload = () => fileInputRef.current?.click();

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) setFloorPlanSrc(URL.createObjectURL(file));
  };

  return (
    <div className="flex flex-col h-screen bg-background">
      {/* Top bar */}
      <header className="flex items-center gap-3 px-6 py-3 border-b border-border bg-card/80 backdrop-blur-sm">
        <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
          <Leaf className="w-4 h-4 text-primary-foreground" />
        </div>
        <div>
          <h1 className="font-display text-xl leading-tight text-foreground">Garden Plan</h1>
          <p className="text-xs text-muted-foreground">Interactive floor plan explorer</p>
        </div>
      </header>

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden">
        <FloorPlanViewer floorPlanSrc={floorPlanSrc} onUploadFloorPlan={handleUpload} />
        <DetailSidebar />
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onFileChange}
      />
    </div>
  );
};

export default Index;
