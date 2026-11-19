package com.shortly.urlshortener.model;

import jakarta.persistence.*;

import java.time.Instant;

@Entity
@Table(name = "click_event")
public class ClickEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "short_code", nullable = false, length = 32)
    private String shortCode;

    @Column(name = "clicked_at", nullable = false)
    private Instant clickedAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "device_type", nullable = false, length = 32)
    private DeviceType deviceType;

    @Column(name = "user_agent", length = 512)
    private String userAgent;

    @Column(name = "referrer", length = 2048)
    private String referrer;

    protected ClickEvent() {
        // For JPA
    }

    public ClickEvent(String shortCode, Instant clickedAt, DeviceType deviceType, String userAgent, String referrer) {
        this.shortCode = shortCode;
        this.clickedAt = clickedAt != null ? clickedAt : Instant.now();
        this.deviceType = deviceType != null ? deviceType : DeviceType.UNKNOWN;
        this.userAgent = userAgent;
        this.referrer = referrer;
    }

    public Long getId() {
        return id;
    }

    public String getShortCode() {
        return shortCode;
    }

    public Instant getClickedAt() {
        return clickedAt;
    }

    public DeviceType getDeviceType() {
        return deviceType;
    }

    public String getUserAgent() {
        return userAgent;
    }

    public String getReferrer() {
        return referrer;
    }
}
