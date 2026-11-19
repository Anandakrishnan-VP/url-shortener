package com.shortly.urlshortener.cache;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.util.Collections;
import java.util.Map;
import java.util.Optional;

@Component
public class LinkCache {

    private final Map<String, CachedLink> cache;

    public LinkCache(@Value("${app.cache-capacity:1000}") int capacity) {
        this.cache = Collections.synchronizedMap(new LruCache<>(capacity));
    }

    public Optional<CachedLink> get(String code) {
        if (code == null) {
            return Optional.empty();
        }
        return Optional.ofNullable(cache.get(code));
    }

    public void put(String code, CachedLink link) {
        if (code != null && link != null) {
            cache.put(code, link);
        }
    }

    public void evict(String code) {
        if (code != null) {
            cache.remove(code);
        }
    }

    public int size() {
        return cache.size();
    }

    public void clear() {
        cache.clear();
    }
}
