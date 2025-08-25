# Comandos Git para Eliminación Segura de Proyectos Android Obsoletos

## ⚠️ IMPORTANTE: Ejecutar SOLO después de validar android-elite completamente

### 1. Backup de Seguridad (OBLIGATORIO)
```bash
# Crear branch de backup antes de eliminar
git checkout -b backup-before-android-cleanup
git add .
git commit -m "Backup completo antes de eliminar proyectos Android obsoletos"
git push origin backup-before-android-cleanup
```

### 2. Eliminación de Proyectos Obsoletos
```bash
# Eliminar android-native (migrado a android-elite)
git rm -r android-native/
git commit -m "Remove android-native: migrated to android-elite"

# Eliminar android-simple (obsoleto)
git rm -r android-simple/
git commit -m "Remove android-simple: obsolete project"

# Eliminar android-native-fixed (obsoleto)
git rm -r android-native-fixed/
git commit -m "Remove android-native-fixed: obsolete project"

# Eliminar android-nuevo (obsoleto)
git rm -r android-nuevo/
git commit -m "Remove android-nuevo: obsolete project"
```

### 3. Actualizar .gitignore (si es necesario)
```bash
# Remover referencias a proyectos eliminados en .gitignore
# Editar manualmente .gitignore si contiene rutas específicas
git add .gitignore
git commit -m "Update .gitignore: remove obsolete Android project references"
```

### 4. Validación Final
```bash
# Verificar que solo quede android-elite
ls -la | grep android
# Debe mostrar solo: android-elite/

# Verificar estado git
git status
# Debe estar limpio

# Push final
git push origin main
```

### 5. Comandos de Rollback (En caso de emergencia)
```bash
# Si algo sale mal, restaurar desde backup
git checkout backup-before-android-cleanup
git checkout -b restore-android-projects
git cherry-pick <commits-to-restore>
```

## 📋 Checklist de Validación Pre-Eliminación

- [ ] android-elite compila sin errores
- [ ] AdminProScreen funciona correctamente
- [ ] WebSocket se conecta al backend
- [ ] Métricas se muestran en tiempo real
- [ ] Navegación entre pantallas funciona
- [ ] Permisos y privacidad funcionan
- [ ] APK se instala y ejecuta correctamente
- [ ] Backup de seguridad creado

## 🎯 Resultado Esperado

Después de ejecutar estos comandos:
- ✅ Solo `android-elite/` permanece
- ✅ Toda funcionalidad Android consolidada
- ✅ Arquitectura moderna y mantenible
- ✅ Deuda técnica eliminada
- ✅ Backup de seguridad disponible
