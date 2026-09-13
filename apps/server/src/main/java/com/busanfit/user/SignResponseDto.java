package com.busanfit.user;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@AllArgsConstructor
@NoArgsConstructor
public class SignResponseDto {
    private String message;
    private Long id;
    private String nickname;
}
