const { checkAndFreePort } = require('./startup_checks');
const { exec } = require('child_process');

async function startServer() {
  try {
    // Verificar y liberar puerto 3001
    await checkAndFreePort(3001);
    
    // Intentar iniciar el servidor
    exec('npm run dev', (err, stdout, stderr) => {
      if (err) {
        console.error('Error al iniciar el servidor:', err);
        process.exit(1);
      }
      console.log('Servidor iniciado exitosamente');
    });
  } catch (error) {
    console.error('Error en el proceso de inicio:', error);
    process.exit(1);
  }
}

startServer();
