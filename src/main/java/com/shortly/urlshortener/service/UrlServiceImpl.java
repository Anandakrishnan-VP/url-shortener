package com.shortly.urlshortener.service;

import com.shortly.urlshortener.cache.CachedLink;
import com.shortly.urlshortener.cache.LinkCache;
import com.shortly.urlshortener.dto.*;
import com.shortly.urlshortener.encoder.CodeEncoder;
import com.shortly.urlshortener.exception.AliasAlreadyExistsException;
import com.shortly.urlshortener.exception.InvalidUrlException;
import com.shortly.urlshortener.exception.LinkExpiredException;
import com.shortly.urlshortener.exception.LinkNotFoundException;
import com.shortly.urlshortener.model.ShortUrl;
import com.shortly.urlshortener.repository.ClickEventRepository;
import com.shortly.urlshortener.repository.ShortUrlRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.net.URI;
import java.time.Instant;
import java.util.List;
import java.util.Set;

@Service
public class UrlServiceImpl implements UrlService {

    public static final long OFFSET = 916_132_832L;
    private static final Set<String> RESERVED_WORDS = Set.of("api", "swagger-ui", "actuator", "v3");

    private final ShortUrlRepository shortUrlRepository;
    private final ClickEventRepository clickEventRepository;
    private final CodeEncoder encoder;
    private final LinkCache linkCache;
    private final String baseUrl;

    public UrlServiceImpl(
            ShortUrlRepository shortUrlRepository,
            ClickEventRepository clickEventRepository,
            CodeEncoder encoder,
            LinkCache linkCache,
            @Value("${app.base-url:http://localhost:8080}") String baseUrl
    ) {
        this.shortUrlRepository = shortUrlRepository;
        this.clickEventRepository = clickEventRepository;
        this.encoder = encoder;
        this.linkCache = linkCache;
        this.baseUrl = baseUrl.endsWith("/") ? baseUrl.substring(0, baseUrl.length() - 1) : baseUrl;
    }

    @Override
    @Transactional
    public LinkResponse createLink(CreateLinkRequest request) {
        validateUrl(request.url());

        if (request.expiresAt() != null && !request.expiresAt().isAfter(Instant.now())) {
            throw new InvalidUrlException("expiry must be in the future");
        }

        String code;
        boolean customAlias = false;
        long id = shortUrlRepository.nextId();

        if (request.alias() != null && !request.alias().isBlank()) {
            String alias = request.alias().trim();
            if (RESERVED_WORDS.contains(alias.toLowerCase())) {
                throw new AliasAlreadyExistsException("Alias '" + alias + "' is a reserved path");
            }
            if (shortUrlRepository.existsByShortCode(alias)) {
                throw new AliasAlreadyExistsException("Alias '" + alias + "' already exists");
            }
            code = alias;
            customAlias = true;
        } else {
            code = encoder.encode(id + OFFSET);
        }

        ShortUrl shortUrl = new ShortUrl(
                id,
                code,
                request.url(),
                customAlias,
                Instant.now(),
                request.expiresAt()
        );

        shortUrlRepository.save(shortUrl);

        return new LinkResponse(
                code,
                baseUrl + "/" + code,
                shortUrl.getOriginalUrl(),
                shortUrl.getExpiresAt()
        );
    }

    @Override
    public CachedLink resolve(String code) {
        CachedLink cached = linkCache.get(code).orElseGet(() -> {
            ShortUrl entity = shortUrlRepository.findByShortCode(code)
                    .orElseThrow(() -> new LinkNotFoundException("Short link not found: " + code));
            CachedLink fresh = new CachedLink(entity.getOriginalUrl(), entity.getExpiresAt());
            linkCache.put(code, fresh);
            return fresh;
        });

        if (cached.expiresAt() != null && cached.expiresAt().isBefore(Instant.now())) {
            linkCache.evict(code);
            throw new LinkExpiredException("Link has expired: " + code);
        }

        return cached;
    }

    @Override
    @Transactional(readOnly = true)
    public StatsResponse getStats(String code) {
        ShortUrl shortUrl = shortUrlRepository.findByShortCode(code)
                .orElseThrow(() -> new LinkNotFoundException("Short link not found: " + code));

        long totalClicks = clickEventRepository.countByShortCode(code);

        List<DayCount> clicksPerDay = clickEventRepository.findDailyClickCounts(code).stream()
                .map(v -> new DayCount(v.getDay(), v.getCount()))
                .toList();

        List<DeviceCount> devices = clickEventRepository.findDeviceCounts(code).stream()
                .map(v -> new DeviceCount(v.getDevice(), v.getCount()))
                .toList();

        return new StatsResponse(
                code,
                shortUrl.getOriginalUrl(),
                totalClicks,
                clicksPerDay,
                devices
        );
    }

    private void validateUrl(String url) {
        if (url == null || url.isBlank()) {
            throw new InvalidUrlException("URL cannot be empty");
        }
        try {
            URI uri = URI.create(url);
            String scheme = uri.getScheme();
            if (scheme == null || (!scheme.equalsIgnoreCase("http") && !scheme.equalsIgnoreCase("https"))) {
                throw new InvalidUrlException("Invalid URL scheme: only http and https are allowed");
            }
            if (uri.getHost() == null || uri.getHost().isBlank()) {
                throw new InvalidUrlException("Invalid URL: host cannot be empty");
            }
        } catch (Exception e) {
            throw new InvalidUrlException("Invalid URL format: " + e.getMessage());
        }
    }
}
