#!/bin/bash

# Get the local IP address
IP=$(ipconfig getifaddr en0 2>/dev/null || ipconfig getifaddr en1 2>/dev/null || echo "127.0.0.1")

echo "Generating SSL certificate for IP: $IP"

cd certs

openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes \
  -subj "/C=US/ST=State/L=City/O=AR-F1/CN=$IP" \
  -addext "subjectAltName=IP:$IP,IP:127.0.0.1,DNS:localhost"

echo "✅ Certificate generated successfully!"
echo "Access your app at: https://$IP:5173"

