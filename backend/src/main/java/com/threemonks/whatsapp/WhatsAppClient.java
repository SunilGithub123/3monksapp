package com.threemonks.whatsapp;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.net.URI;
import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.time.Duration;
import java.util.Map;

/**
 * Sends plain-text replies through Meta's WhatsApp Cloud API. The bot only ever
 * replies to someone who has just messaged it, which is free (a service message
 * inside the 24-hour window); it never starts a conversation.
 */
@Component
public class WhatsAppClient {

    private static final Logger logger = LoggerFactory.getLogger(WhatsAppClient.class);
    /** WhatsApp's limit is 4096 characters per text message. */
    static final int MAX_TEXT = 4000;

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final HttpClient http = HttpClient.newBuilder().connectTimeout(Duration.ofSeconds(10)).build();
    private final String accessToken;
    private final String phoneNumberId;
    private final String graphBaseUrl;
    private final String graphVersion;

    public WhatsAppClient(@Value("${app.whatsapp.access-token:}") String accessToken,
                          @Value("${app.whatsapp.phone-number-id:}") String phoneNumberId,
                          @Value("${app.whatsapp.graph-base-url:https://graph.facebook.com}") String graphBaseUrl,
                          @Value("${app.whatsapp.graph-version:v21.0}") String graphVersion) {
        this.accessToken = accessToken;
        this.phoneNumberId = phoneNumberId;
        this.graphBaseUrl = graphBaseUrl;
        this.graphVersion = graphVersion;
    }

    /** Sends one text message (the caller keeps it under {@link #MAX_TEXT}). */
    public boolean sendText(String to, String body) {
        try {
            String json = objectMapper.writeValueAsString(Map.of(
                    "messaging_product", "whatsapp",
                    "recipient_type", "individual",
                    "to", to,
                    "type", "text",
                    "text", Map.of("preview_url", false, "body", body)));
            HttpRequest request = HttpRequest.newBuilder()
                    .uri(URI.create(graphBaseUrl + "/" + graphVersion + "/" + phoneNumberId + "/messages"))
                    .timeout(Duration.ofSeconds(15))
                    .header("Authorization", "Bearer " + accessToken)
                    .header("Content-Type", "application/json")
                    .POST(HttpRequest.BodyPublishers.ofString(json))
                    .build();
            HttpResponse<String> response = http.send(request, HttpResponse.BodyHandlers.ofString());
            if (response.statusCode() / 100 != 2) {
                logger.warn("WhatsApp send to {} failed: HTTP {} {}", mask(to), response.statusCode(), response.body());
                return false;
            }
            return true;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return false;
        } catch (Exception e) {
            logger.warn("WhatsApp send to {} failed: {}", mask(to), e.getMessage());
            return false;
        }
    }

    /** Last 4 digits only, so logs never hold full phone numbers. */
    static String mask(String phone) {
        return phone == null || phone.length() < 4 ? "****" : "****" + phone.substring(phone.length() - 4);
    }
}
