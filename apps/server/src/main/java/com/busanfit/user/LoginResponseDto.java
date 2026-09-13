package com.busanfit.user;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class LoginResponseDto {
    private String message;
    private Long id;
    private String email;
    private String nickname;
    private String tokenType;
    private String accessToken;
    private long expiresIn;
}
