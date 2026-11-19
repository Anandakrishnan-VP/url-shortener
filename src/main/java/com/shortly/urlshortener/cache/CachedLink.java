package com.shortly.urlshortener.cache;

import java.time.Instant;

public record CachedLink(
        String originalUrl,
        Instant expiresAt
) {
    public boolean isExpired() {
        return expiresAt != null && expiresAt.isBefore(Instant.now());
    }
}
