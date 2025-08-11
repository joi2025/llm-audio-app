from app import create_app

app = create_app()

if __name__ == "__main__":
    port = app.config.get('PORT', 8001)
    # Enable threaded to allow concurrent WS/HTTP during dev
    app.run(host="0.0.0.0", port=port, debug=True, threaded=True)
