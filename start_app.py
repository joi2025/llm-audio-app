import os
import sys
import subprocess
import webbrowser
from pathlib import Path
import time

def resource_path(relative_path):
    """ Get absolute path to resource, works for dev and for PyInstaller """
    try:
        # PyInstaller creates a temp folder and stores path in _MEIPASS
        base_path = sys._MEIPASS
    except Exception:
        base_path = os.path.abspath(".")
    
    return os.path.join(base_path, relative_path)

def run_backend():
    """ Inicia el servidor backend """
    backend_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "backend")
    os.chdir(backend_dir)
    
    # Usa el intérprete de Python actual
    python_executable = sys.executable or "python"
    
    # Instalar dependencias si es necesario
    print("Instalando dependencias del backend...")
    subprocess.call([python_executable, "-m", "pip", "install", "-r", "requirements.txt"])
    
    # Iniciar el servidor
    print("Iniciando el servidor backend...")
    backend_process = subprocess.Popen(
        [python_executable, "-m", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"],
        creationflags=subprocess.CREATE_NEW_CONSOLE
    )
    return backend_process

def run_frontend():
    """ Inicia el servidor frontend """
    frontend_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "frontend")
    os.chdir(frontend_dir)
    
    # Instalar dependencias si es necesario
    print("Instalando dependencias del frontend...")
    subprocess.call(["npm", "install"])
    
    # Construir la aplicación frontend
    print("Construyendo la aplicación frontend...")
    subprocess.call(["npm", "run", "build"])
    
    # Iniciar el servidor de desarrollo
    print("Iniciando el servidor frontend...")
    frontend_process = subprocess.Popen(
        ["npm", "run", "dev", "--", "--port", "5173", "--host"],
        creationflags=subprocess.CREATE_NEW_CONSOLE
    )
    return frontend_process

def main():
    print("Iniciando la aplicación...")
    
    # Iniciar backend
    backend_process = run_backend()
    
    # Dar tiempo al backend para que se inicie
    time.sleep(5)
    
    # Iniciar frontend
    frontend_process = run_frontend()
    
    # Abrir el navegador
    time.sleep(8)  # Esperar a que el servidor frontend se inicie
    webbrowser.open("http://localhost:5173")
    
    try:
        # Mantener el script en ejecución
        print("La aplicación se está ejecutando. Presiona Ctrl+C para salir.")
        while True:
            time.sleep(1)
    except KeyboardInterrupt:
        print("\nDeteniendo la aplicación...")
        backend_process.terminate()
        frontend_process.terminate()
        print("Aplicación detenida.")

if __name__ == "__main__":
    main()
