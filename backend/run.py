from app import create_app

app = create_app()

if __name__ == "__main__":
    port = app.config.get('PORT', 8001)
    try:
        # Prefer gevent with WebSocket support
        from gevent import pywsgi
        from geventwebsocket.handler import WebSocketHandler
        print(f"[backend] starting gevent WSGIServer on :{port} (WebSocket enabled)")
        server = pywsgi.WSGIServer(("0.0.0.0", port), app, handler_class=WebSocketHandler)
        server.serve_forever()
    except Exception as e:
        print(f"[backend] gevent not available or failed ({e}); falling back to Flask dev server (WebSocket may fail)")
        app.run(host="0.0.0.0", port=port, debug=True, threaded=True)
