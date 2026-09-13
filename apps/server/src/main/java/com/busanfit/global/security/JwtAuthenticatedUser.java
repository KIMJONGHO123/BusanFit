package com.busanfit.global.security;

public record JwtAuthenticatedUser(
        Long id,
        String email,
        String nickname
) {
}
