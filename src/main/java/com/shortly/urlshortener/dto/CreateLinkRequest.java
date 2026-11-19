package com.shortly.urlshortener.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;

import java.time.Instant;

public record CreateLinkRequest(
        @NotBlank(message = "URL cannot be blank")
        @Size(max = 2048, message = "URL cannot exceed 2048 characters")
        String url,

        @Pattern(regexp = "^[A-Za-z0-9_-]{3,32}$", message = "Alias must be 3-32 characters of letters, digits, '_' or '-'")
        String alias,

        Instant expiresAt
) {
}
