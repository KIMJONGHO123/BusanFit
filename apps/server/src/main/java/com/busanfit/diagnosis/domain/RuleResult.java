package com.busanfit.diagnosis.domain;

import java.util.Objects;

public record RuleResult(String ruleId, RuleScope scope, Importance importance, Target target,
                         EvaluationStatus evaluationStatus, Outcome outcome,
                         String condition, String reason, String adjustment) {
    public enum Importance { NORMAL, IMPORTANT, CRITICAL }
    public enum EvaluationStatus { EVALUATED, UNVERIFIABLE, NOT_APPLICABLE }
    public enum Outcome { PASS, CAUTION, ADJUSTMENT_REQUIRED }
    public enum TargetType { SCHEDULE, STOP, SEGMENT }

    public record Target(TargetType type, Integer stopIndex, String placeId, String segmentId,
                         String from, String to) {
        public Target {
            Objects.requireNonNull(type);
            if (type == TargetType.STOP && (stopIndex == null || stopIndex < 0 || placeId == null)
                    || type == TargetType.SEGMENT && (segmentId == null || from == null || to == null)) {
                throw new IllegalArgumentException("평가 대상 식별자가 필요합니다.");
            }
        }

        public static Target schedule() {
            return new Target(TargetType.SCHEDULE, null, null, null, null, null);
        }

        public static Target stop(int index, String id) {
            return new Target(TargetType.STOP, index, id, null, null, null);
        }

        public static Target segment(String id, String from, String to) {
            return new Target(TargetType.SEGMENT, null, null, id, from, to);
        }
    }

    public RuleResult {
        Objects.requireNonNull(scope);
        Objects.requireNonNull(importance);
        Objects.requireNonNull(target);
        Objects.requireNonNull(evaluationStatus);
        if (ruleId == null || ruleId.isBlank() || condition == null || condition.isBlank()
                || reason == null || reason.isBlank()
                || ((evaluationStatus == EvaluationStatus.EVALUATED) != (outcome != null))) {
            throw new IllegalArgumentException("Rule 평가 상태·결과·근거가 올바르지 않습니다.");
        }
    }
}
