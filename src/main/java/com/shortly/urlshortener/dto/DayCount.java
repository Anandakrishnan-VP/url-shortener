package com.shortly.urlshortener.dto;

import java.time.LocalDate;

public record DayCount(
        LocalDate date,
        long count
) {
}
