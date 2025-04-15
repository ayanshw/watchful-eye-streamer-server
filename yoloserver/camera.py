
from datetime import datetime
import threading
import time
from typing import Dict, List, Any, Optional, Tuple

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
        
    def update_frame(self, frame):
        with self.last_frame_lock:
            self.last_frame = frame
            
    def get_frame(self):
        with self.last_frame_lock:
            return self.last_frame.copy() if self.last_frame is not None else None
