package com.busanfit.global.security;

import com.busanfit.user.User;
import java.nio.charset.StandardCharsets;
import java.time.Clock;
import java.time.Instant;
import java.util.Base64;
import java.util.HashMap;
import java.util.Map;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

@Component
public class JwtProvider {

    // JWT header는 HMAC-SHA256 방식으로 서명한다는 의미입니다.
    private static final String HMAC_ALGORITHM = "HmacSHA256";
    private static final String HEADER = "{\"alg\":\"HS256\",\"typ\":\"JWT\"}";

    private final Clock clock;
    private final byte[] secret;
    private final long accessTokenExpirationMillis;

    @Autowired
    public JwtProvider(
            @Value("${jwt.secret}") String secret,
            @Value("${jwt.access-token-expiration-millis}") long accessTokenExpirationMillis
    ) {
        this(Clock.systemUTC(), secret, accessTokenExpirationMillis);
    }

    JwtProvider(
            Clock clock,
            String secret,
            long accessTokenExpirationMillis
    ) {
        if (secret == null || secret.isBlank()) {
            throw new IllegalArgumentException("JWT secret must not be blank.");
        }
        if (accessTokenExpirationMillis <= 0) {
            throw new IllegalArgumentException("JWT expiration must be greater than 0.");
        }

        this.clock = clock;
        this.secret = secret.getBytes(StandardCharsets.UTF_8);
        this.accessTokenExpirationMillis = accessTokenExpirationMillis;
    }

    public String generateAccessToken(User user) {
        Instant now = clock.instant();
        Instant expiresAt = now.plusMillis(accessTokenExpirationMillis);

        // payload에는 인증에 필요한 최소 사용자 정보와 발급/만료 시간만 담습니다.
        String payload = "{"
                + "\"sub\":\"" + escapeJson(String.valueOf(user.getId())) + "\","
                + "\"email\":\"" + escapeJson(user.getEmail()) + "\","
                + "\"nickname\":\"" + escapeJson(user.getNickname()) + "\","
                + "\"iat\":" + now.getEpochSecond() + ","
                + "\"exp\":" + expiresAt.getEpochSecond()
                + "}";

        // JWT는 base64Url(header).base64Url(payload).signature 구조입니다.
        String unsignedToken = base64Url(HEADER.getBytes(StandardCharsets.UTF_8))
                + "."
                + base64Url(payload.getBytes(StandardCharsets.UTF_8));
        return unsignedToken + "." + sign(unsignedToken);
    }

    public JwtAuthenticatedUser parseToken(String token) {
        String[] parts = token.split("\\.");
        if (parts.length != 3) {
            throw new IllegalArgumentException("Invalid JWT format.");
        }

        // header와 payload를 다시 서명해서 요청 토큰의 signature와 비교합니다.
        String unsignedToken = parts[0] + "." + parts[1];
        String expectedSignature = sign(unsignedToken);
        if (!constantTimeEquals(expectedSignature, parts[2])) {
            throw new IllegalArgumentException("Invalid JWT signature.");
        }

        Map<String, String> payload = readJsonObject(base64UrlDecode(parts[1]));
        long expiresAt = Long.parseLong(required(payload, "exp"));
        // exp는 초 단위 Unix timestamp입니다. 현재 시간이 같거나 지나면 만료로 처리합니다.
        if (clock.instant().getEpochSecond() >= expiresAt) {
            throw new IllegalArgumentException("JWT has expired.");
        }

        Long id = Long.valueOf(required(payload, "sub"));
        String email = required(payload, "email");
        String nickname = required(payload, "nickname");

        return new JwtAuthenticatedUser(id, email, nickname);
    }

    public long getAccessTokenExpirationMillis() {
        return accessTokenExpirationMillis;
    }

    private String base64Url(byte[] value) {
        return Base64.getUrlEncoder().withoutPadding().encodeToString(value);
    }

