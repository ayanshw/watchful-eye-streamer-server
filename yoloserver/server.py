
import time
import threading
import cv2
import numpy as np
from typing import Dict, Optional, Callable, Any
from .camera import Camera
from .detection import DetectionProcessor
from .network import UDPNetwork

class YOLOServer:
    def __init__(
        self, 
        ip: str = "0.0.0.0", 
        port: int = 8090, 
        model_path: str = "yolov8n.pt"
    ):
        self.start_time = time.time()
        self.running = True
        self.cameras: Dict[int, Camera] = {}
        self.cameras_lock = threading.Lock()
        self.processing_times: List[float] = []
        
        # Initialize components
        self.network = UDPNetwork(ip, port)
        self.detector = DetectionProcessor(model_path)
        
        # Callbacks
        self.on_detection: Optional[Callable] = None
        self.on_camera_connect: Optional[Callable] = None
        self.on_camera_disconnect: Optional[Callable] = None
        
    def start(self):
        """Start the UDP server and processing threads"""
        self.network.start()
        
        # Start worker threads
        threads = [
            threading.Thread(target=self._process_frames),
            threading.Thread(target=self._print_stats),
            threading.Thread(target=self._cleanup_inactive_cameras),
            threading.Thread(target=self._receive_packets)
        ]
        
        for thread in threads:
            thread.daemon = True
            thread.start()
            
        try:
            # Keep main thread alive
            while self.running:
                time.sleep(1)
        except KeyboardInterrupt:
            self.stop()
            
    def stop(self):
        """Stop the server and cleanup"""
        self.running = False
        self.network.stop()
        
    def _receive_packets(self):
        """Handle incoming UDP packets"""
        while self.running:
            if not self.network.sock:
                continue
                
            try:
                data, addr = self.network.sock.recvfrom(65535)
                
                # Extract camera ID from metadata
                camera_id = int.from_bytes(data[0:4], byteorder='big')
                
                with self.cameras_lock:
                    if camera_id not in self.cameras:
                        self.cameras[camera_id] = Camera(camera_id, addr)
                        if self.on_camera_connect:
                            self.on_camera_connect(camera_id, addr)
                    
                    camera = self.cameras[camera_id]
                    camera.last_seen = time.time()
                    
                    # Process received data
                    try:
                        metadata = data[:24]
                        img_data = data[24:]
                        
                        camera.surveillance_mode = bool(metadata[4])
                        camera.frame_number = int.from_bytes(metadata[5:9], byteorder='big')
                        
                        # Decode image
                        img_np = np.frombuffer(img_data, dtype=np.uint8)
                        frame = cv2.imdecode(img_np, cv2.IMREAD_COLOR)
                        
                        if frame is not None:
                            camera.update_frame(frame)
                            
                    except Exception as e:
                        print(f"Error processing frame from camera {camera_id}: {e}")
                        
            except Exception as e:
                print(f"Error receiving packet: {e}")
                
    def _process_frames(self):
        """Process frames from all cameras"""
        while self.running:
            with self.cameras_lock:
                cameras = list(self.cameras.values())
                
            for camera in cameras:
                frame = camera.get_frame()
                if frame is None:
                    continue
                    
                # Process frame with YOLO
                start_time = time.time()
                detections = self.detector.process_frame(camera.id, frame)
                end_time = time.time()
                
                # Track processing time
                processing_time = end_time - start_time
                self.processing_times.append(processing_time)
                if len(self.processing_times) > 100:
                    self.processing_times.pop(0)
                    
                # Store and notify results
                camera.last_results = detections
                if self.on_detection:
                    for detection in detections:
                        self.on_detection(detection)
                        
            time.sleep(0.01)
            
    def _cleanup_inactive_cameras(self):
        """Remove inactive cameras"""
        TIMEOUT = 10  # seconds
        
        while self.running:
            current_time = time.time()
            to_remove = []
            
            with self.cameras_lock:
                for camera_id, camera in self.cameras.items():
                    if current_time - camera.last_seen > TIMEOUT:
                        to_remove.append(camera_id)
                        
                for camera_id in to_remove:
                    if self.on_camera_disconnect:
                        self.on_camera_disconnect(camera_id)
                    del self.cameras[camera_id]
                    
            time.sleep(1)
            
    def _print_stats(self):
        """Print server statistics periodically"""
        while self.running:
            uptime = time.time() - self.start_time
            hours, remainder = divmod(uptime, 3600)
            minutes, seconds = divmod(remainder, 60)
            
            avg_processing = sum(self.processing_times) / max(1, len(self.processing_times)) * 1000
            
            with self.cameras_lock:
                camera_count = len(self.cameras)
                camera_modes = [
                    f"Camera {c.id}: {'surveillance' if c.surveillance_mode else 'normal'}"
                    for c in self.cameras.values()
                ]
                
            print("-" * 50)
            print(f"Server Statistics:")
            print(f"Uptime: {int(hours):02d}:{int(minutes):02d}:{int(seconds):02d}")
            print(f"Connected cameras: {camera_count}")
            print("Camera modes:")
            for mode in camera_modes:
                print(f"  {mode}")
            print(f"Average processing time: {avg_processing:.2f}ms")
            print("-" * 50)
            
            time.sleep(30)
            
    def set_camera_mode(self, camera_id: int, surveillance_mode: bool):
        """Send mode change command to a specific camera"""
        with self.cameras_lock:
            if camera_id in self.cameras:
                camera = self.cameras[camera_id]
                self.network.send_command(
                    camera.addr,
                    cmd_type=1,  # Mode change command
                    camera_id=camera_id,
                    data=bytes([1 if surveillance_mode else 0])
                )
