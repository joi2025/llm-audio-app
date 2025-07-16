import uvicorn

if __name__ == "__main__":
    # Usar 'main:app' como string permite que uvicorn gestione la recarga (reload=True)
    uvicorn.run("main:app", host="0.0.0.0", port=8001, reload=True)
