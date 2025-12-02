# SSL Certificates

This directory contains self-signed SSL certificates for local HTTPS development.

## Regenerating Certificates

If you need to regenerate certificates (e.g., if your IP address changes), run:

```bash
cd certs
openssl req -x509 -newkey rsa:4096 -keyout key.pem -out cert.pem -days 365 -nodes \
  -subj "/C=US/ST=State/L=City/O=AR-F1/CN=YOUR_IP" \
  -addext "subjectAltName=IP:YOUR_IP,IP:127.0.0.1,DNS:localhost"
```

Replace `YOUR_IP` with your actual local IP address.
## Security Note

These are self-signed certificates for development only. Browsers will show a security warning - this is expected and safe for local development.

