
# YOLO Processing Server

A Python UDP server for processing video frames from ESP32-CAM using YOLO object detection.

## Requirements

- Python 3.7+
- OpenCV
- NumPy
- Ultralytics YOLO

## Installation

```bash
pip install -r requirements.txt
```

## Usage

```bash
python -m yoloserver --ip 0.0.0.0 --port 8090
```
