package com.llmaudio.app.domain.audio

import android.content.Context
import android.media.AudioAttributes
import android.media.AudioFocusRequest
import android.media.AudioManager
import android.media.MediaPlayer
import android.os.Build
import dagger.hilt.android.qualifiers.ApplicationContext
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.Job
import kotlinx.coroutines.flow.MutableStateFlow
import kotlinx.coroutines.flow.StateFlow
import kotlinx.coroutines.flow.asStateFlow
import kotlinx.coroutines.launch
import java.io.File
import java.io.FileOutputStream
import java.io.InputStream
import java.util.PriorityQueue
import javax.inject.Inject
import javax.inject.Singleton

data class PlaylistItem(
    val inputStream: InputStream,
    val text: String,
    val priority: Int,
    val tempFile: File // Archivo temporal para MediaPlayer
) : Comparable<PlaylistItem> {
    override fun compareTo(other: PlaylistItem): Int {
        return this.priority.compareTo(other.priority)
    }
}

@Singleton
class AudioPlayerImpl @Inject constructor(
    @ApplicationContext private val context: Context
) : AudioPlayer, AudioManager.OnAudioFocusChangeListener {

    private val playbackScope = CoroutineScope(Dispatchers.Main + Job())
    private val audioManager = context.getSystemService(Context.AUDIO_SERVICE) as AudioManager

    private val _queueSize = MutableStateFlow(0)
    override val queueSize: StateFlow<Int> = _queueSize.asStateFlow()

    private var playbackListener: AudioPlayer.PlaybackListener? = null
    private val audioQueue = PriorityQueue<PlaylistItem>()
    private var mediaPlayer: MediaPlayer? = null
    private var currentItem: PlaylistItem? = null

    private var audioFocusRequest: AudioFocusRequest? = null
    private var hasAudioFocus = false
    private var playWhenAudioFocusGranted = false // Para reanudar después de una pérdida temporal

    init {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            audioFocusRequest = AudioFocusRequest.Builder(AudioManager.AUDIOFOCUS_GAIN).run {
                setAudioAttributes(AudioAttributes.Builder().run {
                    setUsage(AudioAttributes.USAGE_MEDIA)
                    setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                    build()
                })
                setAcceptsDelayedFocusGain(true)
                setOnAudioFocusChangeListener(this@AudioPlayerImpl)
                build()
            }
        }
    }

    override fun setPlaybackListener(listener: AudioPlayer.PlaybackListener?) {
        this.playbackListener = listener
    }

    override fun enqueueStream(inputStream: InputStream, text: String, priority: Int) {
        val tempFile = File.createTempFile("audio_stream", ".tmp", context.cacheDir)
        tempFile.deleteOnExit()

        try {
            FileOutputStream(tempFile).use { fos -> inputStream.copyTo(fos) }
            inputStream.close()

            val playlistItem = PlaylistItem(
                inputStream = java.io.FileInputStream(tempFile),
                text = text,
                priority = priority,
                tempFile = tempFile
            )

            synchronized(audioQueue) {
                audioQueue.add(playlistItem)
                _queueSize.value = audioQueue.size
            }
            playbackScope.launch {
                if (!isPlaying() && audioQueue.peek() == playlistItem) { // Si no hay nada sonando y este es el próximo
                    playNextInternal()
                }
            }
        } catch (e: Exception) {
            playbackListener?.onError("Error al encolar stream: ${e.localizedMessage}")
            tempFile.delete()
            try { inputStream.close() } catch (ex: Exception) { /* Ignorar */ }
        }
    }

    private fun requestAudioFocus(): Boolean {
        if (hasAudioFocus) return true
        val result = if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            audioFocusRequest?.let { audioManager.requestAudioFocus(it) }
        } else {
            @Suppress("DEPRECATION")
            audioManager.requestAudioFocus(
                this,
                AudioManager.STREAM_MUSIC,
                AudioManager.AUDIOFOCUS_GAIN
            )
        }
        return when (result) {
            AudioManager.AUDIOFOCUS_REQUEST_GRANTED -> {
                hasAudioFocus = true
                true
            }
            else -> {
                hasAudioFocus = false
                false
            }
        }
    }

    private fun abandonAudioFocus() {
        if (!hasAudioFocus) return
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            audioFocusRequest?.let { audioManager.abandonAudioFocusRequest(it) }
        } else {
            @Suppress("DEPRECATION")
            audioManager.abandonAudioFocus(this)
        }
        hasAudioFocus = false
    }

    override fun onAudioFocusChange(focusChange: Int) {
        playbackScope.launch { // Asegurarse de que se ejecuta en el scope correcto
            when (focusChange) {
                AudioManager.AUDIOFOCUS_GAIN -> {
                    if (playWhenAudioFocusGranted && !isPlaying()) {
                        mediaPlayer?.start()
                    }
                    // Opcionalmente, restaurar volumen si se hizo ducking
                    mediaPlayer?.setVolume(1.0f, 1.0f)
                    hasAudioFocus = true
                    playWhenAudioFocusGranted = false
                }
                AudioManager.AUDIOFOCUS_LOSS -> {
                    stopPlayback(true) // Detener y abandonar foco
                    hasAudioFocus = false
                    playWhenAudioFocusGranted = false // No reanudar
                }
                AudioManager.AUDIOFOCUS_LOSS_TRANSIENT -> {
                    if (isPlaying()) {
                        mediaPlayer?.pause()
                        playWhenAudioFocusGranted = true
                    }
                    hasAudioFocus = false
                }
                AudioManager.AUDIOFOCUS_LOSS_TRANSIENT_CAN_DUCK -> {
                    // Por ahora pausamos, pero podrías bajar el volumen (ducking)
                    if (isPlaying()) {
                        mediaPlayer?.setVolume(0.2f, 0.2f) // Ejemplo de ducking
                        // No establecemos playWhenAudioFocusGranted a true si solo hacemos ducking y no pausamos
                    }
                }
            }
        }
    }


    override fun playNext() {
        playbackScope.launch {
            playNextInternal(forceNext = true)
        }
    }

    private fun playNextInternal(forceNext: Boolean = false) {
        synchronized(audioQueue) {
            if (mediaPlayer != null && !forceNext && mediaPlayer!!.isPlaying) {
                return
            }

            if (!requestAudioFocus()) {
                playbackListener?.onError("No se pudo obtener el foco de audio.")
                // Considerar si se debe limpiar la cola o reintentar más tarde.
                // Por ahora, simplemente no reproducimos.
                return
            }

            // Si se fuerza 'next', la reproducción actual (si existe) se detendrá por el stopPlayback() abajo.
            // Si no se fuerza y hay algo (aunque no esté sonando), stopPlayback() lo limpiará.
            stopPlayback() // Detiene y limpia la reproducción actual ANTES de preparar una nueva

            if (audioQueue.isNotEmpty()) {
                currentItem = audioQueue.poll()
                _queueSize.value = audioQueue.size

                currentItem?.let { item ->
                    try {
                        mediaPlayer = MediaPlayer().apply {
                            setAudioAttributes( // Importante para el manejo de foco y tipo de contenido
                                AudioAttributes.Builder()
                                    .setUsage(AudioAttributes.USAGE_MEDIA)
                                    .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
                                    .build()
                            )
                            setDataSource(item.tempFile.absolutePath)
                            setOnPreparedListener { mp ->
                                playbackListener?.onStart(item.text)
                                mp.start()
                                playWhenAudioFocusGranted = false // Ya está reproduciendo
                            }
                            setOnCompletionListener {
                                playbackListener?.onStop()
                                item.tempFile.delete()
                                currentItem = null // Limpiar el item actual
                                // Si no hay más items, abandonamos el foco. Si hay más, playNextInternal lo solicitará.
                                if (audioQueue.isEmpty()) {
                                    abandonAudioFocus()
                                }
                                playNextInternal() // Intenta reproducir el siguiente
                            }
                            setOnErrorListener { _, what, extra ->
                                val errorMsg = "MediaPlayer Error: What: $what, Extra: $extra"
                                playbackListener?.onError(errorMsg)
                                item.tempFile.delete()
                                currentItem = null
                                stopPlayback() // Limpia estado y abandona foco si es necesario
                                if (audioQueue.isEmpty()) { // Si el error ocurrió en el último item
                                     abandonAudioFocus()
                                }
                                playNextInternal()
                                true
                            }
                            prepareAsync()
                        }
                    } catch (e: Exception) {
                        playbackListener?.onError("Error al preparar reproducción: ${e.localizedMessage}")
                        item.tempFile.delete()
                        currentItem = null
                        if (audioQueue.isEmpty()) {
                           abandonAudioFocus()
                        }
                        playNextInternal() // Intenta con el siguiente
                    }
                }
            } else { // La cola está vacía
                currentItem = null
                stopPlayback() // Asegura que todo esté limpio y el foco abandonado
                abandonAudioFocus() // Explícitamente abandonar si la cola se vació
                playbackListener?.onStop() // Notificar que la cola está vacía y todo parado
            }
        }
    }

    override fun stop() {
        playbackScope.launch {
            synchronized(audioQueue) {
                // Aquí podrías decidir si limpiar la cola o solo detener la reproducción actual.
                // Por ahora, solo detiene la reproducción actual y el item actual.
                stopPlayback(abandonFocus = true) // Detener y abandonar foco
                currentItem?.tempFile?.delete() // Limpiar el archivo del item que se detuvo manualmente
                currentItem = null
                // No limpiamos la cola aquí, `stop` es solo para la reproducción actual.
                // Si la cola debe limpiarse, se necesita un método clearQueue() o similar.
                playWhenAudioFocusGranted = false
                playbackListener?.onStop()
            }
        }
    }

    /**
     * Detiene la reproducción actual, resetea y libera el MediaPlayer.
     * @param abandonFocus Si es true, también abandona el foco de audio.
     */
    private fun stopPlayback(abandonFocus: Boolean = false) {
        mediaPlayer?.let {
            if (it.isPlaying) {
                it.stop()
            }
            it.reset()
            it.release()
        }
        mediaPlayer = null
        // No borramos currentItem.tempFile aquí, debe ser manejado por el que llama a stopPlayback
        // o en setOnCompletionListener/setOnErrorListener.
        // O si `stop()` es llamado directamente.

        if (abandonFocus) {
            abandonAudioFocus()
        }
    }

    private fun isPlaying(): Boolean {
        return mediaPlayer?.isPlaying ?: false
    }

    // TODO: Considerar el manejo de estados de MediaPlayer más detalladamente (errores, buffering, etc.)
    // TODO: Liberar recursos en onCleared de un ViewModel si este AudioPlayer estuviera asociado a un ViewModel lifecycle.
    //       Como es @Singleton, vivirá mientras la app viva. Se podría necesitar un método de limpieza global
    //       que llame a abandonAudioFocus() y cancele el playbackScope.Job.
}
