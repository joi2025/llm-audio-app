# Documentación del Proyecto LLM Audio App

Este repositorio contiene un asistente de voz completo con frontend web, backend Flask y ahora una app Android nativa de alto rendimiento.

## Índice de Documentos

- Android Nativo
  - docs/android/overview-native.md
  - android-elite/README.md
  - android-elite/TESTING_PLAN.md
  - docs/android-build-deploy.md
  - docs/android-native-mods.md

- Web/Capacitor
  - docs/capacitor-integration.md
  - README.md (raíz)

- Backend y Pruebas
  - docs/backend-test-plan.md
  - docs/uat-test-plan.md

- Networking Público (Backend en internet)
  - docs/networking-public.md

## Puntos de Entrada

- Frontend (web): `frontend/` — ver `README.md`
- Backend (Flask): `backend/` — ver `README.md` y scripts `start_*.ps1`
- Android nativo: `android-elite/` — ver `android-elite/README.md`

## Notas

- Mantener `.env` fuera de control de versiones (API Keys)
- Preferir HTTPS/WSS en producción
- Usar `android-elite` como base del cliente nativo Android
