package com.shortly.urlshortener.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.shortly.urlshortener.dto.CreateLinkRequest;
import com.shortly.urlshortener.dto.DayCount;
import com.shortly.urlshortener.dto.DeviceCount;
import com.shortly.urlshortener.dto.LinkResponse;
import com.shortly.urlshortener.dto.StatsResponse;
import com.shortly.urlshortener.exception.AliasAlreadyExistsException;
import com.shortly.urlshortener.exception.GlobalExceptionHandler;
import com.shortly.urlshortener.exception.InvalidUrlException;
import com.shortly.urlshortener.exception.LinkNotFoundException;
import com.shortly.urlshortener.service.UrlService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.context.annotation.Import;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(LinkController.class)
@Import(GlobalExceptionHandler.class)
class LinkControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private UrlService urlService;

    @Test
    @DisplayName("POST /api/links returns 201 on valid input")
    void testCreateLinkSuccess() throws Exception {
        CreateLinkRequest request = new CreateLinkRequest("https://github.com", null, null);
        LinkResponse response = new LinkResponse("100000", "http://localhost:8080/100000", "https://github.com", null);

        when(urlService.createLink(any())).thenReturn(response);

        mockMvc.perform(post("/api/links")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.shortCode").value("100000"))
                .andExpect(jsonPath("$.shortUrl").value("http://localhost:8080/100000"))
                .andExpect(jsonPath("$.originalUrl").value("https://github.com"));
    }

    @Test
    @DisplayName("POST /api/links with invalid URL returns 400")
    void testCreateLinkInvalidUrl() throws Exception {
        CreateLinkRequest request = new CreateLinkRequest("javascript:alert(1)", null, null);
        when(urlService.createLink(any())).thenThrow(new InvalidUrlException("Invalid URL scheme"));

        mockMvc.perform(post("/api/links")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.status").value(400))
                .andExpect(jsonPath("$.message").value("Invalid URL scheme"));
    }

    @Test
    @DisplayName("POST /api/links with duplicate alias returns 409")
    void testCreateLinkDuplicateAlias() throws Exception {
        CreateLinkRequest request = new CreateLinkRequest("https://example.com", "my-alias", null);
        when(urlService.createLink(any())).thenThrow(new AliasAlreadyExistsException("Alias 'my-alias' already exists"));

        mockMvc.perform(post("/api/links")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.status").value(409))
                .andExpect(jsonPath("$.message").value("Alias 'my-alias' already exists"));
    }

    @Test
    @DisplayName("GET /api/links/{code}/stats returns stats")
    void testGetStatsSuccess() throws Exception {
        StatsResponse stats = new StatsResponse(
                "my-link",
                "https://example.com",
                5L,
                List.of(new DayCount(LocalDate.of(2026, 11, 19), 5L)),
                List.of(new DeviceCount("MOBILE", 3L), new DeviceCount("DESKTOP", 2L))
        );

        when(urlService.getStats("my-link")).thenReturn(stats);

        mockMvc.perform(get("/api/links/my-link/stats"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.shortCode").value("my-link"))
                .andExpect(jsonPath("$.totalClicks").value(5))
                .andExpect(jsonPath("$.devices[0].device").value("MOBILE"))
                .andExpect(jsonPath("$.devices[0].count").value(3));
    }

    @Test
    @DisplayName("GET /api/links/{code}/stats returns 404 if not found")
    void testGetStatsNotFound() throws Exception {
        when(urlService.getStats("unknown")).thenThrow(new LinkNotFoundException("Short link not found: unknown"));

        mockMvc.perform(get("/api/links/unknown/stats"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.status").value(404));
    }
}
