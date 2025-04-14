
import argparse
from .server import YOLOServer

def main():
    parser = argparse.ArgumentParser(description="YOLO Processing Server for ESP32-CAM")
    parser.add_argument("--ip", default="0.0.0.0", help="IP address to bind to")
    parser.add_argument("--port", type=int, default=8090, help="UDP port to listen on")
    parser.add_argument("--model", default="yolov8n.pt", help="Path to YOLO model")
    args = parser.parse_args()
    
    server = YOLOServer(args.ip, args.port, args.model)
    server.start()

if __name__ == "__main__":
    main()
