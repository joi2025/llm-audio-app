package com.joi2025.llmaudioapp.data.repository

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
import com.joi2025.llmaudioapp.BuildConfig
import com.joi2025.llmaudioapp.data.model.ConnectionState
import com.joi2025.llmaudioapp.viewmodel.WebSocketMessage
import kotlinx.serialization.json.*
import android.util.Log
import android.util.Base64

/**
 * WebSocketRepository - Native WebSocket implementation
 * Replaces Socket.IO with pure WebSocket for better Android compatibility
 */
@Singleton
class WebSocketRepository @Inject constructor() {
    
    private val scope = CoroutineScope(Dispatchers.IO)
    private var webSocketClient: WebSocketClient? = null
    
    private val _connectionState = MutableStateFlow(ConnectionState.DISCONNECTED)
    val connectionState: StateFlow<ConnectionState> = _connectionState.asStateFlow()
    
    private val _messages = Channel<WebSocketMessage>(Channel.UNLIMITED)
    val messages: Flow<WebSocketMessage> = _messages.receiveAsFlow()
    
    private val json = Json { 
        ignoreUnknownKeys = true
        isLenient = true
    }
    
    fun connect() {
        if (webSocketClient?.isOpen == true) return
        
        _connectionState.value = ConnectionState.CONNECTING
        
        try {
            val uri = URI("${BuildConfig.BACKEND_URL.replace("http", "ws")}/socket.io/?EIO=4&transport=websocket")
            
            webSocketClient = object : WebSocketClient(uri) {
                override fun onOpen(handshake: ServerHandshake?) {
                    Log.d("WebSocket", "Connected to backend")
                    _connectionState.value = ConnectionState.CONNECTED
                    
                    // Send Socket.IO handshake
                    send("40") // Socket.IO connect packet
                }
                
                override fun onMessage(message: String) {
                    handleMessage(message)
                }
                
                override fun onClose(code: Int, reason: String?, remote: Boolean) {
                    Log.d("WebSocket", "Disconnected: $reason")
                    _connectionState.value = ConnectionState.DISCONNECTED
                    
                    // Auto-reconnect after delay
                    scope.launch {
                        kotlinx.coroutines.delay(2000)
                        if (_connectionState.value == ConnectionState.DISCONNECTED) {
                            reconnect()
                        }
                    }
                }
                
                override fun onError(ex: Exception?) {
                    Log.e("WebSocket", "Error: ${ex?.message}")
                    _connectionState.value = ConnectionState.ERROR
                    scope.launch {
                        _messages.send(WebSocketMessage("error", ex?.message))
                    }
                }
            }
            
            webSocketClient?.connect()
            
        } catch (e: Exception) {
            Log.e("WebSocket", "Connection failed: ${e.message}")
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
                    val jsonArray = json.parseToJsonElement(jsonPart).jsonArray
                    val eventType = jsonArray[0].jsonPrimitive.content
                    val eventData = if (jsonArray.size > 1) jsonArray[1] else null
                    
                    scope.launch {
                        _messages.send(WebSocketMessage(eventType, parseEventData(eventData)))
                    }
                }
                message == "2" -> {
                    // Ping - respond with pong
                    webSocketClient?.send("3")
                }
            }
        } catch (e: Exception) {
            Log.e("WebSocket", "Message parsing error: ${e.message}")
        }
    }
    
    private fun parseEventData(data: JsonElement?): Any? {
        return when (data) {
            is JsonObject -> {
                // Convert to map for easier handling
                val map = mutableMapOf<String, Any>()
                data.jsonObject.forEach { (key, value) ->
                    map[key] = when (value) {
                        is JsonPrimitive -> {
                            when {
                                value.isString -> value.content
                                else -> value.toString()
                            }
                        }
                        else -> value.toString()
                    }
                }
                map
            }
            is JsonPrimitive -> {
                when {
                    data.isString -> data.content
                    else -> data.toString()
                }
            }
            else -> data?.toString()
        }
    }
    
    fun sendMessage(event: String, data: Map<String, Any>) {
        if (webSocketClient?.isOpen != true) {
            Log.w("WebSocket", "Cannot send message - not connected")
            return
        }
        
        try {
            val jsonData = Json.encodeToString(
                JsonArray(listOf(
                    JsonPrimitive(event),
                    Json.encodeToJsonElement(data)
                ))
            )
            webSocketClient?.send("42$jsonData")
        } catch (e: Exception) {
            Log.e("WebSocket", "Send message error: ${e.message}")
        }
    }
    
    fun sendAudio(audioData: ByteArray) {
        val base64Audio = Base64.encodeToString(audioData, Base64.NO_WRAP)
        sendMessage("audio_chunk", mapOf("data" to base64Audio))
    }
    
    fun reconnect() {
        _connectionState.value = ConnectionState.RECONNECTING
        webSocketClient?.close()
        connect()
    }
    
    fun disconnect() {
        webSocketClient?.close()
        _connectionState.value = ConnectionState.DISCONNECTED
    }
}
