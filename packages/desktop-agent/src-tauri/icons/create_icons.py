import struct
import zlib

def create_tiny_png():
    # Minimal 1x1 purple PNG
    sig = b'\x89PNG\r\n\x1a\n'
    ihdr_data = struct.pack('>IIBBBBB', 1, 1, 8, 2, 0, 0, 0)
    ihdr = struct.pack('>I', 13) + b'IHDR' + ihdr_data
    ihdr += struct.pack('>I', zlib.crc32(ihdr[4:]))
    
    idat_data = zlib.compress(b'\x00\x66\x7e\xea')  # Purple pixel
    idat = struct.pack('>I', len(idat_data)) + b'IDAT' + idat_data
    idat += struct.pack('>I', zlib.crc32(idat[4:]))
    
    iend = struct.pack('>I', 0) + b'IEND' + struct.pack('>I', zlib.crc32(b'IEND'))
    
    return sig + ihdr + idat + iend

png = create_tiny_png()
for name in ['32x32.png', '128x128.png', '128x128@2x.png', 'icon.icns', 'icon.ico']:
    with open(name, 'wb') as f:
        f.write(png)
print("Done")