    private Map<String, String> readJsonObject(byte[] json) {
        String value = new String(json, StandardCharsets.UTF_8).trim();
        if (!value.startsWith("{") || !value.endsWith("}")) {
            throw new IllegalArgumentException("Invalid JWT payload.");
        }

        Map<String, String> result = new HashMap<>();
        String body = value.substring(1, value.length() - 1).trim();
        if (body.isEmpty()) {
            return result;
        }

        for (String entry : splitJsonEntries(body)) {
            int separator = entry.indexOf(':');
            if (separator <= 0) {
                throw new IllegalArgumentException("Invalid JWT payload.");
            }

            String key = unquote(entry.substring(0, separator).trim());
            String entryValue = entry.substring(separator + 1).trim();
            result.put(key, entryValue.startsWith("\"") ? unquote(entryValue) : entryValue);
        }

        return result;
    }

    // 외부 JSON 라이브러리 없이 현재 JWT payload 형태만 읽기 위한 작은 파서입니다.
    private String[] splitJsonEntries(String body) {
        StringBuilder current = new StringBuilder();
        boolean inString = false;
        boolean escaping = false;
        java.util.List<String> entries = new java.util.ArrayList<>();

        for (int i = 0; i < body.length(); i++) {
            char c = body.charAt(i);
            if (escaping) {
                current.append(c);
                escaping = false;
                continue;
            }
            if (c == '\\') {
                current.append(c);
                escaping = true;
                continue;
            }
            if (c == '"') {
                inString = !inString;
            }
            if (c == ',' && !inString) {
                entries.add(current.toString());
                current.setLength(0);
                continue;
            }
            current.append(c);
        }

        entries.add(current.toString());
        return entries.toArray(String[]::new);
    }

    private String required(Map<String, String> payload, String key) {
        String value = payload.get(key);
        if (value == null || value.isBlank()) {
            throw new IllegalArgumentException("Invalid JWT payload.");
        }
        return value;
    }

    private byte[] base64UrlDecode(String value) {
        try {
            return Base64.getUrlDecoder().decode(value);
        } catch (IllegalArgumentException e) {
            throw new IllegalArgumentException("Invalid JWT encoding.", e);
        }
    }

    private String escapeJson(String value) {
        return value
                .replace("\\", "\\\\")
                .replace("\"", "\\\"");
    }

    private String unquote(String value) {
        if (value.length() < 2 || !value.startsWith("\"") || !value.endsWith("\"")) {
            throw new IllegalArgumentException("Invalid JWT payload.");
        }

        String quoted = value.substring(1, value.length() - 1);
        StringBuilder result = new StringBuilder();
        boolean escaping = false;
        for (int i = 0; i < quoted.length(); i++) {
            char c = quoted.charAt(i);
            if (escaping) {
                result.append(c);
                escaping = false;
                continue;
            }
            if (c == '\\') {
                escaping = true;
                continue;
            }
            result.append(c);
        }

        if (escaping) {
            throw new IllegalArgumentException("Invalid JWT payload.");
        }

        return result.toString();
    }

    private String sign(String value) {
        try {
            Mac mac = Mac.getInstance(HMAC_ALGORITHM);
            mac.init(new SecretKeySpec(secret, HMAC_ALGORITHM));
            byte[] signature = mac.doFinal(value.getBytes(StandardCharsets.UTF_8));
            return Base64.getUrlEncoder().withoutPadding().encodeToString(signature);
        } catch (Exception e) {
            throw new IllegalStateException("Failed to sign JWT.", e);
        }
    }

    // signature 비교 시간 차이로 값이 추측되는 것을 줄이기 위해 모든 byte를 끝까지 비교합니다.
    private boolean constantTimeEquals(String expected, String actual) {
        byte[] expectedBytes = expected.getBytes(StandardCharsets.UTF_8);
        byte[] actualBytes = actual.getBytes(StandardCharsets.UTF_8);

        if (expectedBytes.length != actualBytes.length) {
            return false;
        }

        int result = 0;
        for (int i = 0; i < expectedBytes.length; i++) {
            result |= expectedBytes[i] ^ actualBytes[i];
        }
        return result == 0;
    }
}
