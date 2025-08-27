package com.llmaudio.app.di

import com.llmaudio.app.domain.audio.AudioPlayer
import com.llmaudio.app.domain.audio.AudioPlayerImpl
import dagger.Binds
import dagger.Module
import dagger.hilt.InstallIn
import dagger.hilt.components.SingletonComponent
import javax.inject.Singleton

@Module
@InstallIn(SingletonComponent::class)
abstract class AudioBindingModule {

    @Binds
    @Singleton
    abstract fun bindAudioPlayer(
        audioPlayerImpl: AudioPlayerImpl
    ): AudioPlayer
}
