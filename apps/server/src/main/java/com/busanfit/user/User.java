package com.busanfit.user;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.LocalDateTime;
import lombok.AccessLevel;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

@Entity
@Table(
        name = "users",
        uniqueConstraints = {
                @UniqueConstraint(name = "users_email_unique", columnNames = "email"),
                @UniqueConstraint(name = "users_provider_user_id_unique", columnNames = {"provider", "provider_user_id"})
        }
)
@Getter
@Builder
@AllArgsConstructor
@NoArgsConstructor(access = AccessLevel.PROTECTED)
public class User {

    // 사용자 고유 ID, DB에서 자동 증가합니다.
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    // 로그인 제공자입니다. 일반 회원가입은 기본값 LOCAL을 사용합니다.
    @Builder.Default
    @Column(nullable = false, length = 30)
    private String provider = "LOCAL";

    // 소셜 로그인 제공자가 내려주는 사용자 ID입니다. LOCAL 사용자는 비어 있을 수 있습니다.
    @Column(name = "provider_user_id", length = 100)
    private String providerUserId;

    // 사용자 이메일입니다. 로그인 식별자로 쓰이며 중복될 수 없습니다.
    @Column(nullable = false, unique = true, length = 255)
    private String email;

    // 서비스에서 표시할 사용자 닉네임입니다.
    @Column(nullable = false, length = 50)
    private String nickname;

    // 로그인에 사용할 비밀번호입니다.
    @Column(nullable = false, length = 255)
    private String password;

    // 사용자가 처음 생성된 시각입니다.
    @CreationTimestamp // 엔터티가 시간을 자동생성해서 입력해준다.
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    // 사용자 정보가 마지막으로 수정된 시각입니다.
    @UpdateTimestamp // 엔터티가 수정 시간을 자동 관리해준다.
    @Column(name = "updated_at", nullable = false)
    private LocalDateTime updatedAt;
}
