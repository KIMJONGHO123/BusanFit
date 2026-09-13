package com.busanfit.user;

import static org.assertj.core.api.Assertions.assertThat;

import com.busanfit.global.security.JwtAuthenticatedUser;
import com.busanfit.global.security.JwtProvider;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
class UserServiceJwtIntegrationTest {

    @Autowired
    private UserService userService;

    @Autowired
    private UserRepository userRepository;

    @Autowired
    private JwtProvider jwtProvider;

    // 회원가입으로 사용자가 DB에 저장되고, 로그인 시 유효한 JWT가 발급되는지 한 번에 확인하는 통합 테스트입니다.
    @Test
    void signupSavesUserToDatabaseAndLoginReturnsValidJwt() {
        SignRequestDto signupRequest = new SignRequestDto(
                "jwt-user@example.com",
                "password123!",
                "jwtTester"
        );

        User savedUser = userService.signup(signupRequest);

        // H2 테스트 DB에 사용자가 실제로 저장됐는지 확인합니다.
        User userInDatabase = userRepository.findByEmail("jwt-user@example.com")
                .orElseThrow();
        assertThat(userInDatabase.getId()).isEqualTo(savedUser.getId());
        assertThat(userInDatabase.getEmail()).isEqualTo("jwt-user@example.com");
        assertThat(userInDatabase.getNickname()).isEqualTo("jwtTester");
        assertThat(userInDatabase.getPassword()).isNotEqualTo("password123!");

        // DB에 저장된 계정 정보로 로그인하면 Bearer access token이 내려오는지 확인합니다.
        LoginResponseDto loginResponse = userService.login(new LoginRequestDto(
                "jwt-user@example.com",
                "password123!"
        ));

        assertThat(loginResponse.getTokenType()).isEqualTo("Bearer");
        assertThat(loginResponse.getEmail()).isEqualTo("jwt-user@example.com");
        assertThat(loginResponse.getAccessToken()).isNotBlank();
        assertThat(loginResponse.getExpiresIn()).isEqualTo(3600);

        // 발급된 JWT를 파싱했을 때 DB 사용자와 같은 id/email/nickname을 담고 있는지 확인합니다.
        JwtAuthenticatedUser authenticatedUser = jwtProvider.parseToken(loginResponse.getAccessToken());
        assertThat(authenticatedUser.id()).isEqualTo(savedUser.getId());
        assertThat(authenticatedUser.email()).isEqualTo("jwt-user@example.com");
        assertThat(authenticatedUser.nickname()).isEqualTo("jwtTester");
    }
}
