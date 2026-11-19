package com.shortly.urlshortener.dto;

import java.time.Instant;

public record LinkResponse(
        String shortCode,
        String shortUrl,
        String originalUrl,
        Instant expiresAt
) {
}
