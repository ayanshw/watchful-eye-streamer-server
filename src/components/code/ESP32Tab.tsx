import CodeDownloadButton from "./CodeDownloadButton";

const ESP32Tab = () => {
  const downloadESP32Code = () => {
    const esp32Code = `
// ESP32-CAM UDP Client for YOLO Processing Server
// This code sends camera frames to a Python server for YOLO object detection

#include "esp_camera.h"
#include "WiFi.h"
#include "WiFiUdp.h"
#include <ArduinoJson.h>

// WiFi credentials
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// Server details
const char* serverIP = "192.168.1.100";  // Change to your server IP
const int serverPort = 8090;             // UDP port

// Camera pins for ESP32-CAM
#define PWDN_GPIO_NUM     32
#define RESET_GPIO_NUM    -1
#define XCLK_GPIO_NUM      0
#define SIOD_GPIO_NUM     26
#define SIOC_GPIO_NUM     27
#define Y9_GPIO_NUM       35
#define Y8_GPIO_NUM       34
#define Y7_GPIO_NUM       39
#define Y6_GPIO_NUM       36
#define Y5_GPIO_NUM       21
#define Y4_GPIO_NUM       19
#define Y3_GPIO_NUM       18
#define Y2_GPIO_NUM        5
#define VSYNC_GPIO_NUM    25
#define HREF_GPIO_NUM     23
#define PCLK_GPIO_NUM     22

// UDP variables
WiFiUDP udp;
uint32_t frameNumber = 0;

// Control variables
bool surveillanceMode = false;  // Start in normal mode (1fps)
const unsigned long normalInterval = 1000;     // 1 frame per second
const unsigned long surveillanceInterval = 67; // ~15 frames per second
unsigned long lastFrameTime = 0;
unsigned long frameInterval = normalInterval;

void setup() {
  Serial.begin(115200);
  Serial.println("ESP32-CAM UDP Client");
  
  // Initialize camera
  setupCamera();
  
  // Connect to WiFi
  WiFi.begin(ssid, password);
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  
  Serial.println("");
  Serial.println("WiFi connected");
  Serial.print("IP address: ");
  Serial.println(WiFi.localIP());
  
  // Start UDP
  udp.begin(WiFi.localIP(), serverPort);
  Serial.println("UDP client started");
  
  // Initialize the LED pin
  pinMode(4, OUTPUT);
}

void loop() {
  unsigned long currentTime = millis();
  
  // Check if we should send a frame based on current mode
  if (currentTime - lastFrameTime >= frameInterval) {
    captureAndSendFrame();
    lastFrameTime = currentTime;
    
    // Blink LED to indicate frame sent
    digitalWrite(4, HIGH);
    delay(5);
    digitalWrite(4, LOW);
  }
  
  // Check for mode change commands from server
  checkForCommands();
  
  // Small delay to prevent CPU hogging
  delay(5);
}

void setupCamera() {
  camera_config_t config;
  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer = LEDC_TIMER_0;
  config.pin_d0 = Y2_GPIO_NUM;
  config.pin_d1 = Y3_GPIO_NUM;
  config.pin_d2 = Y4_GPIO_NUM;
  config.pin_d3 = Y5_GPIO_NUM;
  config.pin_d4 = Y6_GPIO_NUM;
  config.pin_d5 = Y7_GPIO_NUM;
  config.pin_d6 = Y8_GPIO_NUM;
  config.pin_d7 = Y9_GPIO_NUM;
  config.pin_xclk = XCLK_GPIO_NUM;
  config.pin_pclk = PCLK_GPIO_NUM;
  config.pin_vsync = VSYNC_GPIO_NUM;
  config.pin_href = HREF_GPIO_NUM;
  config.pin_sscb_sda = SIOD_GPIO_NUM;
  config.pin_sscb_scl = SIOC_GPIO_NUM;
  config.pin_pwdn = PWDN_GPIO_NUM;
  config.pin_reset = RESET_GPIO_NUM;
  config.xclk_freq_hz = 20000000;
  config.pixel_format = PIXFORMAT_JPEG;
  
  // Frame size and quality
  config.frame_size = FRAMESIZE_VGA;  // 640x480
  config.jpeg_quality = 12;           // 0-63, lower is better quality
  config.fb_count = 1;
  
  // Initialize camera
  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("Camera init failed with error 0x%x", err);
    return;
  }
  
  // Set lower resolution in normal mode to save bandwidth
  setCameraResolution();
}

void setCameraResolution() {
  sensor_t * s = esp_camera_sensor_get();
  if (surveillanceMode) {
    // Higher resolution for surveillance mode
    s->set_framesize(s, FRAMESIZE_VGA); // 640x480
    s->set_quality(s, 12); // Lower quality (0-63) for faster transmission
  } else {
    // Lower resolution for normal mode
    s->set_framesize(s, FRAMESIZE_CIF); // 400x296
    s->set_quality(s, 20); // Better quality for still images
  }
}

void captureAndSendFrame() {
  // Capture a frame
  camera_fb_t * fb = esp_camera_fb_get();
  if (!fb) {
    Serial.println("Camera capture failed");
    return;
  }
  
  // Prepare metadata (20 bytes)
  uint8_t metadata[20] = {0};
  metadata[0] = surveillanceMode ? 1 : 0;
  // Frame number (4 bytes)
  metadata[1] = (frameNumber >> 24) & 0xFF;
  metadata[2] = (frameNumber >> 16) & 0xFF;
  metadata[3] = (frameNumber >> 8) & 0xFF;
  metadata[4] = frameNumber & 0xFF;
  // Timestamp (8 bytes, using millis)
  uint64_t timestamp = millis();
  for (int i = 0; i < 8; i++) {
    metadata[5 + i] = (timestamp >> (8 * (7 - i))) & 0xFF;
  }
  // Image size (4 bytes)
  uint32_t imgSize = fb->len;
  metadata[13] = (imgSize >> 24) & 0xFF;
  metadata[14] = (imgSize >> 16) & 0xFF;
  metadata[15] = (imgSize >> 8) & 0xFF;
  metadata[16] = imgSize & 0xFF;
  // Reserved bytes (3)
  metadata[17] = 0;
  metadata[18] = 0;
  metadata[19] = 0;
  
  // Send UDP packet with metadata + image
  udp.beginPacket(serverIP, serverPort);
  
  // First send metadata
  udp.write(metadata, 20);
  
  // Then send the image data
  size_t bytesWritten = 0;
  const size_t MAX_CHUNK = 1024; // Send in chunks to avoid issues
  
  while (bytesWritten < fb->len) {
    size_t bytesToWrite = min(MAX_CHUNK, fb->len - bytesWritten);
    udp.write(fb->buf + bytesWritten, bytesToWrite);
    bytesWritten += bytesToWrite;
  }
  
  udp.endPacket();
  
  // Free the frame buffer
  esp_camera_fb_return(fb);
  
  // Increment frame counter
  frameNumber++;
  
  Serial.printf("Frame %u sent in %s mode, size: %u bytes\\n", 
                frameNumber, 
                surveillanceMode ? "surveillance" : "normal", 
                imgSize + 20);
}

void checkForCommands() {
  int packetSize = udp.parsePacket();
  
  if (packetSize) {
    char buffer[64];
    int len = udp.read(buffer, sizeof(buffer) - 1);
    
    if (len > 0) {
      buffer[len] = 0; // Null-terminate
      
      DynamicJsonDocument doc(256);
      DeserializationError error = deserializeJson(doc, buffer, len);
      
      if (!error) {
        // Check for mode change command
        if (doc.containsKey("mode")) {
          String mode = doc["mode"].as<String>();
          
          if (mode == "surveillance") {
            surveillanceMode = true;
            frameInterval = surveillanceInterval;
            setCameraResolution();
            Serial.println("Switched to surveillance mode (15fps)");
          } 
          else if (mode == "normal") {
            surveillanceMode = false;
            frameInterval = normalInterval;
            setCameraResolution();
            Serial.println("Switched to normal mode (1fps)");
          }
        }
      }
    }
  }
}
`;

    const element = document.createElement('a');
    const file = new Blob([esp32Code], {type: 'text/plain'});
    element.href = URL.createObjectURL(file);
    element.download = 'esp32_cam_client.ino';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="space-y-4 pt-4">
      <p className="text-sm">
        The ESP32-CAM client captures images and sends them via UDP to the Python server.
      </p>
      <div className="text-xs text-muted-foreground space-y-2">
        <p>Requirements:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li>ESP32-CAM</li>
          <li>Arduino IDE</li>
          <li>ESP32 board support</li>
          <li>ArduinoJson library</li>
        </ul>
      </div>
      <CodeDownloadButton onClick={downloadESP32Code}>
        Download ESP32-CAM Client Code
      </CodeDownloadButton>
    </div>
  );
};

export default ESP32Tab;
