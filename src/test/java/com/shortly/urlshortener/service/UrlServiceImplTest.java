package com.shortly.urlshortener.service;

import com.shortly.urlshortener.cache.CachedLink;
import com.shortly.urlshortener.cache.LinkCache;
import com.shortly.urlshortener.dto.CreateLinkRequest;
import com.shortly.urlshortener.dto.LinkResponse;
import com.shortly.urlshortener.encoder.CodeEncoder;
import com.shortly.urlshortener.exception.AliasAlreadyExistsException;
import com.shortly.urlshortener.exception.InvalidUrlException;
import com.shortly.urlshortener.exception.LinkExpiredException;
import com.shortly.urlshortener.exception.LinkNotFoundException;
import com.shortly.urlshortener.model.ShortUrl;
import com.shortly.urlshortener.repository.ClickEventRepository;
import com.shortly.urlshortener.repository.ShortUrlRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class UrlServiceImplTest {

    @Mock
    private ShortUrlRepository shortUrlRepository;

    @Mock
    private ClickEventRepository clickEventRepository;

    @Mock
    private CodeEncoder encoder;

    private LinkCache linkCache;
    private UrlServiceImpl urlService;

    @BeforeEach
    void setUp() {
        linkCache = new LinkCache(100);
        urlService = new UrlServiceImpl(
                shortUrlRepository,
                clickEventRepository,
                encoder,
                linkCache,
                "http://localhost:8080"
        );
    }

    @Test
    @DisplayName("Create link with generated code")
    void testCreateLinkGeneratedCode() {
        when(shortUrlRepository.nextId()).thenReturn(1L);
        when(encoder.encode(1L + UrlServiceImpl.OFFSET)).thenReturn("100001");
        when(shortUrlRepository.save(any(ShortUrl.class))).thenAnswer(invocation -> invocation.getArgument(0));

        CreateLinkRequest request = new CreateLinkRequest("https://example.com", null, null);
        LinkResponse response = urlService.createLink(request);

        assertNotNull(response);
        assertEquals("100001", response.shortCode());
        assertEquals("http://localhost:8080/100001", response.shortUrl());
        assertEquals("https://example.com", response.originalUrl());
        verify(shortUrlRepository).save(any(ShortUrl.class));
    }

    @Test
    @DisplayName("Create link with custom alias")
    void testCreateLinkCustomAlias() {
        when(shortUrlRepository.nextId()).thenReturn(2L);
        when(shortUrlRepository.existsByShortCode("my-custom-link")).thenReturn(false);
        when(shortUrlRepository.save(any(ShortUrl.class))).thenAnswer(invocation -> invocation.getArgument(0));

        CreateLinkRequest request = new CreateLinkRequest("https://example.com/docs", "my-custom-link", null);
        LinkResponse response = urlService.createLink(request);

        assertEquals("my-custom-link", response.shortCode());
        assertEquals("http://localhost:8080/my-custom-link", response.shortUrl());
        verify(encoder, never()).encode(anyLong());
        verify(shortUrlRepository).save(any(ShortUrl.class));
    }

    @Test
    @DisplayName("Duplicate alias throws AliasAlreadyExistsException (409 path)")
    void testDuplicateAliasThrows() {
        when(shortUrlRepository.existsByShortCode("taken")).thenReturn(true);

        CreateLinkRequest request = new CreateLinkRequest("https://example.com", "taken", null);
        assertThrows(AliasAlreadyExistsException.class, () -> urlService.createLink(request));
    }

    @Test
    @DisplayName("Reserved alias throws AliasAlreadyExistsException")
    void testReservedAliasThrows() {
        CreateLinkRequest request = new CreateLinkRequest("https://example.com", "api", null);
        assertThrows(AliasAlreadyExistsException.class, () -> urlService.createLink(request));
    }

    @Test
    @DisplayName("Invalid URL schemes (e.g. javascript:, file:) rejected")
    void testInvalidSchemeRejected() {
        assertThrows(InvalidUrlException.class, () ->
                urlService.createLink(new CreateLinkRequest("javascript:alert(1)", null, null)));
        assertThrows(InvalidUrlException.class, () ->
                urlService.createLink(new CreateLinkRequest("file:///etc/passwd", null, null)));
        assertThrows(InvalidUrlException.class, () ->
                urlService.createLink(new CreateLinkRequest("not-a-valid-url", null, null)));
    }

    @Test
    @DisplayName("Past expiry date throws InvalidUrlException")
    void testPastExpiryThrows() {
        Instant past = Instant.now().minus(1, ChronoUnit.HOURS);
        CreateLinkRequest request = new CreateLinkRequest("https://example.com", null, past);
        assertThrows(InvalidUrlException.class, () -> urlService.createLink(request));
    }

    @Test
    @DisplayName("Resolve cache hit avoids repository call")
    void testResolveCacheHitAvoidsRepoCall() {
        linkCache.put("cachehit", new CachedLink("https://cached.org", null));

        CachedLink resolved = urlService.resolve("cachehit");
        assertEquals("https://cached.org", resolved.originalUrl());

        verify(shortUrlRepository, never()).findByShortCode(anyString());
    }

    @Test
    @DisplayName("Resolve expired link throws LinkExpiredException and evicts from cache")
    void testResolveExpiredLinkThrows() {
        Instant past = Instant.now().minus(10, ChronoUnit.MINUTES);
        linkCache.put("expired1", new CachedLink("https://expired.org", past));

        assertThrows(LinkExpiredException.class, () -> urlService.resolve("expired1"));
        assertTrue(linkCache.get("expired1").isEmpty());
    }

    @Test
    @DisplayName("Resolve missing link throws LinkNotFoundException")
    void testResolveMissingLinkThrows() {
        when(shortUrlRepository.findByShortCode("missing")).thenReturn(Optional.empty());

        assertThrows(LinkNotFoundException.class, () -> urlService.resolve("missing"));
    }
}
