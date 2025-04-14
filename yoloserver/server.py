import socket
import numpy as np
import cv2
import time
import threading
from datetime import datetime
from ultralytics import YOLO
from typing import List, Dict, Any, Optional, Set

class Camera:
    def __init__(self, camera_id: int, addr: tuple[str, int]):
        self.id = camera_id
        self.addr = addr
        self.last_frame = None
        self.last_frame_lock = threading.Lock()
        self.last_results: List[Dict[str, Any]] = []
        self.surveillance_mode = False
        self.frame_number = 0
        self.last_seen = time.time()

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
        self.cameras: Dict[int, Camera] = {}  # camera_id -> Camera
        self.cameras_lock = threading.Lock()
        self.processing_times: List[float] = []
        
        # Command socket for sending control messages to cameras
        self.cmd_sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        
        # Callbacks
        self.on_detection = None
        self.on_camera_connect = None
        self.on_camera_disconnect = None
    
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
        
        # Start camera cleanup thread
        cleanup_thread = threading.Thread(target=self._cleanup_inactive_cameras)
        cleanup_thread.daemon = True
        cleanup_thread.start()
        
        try:
            while self.running:
                data, addr = self.sock.recvfrom(65535)  # Max UDP packet size
                
                # Extract camera ID from metadata
                camera_id = int.from_bytes(data[0:4], byteorder='big')
                
                with self.cameras_lock:
                    if camera_id not in self.cameras:
                        self.cameras[camera_id] = Camera(camera_id, addr)
                        print(f"[+] New camera {camera_id} connected from {addr}")
                        if self.on_camera_connect:
                            self.on_camera_connect(camera_id, addr)
                    
                    camera = self.cameras[camera_id]
                    camera.last_seen = time.time()
                    
                    # Process the received image data
                    try:
                        # Extract metadata (now 24 bytes)
                        metadata = data[:24]
                        img_data = data[24:]
                        
                        camera.surveillance_mode = bool(metadata[4])
                        camera.frame_number = int.from_bytes(metadata[5:9], byteorder='big')
                        timestamp = int.from_bytes(metadata[9:17], byteorder='big')
                        img_size = int.from_bytes(metadata[17:21], byteorder='big')
                        
                        # Decode the image
                        img_np = np.frombuffer(img_data, dtype=np.uint8)
                        frame = cv2.imdecode(img_np, cv2.IMREAD_COLOR)
                        
                        if frame is not None:
                            with camera.last_frame_lock:
                                camera.last_frame = frame
                                
                        print(f"Camera {camera_id}: Received frame {camera.frame_number} in {'surveillance' if camera.surveillance_mode else 'normal'} mode")
                        
                    except Exception as e:
                        print(f"[!] Error processing frame from camera {camera_id}: {e}")
        
        except KeyboardInterrupt:
            print("[-] Server shutting down...")
        finally:
            self.running = False
            if self.sock:
                self.sock.close()
    
    def _cleanup_inactive_cameras(self) -> None:
        """Remove cameras that haven't sent data in a while"""
        TIMEOUT = 10  # seconds
        
        while self.running:
            current_time = time.time()
            to_remove = []
            
            with self.cameras_lock:
                for camera_id, camera in self.cameras.items():
                    if current_time - camera.last_seen > TIMEOUT:
                        to_remove.append(camera_id)
                
                for camera_id in to_remove:
                    print(f"[-] Camera {camera_id} disconnected (timeout)")
                    if self.on_camera_disconnect:
                        self.on_camera_disconnect(camera_id)
                    del self.cameras[camera_id]
            
            time.sleep(1)
    
    def _process_frames(self) -> None:
        """Process frames from all cameras in a separate thread"""
        while self.running:
            with self.cameras_lock:
                cameras = list(self.cameras.values())
            
            for camera in cameras:
                with camera.last_frame_lock:
                    if camera.last_frame is None:
                        continue
                    frame_to_process = camera.last_frame.copy()
                
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
                            'camera_id': camera.id,
                            'class': name,
                            'confidence': float(conf),
                            'bbox': [int(x1), int(y1), int(x2), int(y2)],
                            'timestamp': datetime.now().isoformat()
                        }
                        detections.append(detection)
                        
                        if self.on_detection:
                            self.on_detection(detection)
                
                camera.last_results = detections
            
            # Sleep briefly to prevent CPU overuse
            time.sleep(0.01)
    
    def _print_stats(self) -> None:
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
    
    def set_camera_mode(self, camera_id: int, surveillance_mode: bool) -> None:
        """Send mode change command to a specific camera"""
        with self.cameras_lock:
            if camera_id in self.cameras:
                camera = self.cameras[camera_id]
                # Create command packet: [CMD_TYPE(1) | camera_id(4) | mode(1)]
                cmd_packet = bytearray([1])  # Command type 1 = mode change
                cmd_packet.extend(camera_id.to_bytes(4, byteorder='big'))
                cmd_packet.append(1 if surveillance_mode else 0)
                
                try:
                    self.cmd_sock.sendto(cmd_packet, camera.addr)
                    print(f"Sent mode change command to Camera {camera_id}: {'surveillance' if surveillance_mode else 'normal'} mode")
                except Exception as e:
                    print(f"Error sending mode command to Camera {camera_id}: {e}")
    
    def stop(self) -> None:
        """Stop the server"""
        self.running = False
        if self.sock:
            self.sock.close()
        if self.cmd_sock:
            self.cmd_sock.close()
