package com.llmaudio.app.data.repository

import kotlinx.coroutines.flow.*
import kotlinx.coroutines.channels.Channel
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import org.java_websocket.client.WebSocketClient
import org.java_websocket.handshake.ServerHandshake
import java.net.URI
import javax.inject.Inject
import javax.inject.Singleton
import com.llmaudio.app.data.model.ConnectionState
import com.llmaudio.app.data.model.WebSocketMessage
import com.google.gson.*
import android.util.Log
import android.util.Base64
import dagger.hilt.android.scopes.ServiceScoped

/**
 * WebSocketRepository - Native WebSocket implementation for android-elite
 * Migrated from android-native with Hilt DI integration
 * Replaces Socket.IO with pure WebSocket for better Android compatibility
 */
@Singleton
class WebSocketRepository @Inject constructor() {
    
    private val scope = CoroutineScope(Dispatchers.IO)
    private var webSocketClient: WebSocketClient? = null
    
    // Default backend URL - can be overridden via configuration
    private val backendUrl = "ws://192.168.29.31:8001"
    
    private val _connectionState = MutableStateFlow(ConnectionState.DISCONNECTED)
    val connectionState: StateFlow<ConnectionState> = _connectionState.asStateFlow()
    
    private val _messages = Channel<WebSocketMessage>(Channel.UNLIMITED)
    val messages: Flow<WebSocketMessage> = _messages.receiveAsFlow()
    
    private val gson = GsonBuilder()
        .setLenient()
        .create()
    
    fun connect() {
        if (webSocketClient?.isOpen == true) return
        
        _connectionState.value = ConnectionState.CONNECTING
        
        try {
            val uri = URI("$backendUrl/socket.io/?EIO=4&transport=websocket")
            
            webSocketClient = object : WebSocketClient(uri) {
                override fun onOpen(handshake: ServerHandshake?) {
                    Log.d("WebSocket", "Connected to backend at $backendUrl")
                    _connectionState.value = ConnectionState.CONNECTED
                    
                    // Send Socket.IO handshake
                    send("40") // Socket.IO connect packet
                }
                
                override fun onMessage(message: String) {
                    handleMessage(message)
                }
                
                override fun onClose(code: Int, reason: String?, remote: Boolean) {
                    Log.d("WebSocket", "Disconnected: $reason (code: $code)")
                    _connectionState.value = ConnectionState.DISCONNECTED
                    
                    // Auto-reconnect after delay if not manually disconnected
                    if (code != 1000) { // 1000 = normal closure
                        scope.launch {
                            kotlinx.coroutines.delay(2000)
                            if (_connectionState.value == ConnectionState.DISCONNECTED) {
                                reconnect()
                            }
                        }
                    }
                }
                
                override fun onError(ex: Exception?) {
                    Log.e("WebSocket", "Error: ${ex?.message}", ex)
                    _connectionState.value = ConnectionState.ERROR
                    scope.launch {
                        _messages.send(WebSocketMessage("error", ex?.message))
                    }
                }
            }
            
            webSocketClient?.connect()
            
        } catch (e: Exception) {
            Log.e("WebSocket", "Connection failed: ${e.message}", e)
            _connectionState.value = ConnectionState.ERROR
        }
    }
    
    private fun handleMessage(message: String) {
        try {
            // Handle Socket.IO protocol messages
            when {
                message.startsWith("40") -> {
                    // Connected, start ping/pong
                    scope.launch {
                        _messages.send(WebSocketMessage("connected"))
                    }
                }
                message.startsWith("42") -> {
                    // Socket.IO event message
                    val jsonPart = message.substring(2)
                    val jsonArray = gson.fromJson(jsonPart, JsonArray::class.java)
                    val eventType = jsonArray[0].asString
                    val eventData = if (jsonArray.size() > 1) jsonArray[1] else null
                    
                    scope.launch {
                        _messages.send(WebSocketMessage(eventType, parseEventData(eventData)))
                    }
                }
                message == "2" -> {
                    // Ping - respond with pong
                    webSocketClient?.send("3")
                }
                message == "3" -> {
                    // Pong received
                    Log.v("WebSocket", "Pong received")
                }
            }
        } catch (e: Exception) {
            Log.e("WebSocket", "Message parsing error: ${e.message}", e)
        }
    }
    
    private fun parseEventData(data: JsonElement?): Any? {
        return when {
            data == null -> null
            data.isJsonObject -> {
                // Convert to map for easier handling
                val map = mutableMapOf<String, Any>()
                data.asJsonObject.entrySet().forEach { (key, value) ->
                    map[key] = when {
                        value.isJsonPrimitive -> {
                            val primitive = value.asJsonPrimitive
                            when {
                                primitive.isString -> primitive.asString
                                primitive.isNumber -> primitive.asNumber
                                primitive.isBoolean -> primitive.asBoolean
                                else -> primitive.toString()
                            }
                        }
                        else -> value.toString()
                    }
                }
                map
            }
            data.isJsonPrimitive -> {
                val primitive = data.asJsonPrimitive
                when {
                    primitive.isString -> primitive.asString
                    primitive.isNumber -> primitive.asNumber
                    primitive.isBoolean -> primitive.asBoolean
                    else -> primitive.toString()
                }
            }
            else -> data.toString()
        }
    }
    
    fun sendMessage(event: String, data: Map<String, Any>) {
        if (webSocketClient?.isOpen != true) {
            Log.w("WebSocket", "Cannot send message '$event' - not connected")
            return
        }
        
        try {
            val jsonArray = JsonArray().apply {
                add(event)
                add(gson.toJsonTree(data))
            }
            val jsonData = gson.toJson(jsonArray)
            webSocketClient?.send("42$jsonData")
            Log.v("WebSocket", "Sent message: $event")
        } catch (e: Exception) {
            Log.e("WebSocket", "Send message error: ${e.message}", e)
        }
    }
    
    fun sendAudio(audioData: ByteArray) {
        val base64Audio = Base64.encodeToString(audioData, Base64.NO_WRAP)
        sendMessage("audio_chunk", mapOf(
            "data" to base64Audio,
            "timestamp" to System.currentTimeMillis()
        ))
    }
    
    fun sendTranscript(transcript: String) {
        sendMessage("transcript", mapOf(
            "text" to transcript,
            "timestamp" to System.currentTimeMillis()
        ))
    }
    
    fun sendInterruption() {
        sendMessage("stop_tts", mapOf(
            "timestamp" to System.currentTimeMillis()
        ))
    }
    
    fun reconnect() {
        Log.i("WebSocket", "Attempting to reconnect...")
        _connectionState.value = ConnectionState.RECONNECTING
        webSocketClient?.close()
        connect()
    }
    
    fun disconnect() {
        Log.i("WebSocket", "Disconnecting WebSocket")
        webSocketClient?.close(1000, "Manual disconnect")
        _connectionState.value = ConnectionState.DISCONNECTED
    }
    
    fun isConnected(): Boolean = webSocketClient?.isOpen == true
}
