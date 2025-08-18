# Exponer Backend a Internet (ngrok/Apache)

Objetivo: que el backend Flask (actualmente en LAN, ej. `10.2.0.2:8001`) sea accesible desde cualquier lugar, con HTTPS/WSS para la app Android y el frontend.

## Opción 1: Túnel con ngrok (rápido)

1. Instalar y autenticar
```bash
# Windows (PowerShell)
choco install ngrok
ngrok config add-authtoken <TU_AUTH_TOKEN>
```

2. Exponer backend HTTP 8001
```bash
ngrok http http://127.0.0.1:8001
```

3. Obtener URL pública
- ngrok mostrará una URL del tipo `https://<subdominio>.ngrok.io`
- Usar esa URL para WebSocket y API en frontend (`VITE_BACKEND_URL`) y en cualquier cliente externo.

4. Frontend (React)
- En `.env` o variables de entorno, setear:
```
VITE_BACKEND_URL=https://<subdominio>.ngrok.io
```

5. Android
- Para la app nativa no es requerido el backend para el pipeline de voz (usa OpenAI directo), pero si necesitas Admin/metrics, usa HTTPS/WSS hacia la URL pública.
- Si necesitas HTTP en desarrollo, añade `network_security_config.xml` y referéncialo en el `AndroidManifest.xml` (solo dev).

## Opción 2: Apache Reverse Proxy (estable)

1. Habilitar módulos (Linux)
```bash
sudo a2enmod proxy proxy_http proxy_wstunnel ssl headers
```

2. VirtualHost (HTTPS + proxy)
```apache
<VirtualHost *:443>
    ServerName api.tudominio.com

    SSLEngine on
    SSLCertificateFile /etc/letsencrypt/live/api.tudominio.com/fullchain.pem
    SSLCertificateKeyFile /etc/letsencrypt/live/api.tudominio.com/privkey.pem

    # Backend Flask local
    ProxyPass / http://127.0.0.1:8001/
    ProxyPassReverse / http://127.0.0.1:8001/

    # WebSocket (si aplica)
    ProxyPass "/socket.io/"  "http://127.0.0.1:8001/socket.io/" upgrade=WebSocket retry=0
    ProxyPassReverse "/socket.io/"  "http://127.0.0.1:8001/socket.io/"

    RequestHeader set X-Forwarded-Proto "https"
    RequestHeader set X-Forwarded-For "%{REMOTE_ADDR}s"
    Header always set Strict-Transport-Security "max-age=63072000; includeSubDomains; preload"
</VirtualHost>
```

3. DNS y certificados
- Apunta `api.tudominio.com` a tu servidor público
- Emite certificados con Let’s Encrypt (`certbot`)

4. Cortafuegos
- Abrir puerto 443

## Android: Network Security (solo desarrollo)

Para permitir HTTP cleartext hacia IPs LAN durante desarrollo:

1. Crear `res/xml/network_security_config.xml`:
```xml
<network-security-config>
    <domain-config cleartextTrafficPermitted="true">
        <domain includeSubdomains="true">10.0.2.2</domain>
        <domain includeSubdomains="true">192.168.0.0/16</domain>
    </domain-config>
</network-security-config>
```

2. En `AndroidManifest.xml` (application):
```xml
<application
    android:networkSecurityConfig="@xml/network_security_config"
    ...>
</application>
```

Nota: En producción, usa siempre HTTPS y elimina `cleartextTrafficPermitted`.

## Frontend: URLs

- Variable clave: `VITE_BACKEND_URL`
- WS URL derivada: `${VITE_BACKEND_URL}/socket.io/` (si aplicara Socket.IO)
- Health: `${VITE_BACKEND_URL}/health`

## Checklist Producción

- [ ] Dominio con HTTPS válido (Let’s Encrypt)
- [ ] Reverse proxy configurado (Apache/Nginx)
- [ ] CORS y headers seguros
- [ ] Logs y rate-limiting básicos
- [ ] Backups/monitorización (UptimeRobot)

## Troubleshooting

- Conexión desde Android falla en móvil pero no en WiFi
  - Verifica que sea HTTPS válido (no self-signed)
  - Verifica puertos abiertos y DNS
- 403/404 desde proxy
  - Revisa rutas base y `ProxyPass`/`ProxyPassReverse`
- WebSocket no conecta
  - Habilita `proxy_wstunnel` y usa `wss://` en cliente

## Referencias
- ngrok: https://ngrok.com/docs
- Apache: https://httpd.apache.org/docs/
- Android Network Security: https://developer.android.com/training/articles/security-config
