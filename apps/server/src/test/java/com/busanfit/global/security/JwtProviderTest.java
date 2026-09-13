package com.busanfit.global.security;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.busanfit.user.User;
import java.time.Clock;
import java.time.Instant;
import java.time.ZoneOffset;
import org.junit.jupiter.api.Test;

class JwtProviderTest {

    private final Clock clock = Clock.fixed(Instant.parse("2026-08-18T00:00:00Z"), ZoneOffset.UTC);
    private final JwtProvider jwtProvider = new JwtProvider(
            clock,
            "test-secret",
            3_600_000
    );

    // 사용자 정보를 기반으로 access token을 만들고, 다시 파싱했을 때 같은 사용자 정보가 나오는지 확인합니다.
    @Test
    void generateAndParseAccessToken() {
        User user = User.builder()
                .id(1L)
                .email("test@example.com")
                .nickname("tester")
                .password("encoded-password")
                .build();

        String token = jwtProvider.generateAccessToken(user);

        JwtAuthenticatedUser authenticatedUser = jwtProvider.parseToken(token);

        assertThat(authenticatedUser.id()).isEqualTo(1L);
        assertThat(authenticatedUser.email()).isEqualTo("test@example.com");
        assertThat(authenticatedUser.nickname()).isEqualTo("tester");
    }

    // 토큰 내용이나 signature가 조작되면 JWT 검증이 실패하는지 확인합니다.
    @Test
    void rejectTamperedToken() {
        User user = User.builder()
                .id(1L)
                .email("test@example.com")
                .nickname("tester")
                .password("encoded-password")
                .build();

        String token = jwtProvider.generateAccessToken(user);
        String tamperedToken = token.substring(0, token.length() - 1) + "x";

        assertThatThrownBy(() -> jwtProvider.parseToken(tamperedToken))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessage("Invalid JWT signature.");
    }
}
