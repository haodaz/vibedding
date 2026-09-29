# 读串口几秒：python tools/serial-read.py <端口> [波特率] [秒数]   （用 PlatformIO 自带的 python，它有 pyserial）
import sys, time, serial
port = sys.argv[1]; baud = int(sys.argv[2]) if len(sys.argv) > 2 else 115200; secs = float(sys.argv[3]) if len(sys.argv) > 3 else 3
s = serial.Serial(port, baud, timeout=0.3)
t0 = time.time(); out = b''
while time.time() - t0 < secs:
    out += s.read(512)
s.close()
sys.stdout.write(out.decode('utf-8', 'replace'))
