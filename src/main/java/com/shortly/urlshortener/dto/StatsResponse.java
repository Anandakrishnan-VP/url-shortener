package com.shortly.urlshortener.dto;

import java.util.List;

public record StatsResponse(
        String shortCode,
        String originalUrl,
        long totalClicks,
        List<DayCount> clicksPerDay,
        List<DeviceCount> devices
) {
}
