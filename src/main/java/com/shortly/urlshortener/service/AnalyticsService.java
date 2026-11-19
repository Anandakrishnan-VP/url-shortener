package com.shortly.urlshortener.service;

import com.shortly.urlshortener.model.ClickEvent;
import com.shortly.urlshortener.model.DeviceType;
import com.shortly.urlshortener.repository.ClickEventRepository;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;

import java.time.Instant;

@Service
public class AnalyticsService {

    private static final Logger log = LoggerFactory.getLogger(AnalyticsService.class);

    private final ClickEventRepository clickEventRepository;

    public AnalyticsService(ClickEventRepository clickEventRepository) {
        this.clickEventRepository = clickEventRepository;
    }

    @Async("analyticsExecutor")
    public void recordClick(String code, String userAgent, String referrer) {
        try {
            DeviceType deviceType = parseDevice(userAgent);
            ClickEvent clickEvent = new ClickEvent(
                    code,
                    Instant.now(),
                    deviceType,
                    truncate(userAgent, 512),
                    truncate(referrer, 2048)
            );
            clickEventRepository.save(clickEvent);
            log.debug("Recorded click event for code={}, device={}", code, deviceType);
        } catch (Exception e) {
            log.error("Failed to record click event for code={}: {}", code, e.getMessage(), e);
        }
    }

    public DeviceType parseDevice(String userAgent) {
        if (userAgent == null || userAgent.isBlank()) {
            return DeviceType.UNKNOWN;
        }

        String lower = userAgent.toLowerCase();
        if (lower.contains("bot") || lower.contains("crawl") || lower.contains("spider")) {
            return DeviceType.BOT;
        }
        if (lower.contains("ipad") || lower.contains("tablet")) {
            return DeviceType.TABLET;
        }
        if (lower.contains("mobi") || lower.contains("android") || lower.contains("iphone")) {
            return DeviceType.MOBILE;
        }
        return DeviceType.DESKTOP;
    }

    private String truncate(String val, int maxLength) {
        if (val == null) return null;
        return val.length() > maxLength ? val.substring(0, maxLength) : val;
    }
}
