package com.shortly.urlshortener.cache;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class LruCacheTest {

    @Test
    @DisplayName("LRU eviction with capacity 2: access A, put C, evicts least recently used B")
    void testLruEviction() {
        LruCache<String, String> cache = new LruCache<>(2);

        cache.put("A", "valA");
        cache.put("B", "valB");

        // Access A to make it most recently used
        assertEquals("valA", cache.get("A"));

        // Put C, which should evict B (the least recently used entry)
        cache.put("C", "valC");

        assertEquals(2, cache.size());
        assertTrue(cache.containsKey("A"), "A should still be in cache");
        assertFalse(cache.containsKey("B"), "B should have been evicted");
        assertTrue(cache.containsKey("C"), "C should be in cache");
    }

    @Test
    @DisplayName("Invalid capacity throws IllegalArgumentException")
    void testInvalidCapacity() {
        assertThrows(IllegalArgumentException.class, () -> new LruCache<>(0));
        assertThrows(IllegalArgumentException.class, () -> new LruCache<>(-5));
    }
}
