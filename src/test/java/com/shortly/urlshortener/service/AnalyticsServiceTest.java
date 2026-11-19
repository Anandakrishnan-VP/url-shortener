package com.shortly.urlshortener.service;

import com.shortly.urlshortener.model.ClickEvent;
import com.shortly.urlshortener.model.DeviceType;
import com.shortly.urlshortener.repository.ClickEventRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.verify;

@ExtendWith(MockitoExtension.class)
class AnalyticsServiceTest {

    @Mock
    private ClickEventRepository clickEventRepository;

    private AnalyticsService analyticsService;

    @BeforeEach
    void setUp() {
        analyticsService = new AnalyticsService(clickEventRepository);
    }

    @Test
    @DisplayName("Parse device types correctly")
    void testParseDevice() {
        assertEquals(DeviceType.UNKNOWN, analyticsService.parseDevice(null));
        assertEquals(DeviceType.UNKNOWN, analyticsService.parseDevice(""));
        assertEquals(DeviceType.BOT, analyticsService.parseDevice("Googlebot/2.1 (+http://www.google.com/bot.html)"));
        assertEquals(DeviceType.BOT, analyticsService.parseDevice("Mozilla/5.0 (compatible; Yahoo! Slurp; spider)"));
        assertEquals(DeviceType.TABLET, analyticsService.parseDevice("Mozilla/5.0 (iPad; CPU OS 12_2 like Mac OS X)"));
        assertEquals(DeviceType.TABLET, analyticsService.parseDevice("Mozilla/5.0 (Android; Tablet; rv:68.0)"));
        assertEquals(DeviceType.MOBILE, analyticsService.parseDevice("Mozilla/5.0 (iPhone; CPU iPhone OS 14_0 like Mac OS X)"));
        assertEquals(DeviceType.MOBILE, analyticsService.parseDevice("Mozilla/5.0 (Linux; Android 10; SM-A505FN)"));
        assertEquals(DeviceType.DESKTOP, analyticsService.parseDevice("Mozilla/5.0 (Windows NT 10.0; Win64; x64)"));
    }

    @Test
    @DisplayName("recordClick creates and saves ClickEvent")
    void testRecordClick() {
        analyticsService.recordClick("100000", "Mozilla/5.0 (iPhone)", "https://google.com");

        ArgumentCaptor<ClickEvent> captor = ArgumentCaptor.forClass(ClickEvent.class);
        verify(clickEventRepository).save(captor.capture());

        ClickEvent saved = captor.getValue();
        assertEquals("100000", saved.getShortCode());
        assertEquals(DeviceType.MOBILE, saved.getDeviceType());
        assertEquals("https://google.com", saved.getReferrer());
    }
}
