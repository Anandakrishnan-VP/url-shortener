package com.shortly.urlshortener.repository;

import java.time.LocalDate;

public interface DayCountView {
    LocalDate getDay();
    long getCount();
}
