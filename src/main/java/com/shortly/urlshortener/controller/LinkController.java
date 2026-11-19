package com.shortly.urlshortener.controller;

import com.shortly.urlshortener.dto.CreateLinkRequest;
import com.shortly.urlshortener.dto.LinkResponse;
import com.shortly.urlshortener.dto.StatsResponse;
import com.shortly.urlshortener.service.UrlService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/links")
@Tag(name = "Links", description = "URL shortening and analytics management API")
public class LinkController {

    private final UrlService urlService;

    public LinkController(UrlService urlService) {
        this.urlService = urlService;
    }

    @PostMapping
    @Operation(summary = "Create short link", description = "Shortens a URL with an optional custom alias and optional expiration time")
    public ResponseEntity<LinkResponse> createLink(@Valid @RequestBody CreateLinkRequest request) {
        LinkResponse response = urlService.createLink(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping("/{code}/stats")
    @Operation(summary = "Get link statistics", description = "Returns total clicks, clicks per day, and device breakdown for a short code")
    public ResponseEntity<StatsResponse> getStats(@PathVariable String code) {
        StatsResponse stats = urlService.getStats(code);
        return ResponseEntity.ok(stats);
    }
}
