
#include "camera_module.h"
#include "network_manager.h"

// Configuration
const char* WIFI_SSID = "YOUR_WIFI_SSID";
const char* WIFI_PASSWORD = "YOUR_WIFI_PASSWORD";
const char* SERVER_IP = "192.168.1.100";
const int SERVER_PORT = 8090;
const uint32_t CAMERA_ID = 1;  // Unique ID for this camera

// Operating modes
bool surveillanceMode = false;
const unsigned long normalInterval = 1000;     // 1fps
const unsigned long surveillanceInterval = 67; // ~15fps
unsigned long lastFrameTime = 0;
unsigned long frameInterval = normalInterval;
uint32_t frameNumber = 0;

// Objects
NetworkManager* network = nullptr;

void processCommand(uint8_t* data, size_t len) {
    if (len < 6) return;  // Minimum command length
    
    uint8_t cmdType = data[0];
    uint32_t targetCamId = (data[1] << 24) | (data[2] << 16) | (data[3] << 8) | data[4];
    
    if (targetCamId != CAMERA_ID) return;
    
    switch (cmdType) {
        case 1:  // Mode change command
            if (len >= 6) {
                bool newMode = data[5] == 1;
                setMode(newMode);
            }
            break;
    }
}

void setMode(bool newMode) {
    if (surveillanceMode != newMode) {
        surveillanceMode = newMode;
        frameInterval = surveillanceMode ? surveillanceInterval : normalInterval;
        CameraModule::setCameraResolution(surveillanceMode);
        Serial.println("Switched to " + String(surveillanceMode ? "surveillance" : "normal") + " mode");
    }
}

void setup() {
    Serial.begin(115200);
    Serial.println("ESP32-CAM UDP Client");
    
    // Initialize camera
    if (!CameraModule::init()) {
        Serial.println("Camera init failed");
        return;
    }
    
    // Initialize network
    network = new NetworkManager(WIFI_SSID, WIFI_PASSWORD, SERVER_IP, SERVER_PORT);
    if (!network->connect()) {
        Serial.println("Network connection failed");
        return;
    }
    
    Serial.println("Camera and network initialized");
    pinMode(4, OUTPUT);  // LED pin
}

void loop() {
    if (!network) return;
    
    unsigned long currentTime = millis();
    
    // Check for commands
    uint8_t cmdBuffer[32];
    size_t bytesRead;
    if (network->checkForCommands(cmdBuffer, sizeof(cmdBuffer), &bytesRead)) {
        processCommand(cmdBuffer, bytesRead);
    }
    
    // Capture and send frame if interval has elapsed
    if (currentTime - lastFrameTime >= frameInterval) {
        camera_fb_t* fb = CameraModule::captureFrame();
        if (fb) {
            if (network->sendFrame(CAMERA_ID, surveillanceMode, frameNumber, fb->buf, fb->len)) {
                frameNumber++;
                
                // Blink LED to indicate frame sent
                digitalWrite(4, HIGH);
                delay(5);
                digitalWrite(4, LOW);
            }
            CameraModule::releaseFrame(fb);
        }
        lastFrameTime = currentTime;
    }
    
    delay(5);  // Small delay to prevent CPU hogging
}
