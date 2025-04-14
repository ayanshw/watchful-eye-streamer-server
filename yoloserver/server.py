
import socket
import numpy as np
import cv2
import time
import threading
from datetime import datetime
from ultralytics import YOLO
from typing import List, Dict, Any, Optional

class YOLOServer:
    def __init__(
        self, 
        ip: str = "0.0.0.0", 
        port: int = 8090, 
        model_path: str = "yolov8n.pt"
    ):
        """Initialize YOLO Processing Server"""
        self.ip = ip
        self.port = port
        self.sock: Optional[socket.socket] = None
        self.start_time = time.time()
        self.model = YOLO(model_path)
        
        # Processing state
        self.running = True
        self.last_frame = None
        self.last_frame_lock = threading.Lock()
        self.last_results: List[Dict[str, Any]] = []
        self.connected_clients = set()
        self.processing_times: List[float] = []
        
        # Callbacks
        self.on_detection = None
        self.on_client_connect = None
        self.on_client_disconnect = None
    
    def start(self) -> None:
        """Start the UDP server"""
        self.sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        self.sock.bind((self.ip, self.port))
        print(f"[*] UDP Server started on {self.ip}:{self.port}")
        
        # Start statistics thread
        stats_thread = threading.Thread(target=self._print_stats)
        stats_thread.daemon = True
        stats_thread.start()
        
        # Start frame processing thread
        process_thread = threading.Thread(target=self._process_frames)
        process_thread.daemon = True
        process_thread.start()
        
        try:
            while self.running:
                data, addr = self.sock.recvfrom(65535)  # Max UDP packet size
                
                if addr not in self.connected_clients:
                    self.connected_clients.add(addr)
                    print(f"[+] New client connected: {addr}")
                    if self.on_client_connect:
                        self.on_client_connect(addr)
                
                # Process the received image data
                try:
                    # Extract metadata from the first 20 bytes
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
                        with self.last_frame_lock:
                            self.last_frame = frame
                            
                    print(f"Received frame {frame_number} in {'surveillance' if surveillance_mode else 'normal'} mode")
                    
                except Exception as e:
                    print(f"[!] Error processing frame: {e}")
        
        except KeyboardInterrupt:
            print("[-] Server shutting down...")
        finally:
            self.running = False
            if self.sock:
                self.sock.close()
    
    def _process_frames(self) -> None:
        """Process frames in a separate thread"""
        while self.running:
            with self.last_frame_lock:
                if self.last_frame is None:
                    time.sleep(0.1)
                    continue
                frame_to_process = self.last_frame.copy()
            
            # Run YOLO detection
            start_time = time.time()
            results = self.model(frame_to_process)
            end_time = time.time()
            
            # Calculate processing time
            processing_time = end_time - start_time
            self.processing_times.append(processing_time)
            if len(self.processing_times) > 100:
                self.processing_times.pop(0)
            
            # Store results
            detections = []
            for result in results:
                boxes = result.boxes.cpu().numpy()
                for box in boxes:
                    x1, y1, x2, y2 = box.xyxy[0].astype(int)
                    conf = box.conf[0]
                    cls = int(box.cls[0])
                    name = result.names[cls]
                    
                    detection = {
                        'class': name,
                        'confidence': float(conf),
                        'bbox': [int(x1), int(y1), int(x2), int(y2)],
                        'timestamp': datetime.now().isoformat()
                    }
                    detections.append(detection)
                    
                    if self.on_detection:
                        self.on_detection(detection)
            
            self.last_results = detections
            
            # Sleep briefly to prevent CPU overuse
            time.sleep(0.01)
    
    def _print_stats(self) -> None:
        """Print server statistics periodically"""
        while self.running:
            uptime = time.time() - self.start_time
            hours, remainder = divmod(uptime, 3600)
            minutes, seconds = divmod(remainder, 60)
            
            avg_processing = sum(self.processing_times) / max(1, len(self.processing_times)) * 1000
            
            print("-" * 50)
            print(f"Server Statistics:")
            print(f"Uptime: {int(hours):02d}:{int(minutes):02d}:{int(seconds):02d}")
            print(f"Connected clients: {len(self.connected_clients)}")
            print(f"Average processing time: {avg_processing:.2f}ms")
            print("-" * 50)
            time.sleep(30)
    
    def stop(self) -> None:
        """Stop the server"""
        self.running = False
        if self.sock:
            self.sock.close()

