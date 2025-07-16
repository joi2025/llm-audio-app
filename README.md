# Voice Advance - Instalación y Uso

¡Bienvenido a Voice Advance! Este README te guiará para poner en marcha el sistema completo (backend FastAPI + frontend React) en cualquier PC usando el ZIP exportado.

---

## 1. **Requisitos previos**
- [Docker Desktop](https://www.docker.com/products/docker-desktop/) (incluye Docker Compose)
- (Opcional para desarrollo) Node.js 18+ y Python 3.9+

---

## 2. **Arranque rápido (recomendado)**
1. **Descomprime** el archivo `VoiceAdvance_FULL.zip` en la carpeta que prefieras.
2. **Copia** el archivo `.env.example` a `.env` y revisa las variables (por defecto funciona en local).
3. **Ejecuta el script de arranque:**
   - **En Windows:**
     ```powershell
     ./start_all.ps1
     ```
   - **En Linux/Mac:**
     ```sh
     docker-compose up -d
     # Espera unos segundos y abre manualmente http://localhost:3000
     ```
4. **Abre** [http://localhost:3000](http://localhost:3000) en tu navegador.

---

## 3. **¿Cómo usar la app?**
- En el dashboard, pulsa **“Arrancar y Usar”** para comprobar todos los servicios.
- Si todos están en verde, puedes grabar audio, subirlo y ver la transcripción.
- Los logs del sistema te ayudarán a diagnosticar cualquier problema.

---

## 4. **Solución de problemas**
- **¿Algún servicio en rojo?**
  - Ejecuta `docker ps` para ver si todos los contenedores están corriendo.
  - Consulta logs con `docker-compose logs <servicio>`.
  - Revisa el archivo `.env` y los puertos.
- **¿Error de dependencias?**
  - Ejecuta `npm install` en `frontend` y repite el build.
- **¿Problemas de permisos en Linux/Mac?**
  - Da permisos de ejecución al script: `chmod +x start_all.ps1`

---

## 5. **Estructura del proyecto**
```
VoiceAdvance_FULL.zip
├── backend/ ... (código FastAPI)
├── frontend/ ... (código React)
├── docker-compose.yml
├── start_all.ps1
├── .env.example
├── README.md
└── ...
```

---

## 6. **Flujo básico**
1. Arranca todos los servicios (ver punto 2).
2. Entra al dashboard y verifica el estado de Backend, WebSocket, Redis y PostgreSQL.
3. Graba audio, súbelo y consulta la transcripción.
4. Usa los logs para soporte técnico.

---

## 7. **Contacto y soporte**
- Si tienes dudas, consulta los logs y este README.
- Si necesitas soporte avanzado, comparte los logs del dashboard y de Docker.

¡Listo! ¡Tu sistema Voice Advance está preparado para funcionar en cualquier PC!
