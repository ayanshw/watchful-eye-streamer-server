
#ifndef NETWORK_MANAGER_H
#define NETWORK_MANAGER_H

#include <WiFi.h>
#include <WiFiUdp.h>

class NetworkManager {
public:
    NetworkManager(const char* ssid, const char* password, const char* serverIP, int serverPort);
    bool connect();
    bool sendFrame(uint32_t cameraId, bool surveillanceMode, uint32_t frameNumber, const uint8_t* data, size_t length);
    bool checkForCommands(uint8_t* buffer, size_t bufferSize, size_t* bytesRead);
    
private:
    const char* ssid;
    const char* password;
    const char* serverIP;
    int serverPort;
    WiFiUDP udp;
};

#endif
