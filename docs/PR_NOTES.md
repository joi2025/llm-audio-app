# PR Notes: MIUI fixes, build stability, and UI performance

## Summary
- __MIUI toolbar crash mitigation__: Global TextToolbar override in `MainActivity` using `CompositionLocalProvider` to disable the selection toolbar on Xiaomi/Redmi/Poco.
- __UI performance__: Throttle UI emissions (audio level ~30 FPS, assistant streaming ~20 FPS) and optimize audio buffer concatenation.
- __Build stability__: Align with JDK 17 and Gradle 8.4; Compose compiler ext 1.5.4; target/compile SDK 34.
- __History screen__: Lifecycle-aware collection, stable keys, and Material 3 experimental opt-in.
- __Android manifest__: `android:enableOnBackInvokedCallback="true"` for Android 13+ back nav.
- __Project hygiene__: Expanded `.gitignore` for Android artifacts and secrets.

## Changes
- `app/src/main/java/com/llmaudio/app/presentation/MainActivity.kt`
  - Wrap `setContent` with global MIUI-safe TextToolbar provider.
- `app/src/main/java/com/llmaudio/app/presentation/viewmodel/VoicePipelineViewModel.kt`
  - Use `ByteArrayOutputStream` for audio concatenation (avoid O(n^2)).
  - Throttle UI emissions for streaming and audio level updates.
  - Reuse a single `Gson` instance for SSE parsing.
- `app/src/main/java/com/llmaudio/app/presentation/screens/HistoryScreen.kt`
  - Replace `collectAsState()` with `collectAsStateWithLifecycle()`.
  - Add stable keys to `LazyColumn` (`key = { it.id }`).
  - Opt-in to `ExperimentalMaterial3Api` for `TopAppBar`.
- `app/build.gradle.kts`
  - Confirm Compose BOM 2023.10.01, compiler ext 1.5.4, jvmTarget 17, compile/target SDK 34.
- `gradle/wrapper/gradle-wrapper.properties`
  - Pin Gradle wrapper to 8.4.
- `AndroidManifest.xml`
  - Enable back invoked callback for Android 13+.
- `.gitignore`
  - Add Android and secrets ignores (build/, .gradle/, .idea/, local.properties, APKs, keystores).

## Rationale
- __MIUI__: Prevents `ClassCastException` from MIUI text selection toolbar rendering.
- __Performance__: Reduces recompositions and main-thread jank.
- __Stability__: Ensures compatibility with toolchain (AGP 8.2.2, Kotlin 1.9.x, JDK 17).

## Next steps
- Verify toolchain locally:
  - `./gradlew --version` (JDK 17, Gradle 8.4)
  - `./gradlew :app:compileDebugKotlin --stacktrace --info`
- Resource processing & build:
  - `./gradlew clean :app:processDebugResources --stacktrace --info`
  - `./gradlew assembleDebug --stacktrace --info`
- Test on MIUI device (Xiaomi/Redmi/Poco) for toolbar stability and UI responsiveness.
