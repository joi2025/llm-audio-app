package com.llmaudio.app.domain.model

import org.junit.Assert.*
import org.junit.Test

/**
 * Unit tests for Personality data class and companion object.
 * Validates the personality system works correctly in isolation.
 */
class PersonalityTest {

    @Test
    fun `getAllPersonalities should return exactly 15 personalities`() {
        val personalities = Personality.getAllPersonalities()
        assertEquals("Should have exactly 15 personalities", 15, personalities.size)
    }

    @Test
    fun `getAllPersonalities should contain all expected categories`() {
        val personalities = Personality.getAllPersonalities()
        val categories = personalities.map { it.category }.distinct()
        
        val expectedCategories = listOf("Divertidos", "Profesionales", "Sensuales", "Serios", "Creativos")
        assertEquals("Should have all 5 categories", expectedCategories.size, categories.size)
        assertTrue("Should contain all expected categories", categories.containsAll(expectedCategories))
    }

    @Test
    fun `getPersonalityByName should return correct personality for valid name`() {
        val personality = Personality.getPersonalityByName("Comediante")
        
        assertNotNull("Should find Comediante personality", personality)
        assertEquals("Should have correct name", "Comediante", personality?.name)
        assertEquals("Should have correct category", "Divertidos", personality?.category)
        assertEquals("Should have correct emoji", "😂", personality?.emoji)
    }

    @Test
    fun `getPersonalityByName should return null for invalid name`() {
        val personality = Personality.getPersonalityByName("NonExistentPersonality")
        assertNull("Should return null for invalid name", personality)
    }

    @Test
    fun `getPersonalityByName should be case sensitive`() {
        val personality = Personality.getPersonalityByName("comediante") // lowercase
        assertNull("Should be case sensitive", personality)
    }

    @Test
    fun `getSystemPrompt should return non-empty prompt for all personalities`() {
        val personalities = Personality.getAllPersonalities()
        
        personalities.forEach { personality ->
            val prompt = personality.getSystemPrompt()
            assertNotNull("System prompt should not be null for ${personality.name}", prompt)
            assertTrue("System prompt should not be empty for ${personality.name}", prompt.isNotEmpty())
            assertTrue("System prompt should be substantial for ${personality.name}", prompt.length > 50)
        }
    }

    @Test
    fun `getVoiceForPersonality should return valid OpenAI voices`() {
        val personalities = Personality.getAllPersonalities()
        val validVoices = listOf("alloy", "echo", "fable", "onyx", "nova", "shimmer")
        
        personalities.forEach { personality ->
            val voice = personality.getVoiceForPersonality()
            assertNotNull("Voice should not be null for ${personality.name}", voice)
            assertTrue("Voice should be valid OpenAI voice for ${personality.name}", 
                validVoices.contains(voice))
        }
    }

    @Test
    fun `personality colors should be valid hex colors`() {
        val personalities = Personality.getAllPersonalities()
        val hexColorRegex = Regex("^#[0-9A-Fa-f]{6}$")
        
        personalities.forEach { personality ->
            assertTrue("Color should be valid hex for ${personality.name}", 
                hexColorRegex.matches(personality.color))
        }
    }

    @Test
    fun `each category should have at least 2 personalities`() {
        val personalities = Personality.getAllPersonalities()
        val categoryCounts = personalities.groupBy { it.category }.mapValues { it.value.size }
        
        categoryCounts.forEach { (category, count) ->
            assertTrue("Category $category should have at least 2 personalities", count >= 2)
        }
    }

    @Test
    fun `personality names should be unique`() {
        val personalities = Personality.getAllPersonalities()
        val names = personalities.map { it.name }
        val uniqueNames = names.distinct()
        
        assertEquals("All personality names should be unique", names.size, uniqueNames.size)
    }

    @Test
    fun `personality emojis should be unique`() {
        val personalities = Personality.getAllPersonalities()
        val emojis = personalities.map { it.emoji }
        val uniqueEmojis = emojis.distinct()
        
        assertEquals("All personality emojis should be unique", emojis.size, uniqueEmojis.size)
    }
}
