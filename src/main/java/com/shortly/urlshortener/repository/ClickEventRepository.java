package com.shortly.urlshortener.repository;

import com.shortly.urlshortener.model.ClickEvent;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ClickEventRepository extends JpaRepository<ClickEvent, Long> {

    long countByShortCode(String shortCode);

    @Query(value = "SELECT CAST(clicked_at AT TIME ZONE 'UTC' AS date) AS day, COUNT(*) AS count " +
            "FROM click_event WHERE short_code = :code GROUP BY day ORDER BY day",
            nativeQuery = true)
    List<DayCountView> findDailyClickCounts(@Param("code") String code);

    @Query(value = "SELECT device_type AS device, COUNT(*) AS count " +
            "FROM click_event WHERE short_code = :code GROUP BY device_type",
            nativeQuery = true)
    List<DeviceCountView> findDeviceCounts(@Param("code") String code);
}
