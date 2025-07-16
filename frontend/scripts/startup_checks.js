const { exec } = require('child_process');

async function checkAndFreePort(port) {
  return new Promise((resolve, reject) => {
    exec(`netstat -ano | findstr :${port}`, (err, stdout, stderr) => {
      if (err) {
        console.error(`Error al verificar el puerto ${port}:`, err);
        reject(err);
        return;
      }

      if (stdout) {
        const lines = stdout.split('\n');
        for (const line of lines) {
          if (line.trim()) {
            const parts = line.split(' ').filter(Boolean);
            const pid = parts[parts.length - 1];
            console.log(`Puerto ${port} ocupado por PID: ${pid}`);
            
            // Intentar liberar el puerto (solo en Windows)
            exec(`taskkill /F /PID ${pid}`, (err, stdout, stderr) => {
              if (err) {
                console.error(`Error al liberar PID ${pid}:`, err);
                reject(err);
              } else {
                console.log(`PID ${pid} liberado exitosamente`);
                resolve(true);
              }
            });
          }
        }
      } else {
        console.log(`Puerto ${port} está libre`);
        resolve(false);
      }
    });
  });
}

// Exportar función principal
module.exports = {
  checkAndFreePort
};
