package com.busanfit.user;

import com.busanfit.global.security.JwtAuthenticatedUser;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/user")
@RequiredArgsConstructor
public class UserController {
    private final UserService userService;

    @PostMapping("/signup")
    public ResponseEntity<SignResponseDto> signup(@Valid @RequestBody SignRequestDto signRequestDto) {
        // 모바일 회원가입 화면에서 보낸 email/password/nickname으로 새 사용자를 생성합니다.
        User user = userService.signup(signRequestDto);

        SignResponseDto signResponseDto = new SignResponseDto(
                "회원가입 성공",
                user.getId(),
                user.getNickname()
        );

        return ResponseEntity.ok(signResponseDto);
    }

    @PostMapping("/login")
    public ResponseEntity<LoginResponseDto> login(@Valid @RequestBody LoginRequestDto loginRequestDto) {
        // 로그인 성공 시 모바일이 저장할 JWT accessToken을 함께 내려줍니다.
        LoginResponseDto loginResponseDto = userService.login(loginRequestDto);

        return ResponseEntity.ok(loginResponseDto);
    }

    @GetMapping("/me")
    public ResponseEntity<CurrentUserResponseDto> me(
            @AuthenticationPrincipal JwtAuthenticatedUser authenticatedUser
    ) {
        // JwtAuthenticationFilter가 토큰을 검증한 뒤 넣어둔 현재 사용자 정보를 반환합니다.
        return ResponseEntity.ok(new CurrentUserResponseDto(
                authenticatedUser.id(),
                authenticatedUser.email(),
                authenticatedUser.nickname()
        ));
    }
}
