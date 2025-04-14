/**
 * ESP32-CAM UDP Client for YOLO Processing
 * Captures and sends camera frames to a Python server for object detection
 */

#include "esp_camera.h"
#include "WiFi.h"
#include "WiFiUdp.h"

// WiFi credentials
const char* ssid = "YOUR_WIFI_SSID";
const char* password = "YOUR_WIFI_PASSWORD";

// Server details
const char* serverIP = "192.168.1.100";  // Change to your server IP
const int serverPort = 8090;

// Camera ID (should be unique for each camera)
const uint32_t CAMERA_ID = 1;  // Change this for each camera

// Operating modes
bool surveillanceMode = false;
const unsigned long normalInterval = 1000;     // 1fps
const unsigned long surveillanceInterval = 67; // ~15fps
unsigned long lastFrameTime = 0;
unsigned long frameInterval = normalInterval;
uint32_t frameNumber = 0;

// Camera configuration
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

// UDP client
WiFiUDP udp;

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
  
  Serial.println("\nWiFi connected");
  Serial.println("IP address: " + WiFi.localIP().toString());
  
  // Start UDP
  udp.begin(WiFi.localIP(), serverPort);
  
  // Initialize LED
  pinMode(4, OUTPUT);
}

void loop() {
  unsigned long currentTime = millis();
  
  // Check if it's time to send a frame
  if (currentTime - lastFrameTime >= frameInterval) {
    captureAndSendFrame();
    lastFrameTime = currentTime;
    
    // Blink LED to indicate frame sent
    digitalWrite(4, HIGH);
    delay(5);
    digitalWrite(4, LOW);
  }
  
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
  
  // Initial camera settings
  config.frame_size = FRAMESIZE_VGA;
  config.jpeg_quality = 12;
  config.fb_count = 1;
  
  esp_err_t err = esp_camera_init(&config);
  if (err != ESP_OK) {
    Serial.printf("Camera init failed with error 0x%x", err);
    return;
  }
  
  setCameraResolution();
}

void setCameraResolution() {
  sensor_t* s = esp_camera_sensor_get();
  if (surveillanceMode) {
    s->set_framesize(s, FRAMESIZE_VGA);  // 640x480
    s->set_quality(s, 12);               // Lower quality for faster transmission
  } else {
    s->set_framesize(s, FRAMESIZE_CIF);  // 400x296
    s->set_quality(s, 20);               // Better quality for still images
  }
}

void setMode(bool newMode) {
  if (surveillanceMode != newMode) {
    surveillanceMode = newMode;
    frameInterval = surveillanceMode ? surveillanceInterval : normalInterval;
    setCameraResolution();
    Serial.println("Switched to " + String(surveillanceMode ? "surveillance" : "normal") + " mode");
  }
}

void captureAndSendFrame() {
  camera_fb_t* fb = esp_camera_fb_get();
  if (!fb) {
    Serial.println("Camera capture failed");
    return;
  }
  
  // Prepare metadata (24 bytes - added 4 bytes for camera ID)
  uint8_t metadata[24] = {0};
  
  // Camera ID (4 bytes)
  metadata[0] = (CAMERA_ID >> 24) & 0xFF;
  metadata[1] = (CAMERA_ID >> 16) & 0xFF;
  metadata[2] = (CAMERA_ID >> 8) & 0xFF;
  metadata[3] = CAMERA_ID & 0xFF;
  
  // Mode flag
  metadata[4] = surveillanceMode ? 1 : 0;
  
  // Frame number (4 bytes)
  metadata[5] = (frameNumber >> 24) & 0xFF;
  metadata[6] = (frameNumber >> 16) & 0xFF;
  metadata[7] = (frameNumber >> 8) & 0xFF;
  metadata[8] = frameNumber & 0xFF;
  
  // Timestamp (8 bytes)
  uint64_t timestamp = millis();
  for (int i = 0; i < 8; i++) {
    metadata[9 + i] = (timestamp >> (8 * (7 - i))) & 0xFF;
  }
  
  // Image size (4 bytes)
  uint32_t imgSize = fb->len;
  metadata[17] = (imgSize >> 24) & 0xFF;
  metadata[18] = (imgSize >> 16) & 0xFF;
  metadata[19] = (imgSize >> 8) & 0xFF;
  metadata[20] = imgSize & 0xFF;
  
  // Send UDP packet
  udp.beginPacket(serverIP, serverPort);
  udp.write(metadata, 24);
  
  // Send image data in chunks
  const size_t MAX_CHUNK = 1024;
  size_t bytesWritten = 0;
  
  while (bytesWritten < fb->len) {
    size_t bytesToWrite = min(MAX_CHUNK, fb->len - bytesWritten);
    udp.write(fb->buf + bytesWritten, bytesToWrite);
    bytesWritten += bytesToWrite;
  }
  
  udp.endPacket();
  
  esp_camera_fb_return(fb);
  frameNumber++;
  
  Serial.printf("Camera %u: Frame %u sent in %s mode, size: %u bytes\n", 
                CAMERA_ID,
                frameNumber, 
                surveillanceMode ? "surveillance" : "normal", 
                imgSize + 24);
}
