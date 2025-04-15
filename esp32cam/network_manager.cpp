
#include "network_manager.h"

NetworkManager::NetworkManager(
    const char* ssid, 
    const char* password,
    const char* serverIP,
    int serverPort
) : ssid(ssid), password(password), serverIP(serverIP), serverPort(serverPort) {}

bool NetworkManager::connect() {
    WiFi.begin(ssid, password);
    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 20) {
        delay(500);
        attempts++;
    }
    
    if (WiFi.status() == WL_CONNECTED) {
        udp.begin(WiFi.localIP(), serverPort);
        return true;
    }
    return false;
}

bool NetworkManager::sendFrame(
    uint32_t cameraId,
    bool surveillanceMode,
    uint32_t frameNumber,
    const uint8_t* data,
    size_t length
) {
    // Prepare metadata (24 bytes)
    uint8_t metadata[24] = {0};
    
    // Camera ID (4 bytes)
    metadata[0] = (cameraId >> 24) & 0xFF;
    metadata[1] = (cameraId >> 16) & 0xFF;
    metadata[2] = (cameraId >> 8) & 0xFF;
    metadata[3] = cameraId & 0xFF;
    
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
    metadata[17] = (length >> 24) & 0xFF;
    metadata[18] = (length >> 16) & 0xFF;
    metadata[19] = (length >> 8) & 0xFF;
    metadata[20] = length & 0xFF;
    
    // Send packet
    udp.beginPacket(serverIP, serverPort);
    udp.write(metadata, 24);
    
    // Send image data in chunks
    const size_t MAX_CHUNK = 1024;
    size_t bytesWritten = 0;
    
    while (bytesWritten < length) {
        size_t bytesToWrite = min(MAX_CHUNK, length - bytesWritten);
        udp.write(data + bytesWritten, bytesToWrite);
        bytesWritten += bytesToWrite;
    }
    
    return udp.endPacket() == 1;
}

bool NetworkManager::checkForCommands(uint8_t* buffer, size_t bufferSize, size_t* bytesRead) {
    int packetSize = udp.parsePacket();
    if (packetSize > 0 && packetSize <= bufferSize) {
        *bytesRead = udp.read(buffer, bufferSize);
        return true;
    }
    return false;
}
