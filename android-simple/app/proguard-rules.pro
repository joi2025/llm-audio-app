# Add project specific ProGuard rules here.
# You can control the set of applied configuration files using the
# proguardFiles setting in build.gradle.

# Keep all classes used by Hilt
-keep class dagger.hilt.** { *; }
-keep class javax.inject.** { *; }
-keep @dagger.hilt.android.lifecycle.HiltViewModel class * { *; }

# Keep WebSocket classes
-keep class org.java_websocket.** { *; }
-dontwarn org.java_websocket.**

# Keep Kotlin serialization
-keepattributes *Annotation*, InnerClasses
-dontnote kotlinx.serialization.AnnotationsKt
-keepclassmembers class kotlinx.serialization.json.** {
    *** Companion;
}
-keepclasseswithmembers class kotlinx.serialization.** {
    kotlinx.serialization.KSerializer serializer(...);
}
-keep,includedescriptorclasses class com.joi2025.llmaudioapp.**$$serializer { *; }
-keepclassmembers class com.joi2025.llmaudioapp.** {
    *** Companion;
}
-keepclasseswithmembers class com.joi2025.llmaudioapp.** {
    kotlinx.serialization.KSerializer serializer(...);
}

# Keep data classes for JSON parsing
-keep class com.joi2025.llmaudioapp.data.model.** { *; }
-keep class com.joi2025.llmaudioapp.viewmodel.WebSocketMessage { *; }

# Keep audio classes
-keep class android.media.** { *; }
-dontwarn android.media.**

# Keep Compose classes
-keep class androidx.compose.** { *; }
-dontwarn androidx.compose.**

# Keep coroutines
-keep class kotlinx.coroutines.** { *; }
-dontwarn kotlinx.coroutines.**

# Remove debug logs in release
-assumenosideeffects class android.util.Log {
    public static boolean isLoggable(java.lang.String, int);
    public static int v(...);
    public static int i(...);
    public static int w(...);
    public static int d(...);
    public static int e(...);
}

# Optimize
-optimizationpasses 5
-dontusemixedcaseclassnames
-dontskipnonpubliclibraryclasses
-verbose
