package com.shortly.urlshortener.controller;

import com.shortly.urlshortener.cache.CachedLink;
import com.shortly.urlshortener.service.AnalyticsService;
import com.shortly.urlshortener.service.UrlService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.stereotype.Controller;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;

import java.net.URI;

@Controller
@Tag(name = "Redirect", description = "Redirect short URLs to original destination")
public class RedirectController {

    private final UrlService urlService;
    private final AnalyticsService analyticsService;

    public RedirectController(UrlService urlService, AnalyticsService analyticsService) {
        this.urlService = urlService;
        this.analyticsService = analyticsService;
    }

    @GetMapping("/{code:[A-Za-z0-9_-]{1,32}}")
    @Operation(summary = "Redirect to target URL", description = "Performs HTTP 302 redirect and asynchronously records click analytics")
    public ResponseEntity<Void> redirect(@PathVariable String code, HttpServletRequest request) {
        CachedLink link = urlService.resolve(code);
        analyticsService.recordClick(
                code,
                request.getHeader("User-Agent"),
                request.getHeader("Referer")
        );
        return ResponseEntity.status(HttpStatus.FOUND)
                .location(URI.create(link.originalUrl()))
                .build();
    }
}
