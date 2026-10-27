package com.busanfit.diagnosis.api;

import com.busanfit.diagnosis.application.DiagnosisService;
import com.busanfit.diagnosis.domain.DiagnosisResult;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v2/planner")
public class DiagnosisController {
    private final DiagnosisService service;

    public DiagnosisController(DiagnosisService service) {
        this.service = service;
    }

    @PostMapping("/diagnose")
    public DiagnosisResult diagnose(@Valid @RequestBody DiagnosisRequest request) {
        return service.diagnose(request.toCommand());
    }
}
