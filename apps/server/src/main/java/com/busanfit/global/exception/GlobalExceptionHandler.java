package com.busanfit.global.exception;

import com.busanfit.global.external.tmap.TmapApiException;
import com.busanfit.global.external.tourapi.TourApiException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class GlobalExceptionHandler {

    // 사용자가 잘못된 값을 보냈거나 비즈니스 규칙을 위반했을 때 400으로 응답합니다.
    @ExceptionHandler(IllegalArgumentException.class)
    public ResponseEntity<String> handlerIllegalArgumentException(IllegalArgumentException e) {
        return ResponseEntity.badRequest().body(e.getMessage());
    }

    // @Valid 검증 실패 시 첫 번째 필드 오류 메시지를 그대로 반환합니다.
    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<String> handlerMethodArgumentNotValidException(MethodArgumentNotValidException e) {
        String message = e.getBindingResult().getFieldError().getDefaultMessage();
        return ResponseEntity.badRequest().body(message);
    }

    @ExceptionHandler(TmapApiException.class)
    public ResponseEntity<String> handleTmapApiException(TmapApiException e) {
        // 외부 TMAP 장애는 BusanFit 서버 내부 오류가 아니라 외부 연동 실패로 구분합니다.
        return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(e.getMessage());
    }
    @ExceptionHandler(TourApiException.class)
    public ResponseEntity<String> handleTourApiException(TourApiException e) {
        return ResponseEntity.status(HttpStatus.BAD_GATEWAY).body(e.getMessage());
    }
}
