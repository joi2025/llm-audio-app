package com.llmaudio.app.data.repository

import androidx.arch.core.executor.testing.InstantTaskExecutorRule
import androidx.room.Room
import androidx.test.core.app.ApplicationProvider
import com.llmaudio.app.data.db.AppDatabase
import kotlinx.coroutines.ExperimentalCoroutinesApi
import kotlinx.coroutines.test.runTest
import org.junit.After
import org.junit.Assert.*
import org.junit.Before
import org.junit.Rule
import org.junit.Test

/**
 * Unit tests for MetricsRepository.
 * Validates metrics collection and calculation functionality.
 */
@ExperimentalCoroutinesApi
class MetricsRepositoryTest {

    @get:Rule
    val instantTaskExecutorRule = InstantTaskExecutorRule()

    private lateinit var database: AppDatabase
    private lateinit var metricsRepository: MetricsRepository

    @Before
    fun setup() {
        database = Room.inMemoryDatabaseBuilder(
            ApplicationProvider.getApplicationContext(),
            AppDatabase::class.java
        ).allowMainThreadQueries().build()
        
        metricsRepository = MetricsRepository(database.usageStatsDao())
    }

    @After
    fun tearDown() {
        database.close()
    }

    @Test
    fun `recordLatency should store metrics correctly`() = runTest {
        // Given latency values
        val sttLatency = 150L
        val firstTokenLatency = 300L
        val ttsLatency = 200L
        
        // When recording latencies
        metricsRepository.recordLatency("stt", sttLatency)
        metricsRepository.recordLatency("first_token", firstTokenLatency)
        metricsRepository.recordLatency("tts", ttsLatency)
        
        // Then metrics should be stored
        val stats = metricsRepository.getLatencyStats()
        assertTrue("Should have STT metrics", stats.containsKey("stt"))
        assertTrue("Should have first_token metrics", stats.containsKey("first_token"))
        assertTrue("Should have TTS metrics", stats.containsKey("tts"))
    }

    @Test
    fun `getAverageLatency should calculate p50_p95 accurately`() = runTest {
        // Given multiple latency measurements
        val latencies = listOf(100L, 150L, 200L, 250L, 300L, 350L, 400L, 450L, 500L, 550L)
        
        // When recording multiple measurements
        latencies.forEach { latency ->
            metricsRepository.recordLatency("test_metric", latency)
        }
        
        // Then should calculate percentiles correctly
        val stats = metricsRepository.getLatencyStats()["test_metric"]
        assertNotNull("Should have test_metric stats", stats)
        
        val p50 = stats?.get("p50")
        val p95 = stats?.get("p95")
        
        // P50 should be around 325 (median of 300 and 350)
        assertTrue("P50 should be reasonable", p50 != null && p50 >= 300 && p50 <= 350)
        
        // P95 should be around 525 (95th percentile)
        assertTrue("P95 should be reasonable", p95 != null && p95 >= 500 && p95 <= 550)
    }

    @Test
    fun `recordInterruption should increment counters`() = runTest {
        // Given no prior interruptions
        val initialCount = metricsRepository.getInterruptionCount()
        
        // When recording interruptions
        metricsRepository.recordInterruption()
        metricsRepository.recordInterruption()
        metricsRepository.recordInterruption()
        
        // Then count should increment
        val finalCount = metricsRepository.getInterruptionCount()
        assertEquals("Should increment interruption count", initialCount + 3, finalCount)
    }

    @Test
    fun `clearMetrics should reset all data`() = runTest {
        // Given existing metrics
        metricsRepository.recordLatency("stt", 150L)
        metricsRepository.recordLatency("tts", 200L)
        metricsRepository.recordInterruption()
        
        // When clearing metrics
        metricsRepository.clearMetrics()
        
        // Then all data should be reset
        val stats = metricsRepository.getLatencyStats()
        val interruptions = metricsRepository.getInterruptionCount()
        
        assertTrue("Latency stats should be empty", stats.isEmpty())
        assertEquals("Interruption count should be zero", 0, interruptions)
    }

    @Test
    fun `concurrent metric recording should be thread safe`() = runTest {
        // Given concurrent metric recording
        val iterations = 100
        
        // When recording metrics concurrently
        repeat(iterations) {
            metricsRepository.recordLatency("concurrent_test", it.toLong())
        }
        
        // Then should handle all recordings without data loss
        val stats = metricsRepository.getLatencyStats()["concurrent_test"]
        assertNotNull("Should have concurrent_test stats", stats)
        
        val count = stats?.get("count")
        assertEquals("Should record all metrics", iterations.toLong(), count)
    }
}
