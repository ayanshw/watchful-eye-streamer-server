
import argparse
from .server import YOLOServer

def main():
    parser = argparse.ArgumentParser(description="YOLO Processing Server for Multiple ESP32-CAMs")
    parser.add_argument("--ip", default="0.0.0.0", help="IP address to bind to")
    parser.add_argument("--port", type=int, default=8090, help="UDP port to listen on")
    parser.add_argument("--model", default="yolov8n.pt", help="Path to YOLO model")
    args = parser.parse_args()
    
    server = YOLOServer(args.ip, args.port, args.model)
    
    # Example callback setup
    def on_camera_connect(camera_id: int, addr: tuple[str, int]):
        print(f"Camera {camera_id} connected from {addr}")
    
    def on_camera_disconnect(camera_id: int):
        print(f"Camera {camera_id} disconnected")
    
    def on_detection(detection: dict):
        print(f"Camera {detection['camera_id']}: Detected {detection['class']} with {detection['confidence']:.2f} confidence")
    
    server.on_camera_connect = on_camera_connect
    server.on_camera_disconnect = on_camera_disconnect
    server.on_detection = on_detection
    
    server.start()

if __name__ == "__main__":
    main()
