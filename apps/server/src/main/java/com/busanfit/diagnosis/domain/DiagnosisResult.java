package com.busanfit.diagnosis.domain;

import java.time.OffsetDateTime;
import java.util.List;

public record DiagnosisResult(String diagnosisId, DiagnosisDecision decision, VerificationStatus verificationStatus,
                              String summary, DiagnosisSchedule schedule, List<RuleResult> ruleResults,
                              List<Coverage> coverage, OffsetDateTime diagnosedAt, List<DataReference> dataReferences) {
    public record Coverage(String ruleId, RuleScope scope, RuleResult.Target target,
                           RuleResult.EvaluationStatus evaluationStatus, String reason) { }
    public record DataReference(String kind, String targetId, String source, OffsetDateTime checkedAt,
                                boolean confirmed, String limitation) { }

    public DiagnosisResult {
        ruleResults = List.copyOf(ruleResults);
        coverage = List.copyOf(coverage);
        dataReferences = List.copyOf(dataReferences);
    }
}
