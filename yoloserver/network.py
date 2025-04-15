
import socket
from typing import Optional, Tuple

class UDPNetwork:
    def __init__(self, ip: str, port: int):
        self.ip = ip
        self.port = port
        self.sock: Optional[socket.socket] = None
        self.cmd_sock: Optional[socket.socket] = None
        
    def start(self):
        self.sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        self.sock.bind((self.ip, self.port))
        self.cmd_sock = socket.socket(socket.AF_INET, socket.SOCK_DGRAM)
        
    def stop(self):
        if self.sock:
            self.sock.close()
        if self.cmd_sock:
            self.cmd_sock.close()
            
    def send_command(self, addr: Tuple[str, int], cmd_type: int, camera_id: int, data: bytes):
        if not self.cmd_sock:
            return
            
        cmd_packet = bytearray([cmd_type])
        cmd_packet.extend(camera_id.to_bytes(4, byteorder='big'))
        cmd_packet.extend(data)
        
        try:
            self.cmd_sock.sendto(cmd_packet, addr)
        except Exception as e:
            print(f"Error sending command: {e}")
