package com.shortly.urlshortener.encoder;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;

import static org.junit.jupiter.api.Assertions.*;

class Base62EncoderTest {

    private Base62Encoder encoder;

    @BeforeEach
    void setUp() {
        encoder = new Base62Encoder();
    }

    @Test
    @DisplayName("encode boundary and edge cases")
    void testEncodeBoundaries() {
        assertEquals("0", encoder.encode(0));
        assertEquals("z", encoder.encode(61));
        assertEquals("10", encoder.encode(62));
    }

    @ParameterizedTest
    @ValueSource(longs = {1L, 61L, 62L, 12345L, 916132832L, Long.MAX_VALUE / 2})
    @DisplayName("round trip encode/decode preserves value")
    void testRoundTrip(long value) {
        String encoded = encoder.encode(value);
        long decoded = encoder.decode(encoded);
        assertEquals(value, decoded);
    }

    @Test
    @DisplayName("encode 916132832L has length 6")
    void testOffsetLength() {
        String encoded = encoder.encode(916132832L);
        assertEquals(6, encoded.length());
        assertEquals("100000", encoded);
    }

    @Test
    @DisplayName("negative encode throws IllegalArgumentException")
    void testNegativeThrows() {
        assertThrows(IllegalArgumentException.class, () -> encoder.encode(-1));
        assertThrows(IllegalArgumentException.class, () -> encoder.encode(-9999));
    }

    @Test
    @DisplayName("invalid decode inputs throw IllegalArgumentException")
    void testInvalidDecodeThrows() {
        assertThrows(IllegalArgumentException.class, () -> encoder.decode(null));
        assertThrows(IllegalArgumentException.class, () -> encoder.decode(""));
        assertThrows(IllegalArgumentException.class, () -> encoder.decode("abc!"));
        assertThrows(IllegalArgumentException.class, () -> encoder.decode("12#45"));
        assertThrows(IllegalArgumentException.class, () -> encoder.decode("xyz "));
    }
}
