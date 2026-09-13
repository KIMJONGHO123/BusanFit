package com.busanfit.planner;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/planner")
@RequiredArgsConstructor
public class PlannerController {

    private final PlannerDiagnosisService plannerDiagnosisService;

    @PostMapping("/diagnose")
    public ResponseEntity<DiagnoseScheduleResponseDto> diagnose(
            @Valid @RequestBody DiagnoseScheduleRequestDto request
    ) {
        // 모바일에서 전달한 여행 조건과 방문 순서를 기준으로 일정 실행 가능성을 계산합니다.
        return ResponseEntity.ok(plannerDiagnosisService.diagnose(request));
    }
}
