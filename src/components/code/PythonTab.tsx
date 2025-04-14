import CodeDownloadButton from "./CodeDownloadButton";

const PythonTab = () => {
  const downloadPythonCode = () => {
    const pythonCode = `
# YOLO Processing Server for ESP32-CAM
# This server receives UDP frames from ESP32-CAM and performs YOLO object detection

import socket
import numpy as np
import cv2
import time
import argparse
import threading
from datetime import datetime
from ultralytics import YOLO

# Configuration
UDP_IP = "0.0.0.0"  # Listen on all interfaces
UDP_PORT = 8090     # Default UDP port
BUFFER_SIZE = 65535  # Max UDP packet size
SURVEILLANCE_MODE = False  # Start in normal mode (1fps)

# Load YOLO model
model = YOLO('yolov8n.pt')  # Nano model for better performance

# Global variables
running = True
last_frame = None
last_frame_lock = threading.Lock()
last_results = []
connected_clients = set()
processing_times = []

class UDPServer:
    def __init__(self, ip, port):
        self.ip = ip
        self.port = port
        self.sock = None
        self.start_time = time.time()
        
    def start(self):
        self.sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        self.sock.bind((self.ip, self.port))
        print(f"[*] UDP Server started on {self.ip}:{self.port}")
        
        # Start statistics thread
        stats_thread = threading.Thread(target=self.print_stats)
        stats_thread.daemon = True
        stats_thread.start()
        
        # Start frame processing thread
        process_thread = threading.Thread(target=self.process_frames)
        process_thread.daemon = True
        process_thread.start()
        
        try:
            while running:
                data, addr = self.sock.recvfrom(BUFFER_SIZE)
                
                if addr not in connected_clients:
                    connected_clients.add(addr)
                    print(f"[+] New client connected: {addr}")
                
                # Process the received image data
                try:
                    # Extract metadata from the first 20 bytes
                    # Format: [surveillance_mode(1)][frame_number(4)][timestamp(8)][image_size(4)][reserved(3)]
                    metadata = data[:20]
                    img_data = data[20:]
                    
                    surveillance_mode = bool(metadata[0])
                    frame_number = int.from_bytes(metadata[1:5], byteorder='big')
                    timestamp = int.from_bytes(metadata[5:13], byteorder='big')
                    img_size = int.from_bytes(metadata[13:17], byteorder='big')
                    
                    # Decode the image
                    img_np = np.frombuffer(img_data, dtype=np.uint8)
                    frame = cv2.imdecode(img_np, cv2.IMREAD_COLOR)
                    
                    if frame is not None:
                        # Store the frame for processing
                        with last_frame_lock:
                            global last_frame
                            last_frame = frame
                            
                    print(f"Received frame {frame_number} in {'surveillance' if surveillance_mode else 'normal'} mode")
                    
                except Exception as e:
                    print(f"[!] Error processing frame: {e}")
        
        except KeyboardInterrupt:
            print("[-] Server shutting down...")
        finally:
            global running
            running = False
            self.sock.close()
    
    def process_frames(self):
        """Process frames in a separate thread to avoid blocking UDP reception"""
        global last_frame, last_results
        
        while running:
            # Get a copy of the last frame to process
            with last_frame_lock:
                if last_frame is None:
                    time.sleep(0.1)
                    continue
                frame_to_process = last_frame.copy()
            
            # Run YOLO detection
            start_time = time.time()
            results = model(frame_to_process)
            end_time = time.time()
            
            # Calculate processing time
            processing_time = end_time - start_time
            processing_times.append(processing_time)
            if len(processing_times) > 100:
                processing_times.pop(0)
            
            # Store results
            detections = []
            for result in results:
                boxes = result.boxes.cpu().numpy()
                for box in boxes:
                    x1, y1, x2, y2 = box.xyxy[0].astype(int)
                    conf = box.conf[0]
                    cls = int(box.cls[0])
                    name = result.names[cls]
                    
                    detections.append({
                        'class': name,
                        'confidence': float(conf),
                        'bbox': [int(x1), int(y1), int(x2), int(y2)],
                        'timestamp': datetime.now().isoformat()
                    })
            
            last_results = detections
            
            # Log detections
            if detections:
                print(f"[+] Detected {len(detections)} objects:")
                for det in detections:
                    print(f"    - {det['class']} ({det['confidence']:.2f})")
            
            # Sleep less in surveillance mode for faster processing
            time.sleep(0.01)
    
    def print_stats(self):
        """Print server statistics periodically"""
        while running:
            uptime = time.time() - self.start_time
            hours, remainder = divmod(uptime, 3600)
            minutes, seconds = divmod(remainder, 60)
            
            avg_processing = sum(processing_times) / max(1, len(processing_times)) * 1000
            
            print("-" * 50)
            print(f"Server Statistics:")
            print(f"Uptime: {int(hours):02d}:{int(minutes):02d}:{int(seconds):02d}")
            print(f"Connected clients: {len(connected_clients)}")
            print(f"Average processing time: {avg_processing:.2f}ms")
            print(f"Surveillance mode: {'ON' if SURVEILLANCE_MODE else 'OFF'}")
            print("-" * 50)
            time.sleep(30)

def main():
    parser = argparse.ArgumentParser(description="YOLO Processing Server for ESP32-CAM")
    parser.add_argument("--ip", default=UDP_IP, help="IP address to bind to")
    parser.add_argument("--port", type=int, default=UDP_PORT, help="UDP port to listen on")
    args = parser.parse_args()
    
    server = UDPServer(args.ip, args.port)
    server.start()

if __name__ == "__main__":
    main()
`;

    const element = document.createElement('a');
    const file = new Blob([pythonCode], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = 'yolo_server.py';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="space-y-4 pt-4">
      <p className="text-sm">
        The Python server uses ultralytics YOLO for object detection and processes UDP frames from the ESP32-CAM.
      </p>
      <div className="text-xs text-muted-foreground space-y-2">
        <p>Requirements:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>Python 3.7+</li>
          <li>OpenCV</li>
          <li>NumPy</li>
          <li>Ultralytics YOLO</li>
        </ul>
      </div>
      <CodeDownloadButton onClick={downloadPythonCode}>
        Download Python Server Code
      </CodeDownloadButton>
    </div>
  );
};

export default PythonTab;
