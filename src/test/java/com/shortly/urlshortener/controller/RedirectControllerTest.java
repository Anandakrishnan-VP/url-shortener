package com.shortly.urlshortener.controller;

import com.shortly.urlshortener.cache.CachedLink;
import com.shortly.urlshortener.exception.GlobalExceptionHandler;
import com.shortly.urlshortener.exception.LinkExpiredException;
import com.shortly.urlshortener.exception.LinkNotFoundException;
import com.shortly.urlshortener.service.AnalyticsService;
import com.shortly.urlshortener.service.UrlService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.test.web.servlet.MockMvc;

import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(RedirectController.class)
@Import(GlobalExceptionHandler.class)
class RedirectControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockBean
    private UrlService urlService;

    @MockBean
    private AnalyticsService analyticsService;

    @Test
    @DisplayName("GET /{code} returns 302 and redirects with Location header")
    void testRedirectSuccess() throws Exception {
        when(urlService.resolve("100000")).thenReturn(new CachedLink("https://google.com", null));

        mockMvc.perform(get("/100000")
                        .header("User-Agent", "Mozilla/5.0")
                        .header("Referer", "https://twitter.com"))
                .andExpect(status().isFound())
                .andExpect(header().string("Location", "https://google.com"));

        verify(analyticsService).recordClick(eq("100000"), eq("Mozilla/5.0"), eq("https://twitter.com"));
    }

    @Test
    @DisplayName("GET /{code} returns 404 for missing code")
    void testRedirectNotFound() throws Exception {
        when(urlService.resolve("missing")).thenThrow(new LinkNotFoundException("Short link not found: missing"));

        mockMvc.perform(get("/missing"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404));
    }

    @Test
    @DisplayName("GET /{code} returns 410 for expired code")
    void testRedirectExpired() throws Exception {
        when(urlService.resolve("expired")).thenThrow(new LinkExpiredException("Link has expired: expired"));

        mockMvc.perform(get("/expired"))
                .andExpect(status().isGone())
                .andExpect(jsonPath("$.status").value(410));
    }
}
