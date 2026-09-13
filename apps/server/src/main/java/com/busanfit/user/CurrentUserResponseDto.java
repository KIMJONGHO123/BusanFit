package com.busanfit.user;

public record CurrentUserResponseDto(
        Long id,
        String email,
        String nickname
) {
}
