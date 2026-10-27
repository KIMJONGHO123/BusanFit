package com.busanfit.diagnosis.domain;

import static com.busanfit.diagnosis.domain.RuleResult.EvaluationStatus.EVALUATED;
import static com.busanfit.diagnosis.domain.RuleResult.EvaluationStatus.UNVERIFIABLE;

import java.time.Clock;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

public final class DiagnosisEngine {
    private final RuleRegistry registry;
    private final Clock clock;

    public DiagnosisEngine(RuleRegistry registry, Clock clock) {
        this.registry = registry;
        this.clock = clock;
    }

    public DiagnosisResult diagnose(DiagnosisContext context) {
        var schedule = new ScheduleCalculator().calculate(context);
        var results = new ArrayList<RuleResult>();
        for (var selection : registry.select(context)) {
            var rule = selection.rule();
            var evaluated = rule.evaluate(context, schedule, selection.target());
            if (evaluated.isEmpty()) {
                throw new IllegalStateException("선택한 평가 항목의 결과가 없습니다.");
            }
            for (var result : evaluated) {
                if (!rule.id().equals(result.ruleId()) || !rule.scope().equals(result.scope())
                        || rule.importance() != result.importance() || !selection.target().equals(result.target())) {
                    throw new IllegalStateException("Rule 등록 정보와 평가 대상이 일치하지 않습니다.");
                }
                results.add(result);
            }
        }
        VerificationStatus verification = verification(results);
        DiagnosisDecision decision = decision(results, schedule.calculationComplete());
        var coverage = results.stream().map(r -> new DiagnosisResult.Coverage(
                r.ruleId(), r.scope(), r.target(), r.evaluationStatus(), r.reason())).toList();
        return new DiagnosisResult(UUID.randomUUID().toString(), decision, verification,
                decision + " · " + verification + (verification == VerificationStatus.VERIFIED
                        ? ": 적용 대상 항목을 확인했습니다." : ": 확인하지 못한 항목과 지원 범위를 함께 확인해 주세요."),
                schedule, results, coverage, OffsetDateTime.now(clock), references(context));
    }

    private VerificationStatus verification(List<RuleResult> results) {
        boolean evaluated = results.stream().anyMatch(r -> r.evaluationStatus() == EVALUATED);
        boolean unknown = results.stream().anyMatch(r -> r.evaluationStatus() == UNVERIFIABLE);
        return !evaluated ? VerificationStatus.UNKNOWN
                : unknown ? VerificationStatus.PARTIAL : VerificationStatus.VERIFIED;
    }

    private DiagnosisDecision decision(List<RuleResult> results, boolean timeComplete) {
        if (results.stream().anyMatch(r -> r.outcome() == RuleResult.Outcome.ADJUSTMENT_REQUIRED)) {
            return DiagnosisDecision.ADJUSTMENT_REQUIRED;
        }
        if (!timeComplete || results.stream().noneMatch(r -> r.evaluationStatus() == EVALUATED)) {
            return DiagnosisDecision.UNDETERMINED;
        }
        return results.stream().anyMatch(r -> r.outcome() == RuleResult.Outcome.CAUTION)
                ? DiagnosisDecision.CAUTION : DiagnosisDecision.POSSIBLE;
    }

    private List<DiagnosisResult.DataReference> references(DiagnosisContext context) {
        var references = new ArrayList<DiagnosisResult.DataReference>();
        for (var stop : context.stops()) {
            references.add(reference("PLACE", stop.placeId(), stop.place()));
            if (stop.place().confirmed()) {
                references.add(reference("REGION", stop.placeId(), stop.place().value().region()));
            }
            references.add(reference("RECOMMENDED_STAY", stop.placeId(), stop.recommendedTotalStaySeconds()));
        }
        for (var segment : context.segments()) {
            references.add(reference("ROUTE", segment.segmentId(), segment.route()));
        }
        return List.copyOf(references);
    }

    private DiagnosisResult.DataReference reference(String kind, String targetId, Evidence<?> evidence) {
        return new DiagnosisResult.DataReference(kind, targetId, evidence.source(), evidence.checkedAt(),
                evidence.confirmed(), evidence.limitation());
    }
}
