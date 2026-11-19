package com.shortly.urlshortener.service;

import com.shortly.urlshortener.cache.CachedLink;
import com.shortly.urlshortener.dto.CreateLinkRequest;
import com.shortly.urlshortener.dto.LinkResponse;
import com.shortly.urlshortener.dto.StatsResponse;

public interface UrlService {
    LinkResponse createLink(CreateLinkRequest request);
    CachedLink resolve(String code);
    StatsResponse getStats(String code);
}
