#!/usr/bin/env python3
import http.server
import socketserver
import os

PORT = 8000
DIRECTORY = "dist"

class MyHTTPRequestHandler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=DIRECTORY, **kwargs)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store, no-cache, must-revalidate')
        self.send_header('Access-Control-Allow-Origin', '*')
        super().end_headers()

    def do_GET(self):
        if self.path == '/' or not os.path.exists(os.path.join(DIRECTORY, self.path.lstrip('/'))):
            self.path = '/index.html'
        return http.server.SimpleHTTPRequestHandler.do_GET(self)

print(f"サーバーを起動しています...")
print(f"以下のURLでアクセスしてください:")
print(f"  http://localhost:{PORT}")
print(f"  http://127.0.0.1:{PORT}")

with socketserver.TCPServer(("", PORT), MyHTTPRequestHandler) as httpd:
    print(f"\nポート {PORT} でサーバーが起動しました")
    httpd.serve_forever()