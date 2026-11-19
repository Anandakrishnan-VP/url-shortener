package com.shortly.urlshortener.encoder;

import org.springframework.stereotype.Component;

@Component
public class Base62Encoder implements CodeEncoder {

    private static final String ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
    private static final int BASE = ALPHABET.length();

    @Override
    public String encode(long value) {
        if (value < 0) {
            throw new IllegalArgumentException("Value must be non-negative: " + value);
        }
        if (value == 0) {
            return "0";
        }

        StringBuilder sb = new StringBuilder();
        long current = value;
        while (current > 0) {
            int remainder = (int) (current % BASE);
            sb.append(ALPHABET.charAt(remainder));
            current /= BASE;
        }

        return sb.reverse().toString();
    }

    @Override
    public long decode(String code) {
        if (code == null || code.isEmpty()) {
            throw new IllegalArgumentException("Code cannot be null or empty");
        }

        long result = 0;
        for (int i = 0; i < code.length(); i++) {
            char c = code.charAt(i);
            int index = ALPHABET.indexOf(c);
            if (index == -1) {
                throw new IllegalArgumentException("Invalid character in base62 string: " + c);
            }
            result = result * BASE + index;
        }

        return result;
    }
}
