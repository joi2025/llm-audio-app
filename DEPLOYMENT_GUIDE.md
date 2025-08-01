# 🚀 GUÍA DE DESPLIEGUE - LLM AUDIO APP

## 📋 INSTRUCCIONES RÁPIDAS

### 1. Verificar Sistema
```bash
health-check.bat
```

### 2. Desplegar Todo
```bash
deploy.bat
```

### 3. Detener Todo
```bash
cleanup.bat
```

## 🎯 ESTRUCTURA DE ARCHIVOS CREADOS

```
llm-audio-app/
├── deploy.bat          # Script principal de despliegue
├── cleanup.bat         # Script de parada y limpieza
├── health-check.bat    # Verificación de salud del sistema
├── DEPLOYMENT_GUIDE.md # Esta guía
├── frontend/
│   ├── start.bat       # Inicio rápido frontend
│   ├── start.sh        # Inicio rápido Linux/Mac
│   └── README.md       # Documentación frontend
└── backend/            # Backend (verificar existencia)
    └── requirements.txt # Dependencias Python
```

## 🔧 FLUJO DE EJECUCIÓN

1. **health-check.bat** - Verifica todo está instalado
2. **deploy.bat** - Ejecuta todo automáticamente:
   - Verifica herramientas
   - Busca archivos necesarios
   - Instala dependencias
   - Levanta Docker services
   - Inicia backend (uvicorn)
   - Inicia frontend (npm run dev)

3. **cleanup.bat** - Limpia todo cuando termines

## 📍 URLs DE ACCESO
- **Frontend**: http://localhost:5173
- **Backend**: http://localhost:8000
- **API Docs**: http://localhost:8000/docs (Swagger)

## 🚨 SOLUCIÓN DE PROBLEMAS

### Error: "Command not found"
- Ejecuta health-check.bat primero
- Instala las herramientas faltantes

### Error: "Port already in use"
- Ejecuta cleanup.bat
- Reinicia tu computadora si persiste

### Error: "Docker not found"
- Instala Docker Desktop
- Asegúrate de tener Docker Compose

## 📞 CONTACTO
Si tienes problemas:
1. Ejecuta health-check.bat y comparte los resultados
2. Verifica los logs en las ventanas CMD abiertas
3. Contacta al equipo de desarrollo con los errores específicos

## ✅ VERIFICACIÓN FINAL
Después de ejecutar deploy.bat, verifica:
1. Abre http://localhost:5173 en tu navegador
2. Abre http://localhost:8000/docs para ver la API
3. Prueba grabar audio y obtener respuesta

¡Todo listo para ejecutar!
