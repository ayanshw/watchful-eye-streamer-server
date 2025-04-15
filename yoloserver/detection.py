
from datetime import datetime
from ultralytics import YOLO
import numpy as np
from typing import List, Dict, Any

class DetectionProcessor:
    def __init__(self, model_path: str = "yolov8n.pt"):
        self.model = YOLO(model_path)
        
    def process_frame(self, camera_id: int, frame) -> List[Dict[str, Any]]:
        results = self.model(frame)
        detections = []
        
        for result in results:
            boxes = result.boxes.cpu().numpy()
            for box in boxes:
                x1, y1, x2, y2 = box.xyxy[0].astype(int)
                conf = box.conf[0]
                cls = int(box.cls[0])
                name = result.names[cls]
                
                detection = {
                    'camera_id': camera_id,
                    'class': name,
                    'confidence': float(conf),
                    'bbox': [int(x1), int(y1), int(x2), int(y2)],
                    'timestamp': datetime.now().isoformat()
                }
                detections.append(detection)
                
        return detections
