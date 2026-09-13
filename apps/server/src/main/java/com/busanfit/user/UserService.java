package com.busanfit.user;

import com.busanfit.global.security.JwtProvider;
import lombok.RequiredArgsConstructor;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
@RequiredArgsConstructor
public class UserService {
    private final PasswordEncoder passwordEncoder;
    private final UserRepository userRepository;
    private final JwtProvider jwtProvider;

    public User signup(SignRequestDto signRequestDto) {
        // 이메일은 로그인 ID로 쓰이므로 중복 가입을 막습니다.
        if (userRepository.existsByEmail(signRequestDto.getEmail())) {
            throw new IllegalArgumentException("이미 사용 중인 이메일입니다.");
        }

        // 비밀번호는 원문을 저장하지 않고 BCrypt로 암호화해서 저장합니다.
        String password = passwordEncoder.encode(signRequestDto.getPassword());
        User user = User.builder()
                .email(signRequestDto.getEmail())
                .password(password)
                .nickname(signRequestDto.getNickname())
                .build();

        return userRepository.save(user);
    }

    public LoginResponseDto login(LoginRequestDto loginRequestDto) {
        User user = userRepository.findByEmail(loginRequestDto.getEmail())
                .orElseThrow(() -> new IllegalArgumentException("존재하지 않는 이메일입니다."));

        // 사용자가 입력한 비밀번호와 DB에 저장된 암호화 비밀번호를 비교합니다.
        boolean passwordMatches = passwordEncoder.matches(
                loginRequestDto.getPassword(),
                user.getPassword()
        );

        if (!passwordMatches) {
            throw new IllegalArgumentException("비밀번호가 일치하지 않습니다.");
        }

        // 로그인에 성공하면 이후 인증 API에서 사용할 accessToken을 발급합니다.
        String accessToken = jwtProvider.generateAccessToken(user);

        return new LoginResponseDto(
                "로그인 성공",
                user.getId(),
                user.getEmail(),
                user.getNickname(),
                "Bearer",
                accessToken,
                jwtProvider.getAccessTokenExpirationMillis() / 1000
        );
    }
}
