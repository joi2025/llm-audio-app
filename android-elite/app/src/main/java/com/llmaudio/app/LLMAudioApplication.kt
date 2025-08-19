package com.llmaudio.app

import android.app.Application
import dagger.hilt.android.HiltAndroidApp

@HiltAndroidApp
class LLMAudioApplication : Application() {
    override fun onCreate() {
        super.onCreate()
    }
}
