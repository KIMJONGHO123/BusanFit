package com.busanfit.diagnosis.domain;

import static com.busanfit.diagnosis.domain.RuleResult.EvaluationStatus.EVALUATED;
import static com.busanfit.diagnosis.domain.RuleResult.EvaluationStatus.UNVERIFIABLE;
import static com.busanfit.diagnosis.domain.RuleResult.Importance.IMPORTANT;
import static com.busanfit.diagnosis.domain.RuleResult.Importance.NORMAL;
import static com.busanfit.diagnosis.domain.RuleResult.Outcome.ADJUSTMENT_REQUIRED;
import static com.busanfit.diagnosis.domain.RuleResult.Outcome.CAUTION;
import static com.busanfit.diagnosis.domain.RuleResult.Outcome.PASS;

import java.util.List;
import java.util.stream.IntStream;

public final class CoreRules {
    private CoreRules() { }

    public record Policy(long lowRemainingSeconds, double highTravelRatio) {
        public Policy {
            if (lowRemainingSeconds < 0 || !Double.isFinite(highTravelRatio)
                    || highTravelRatio < 0 || highTravelRatio > 1) {
                throw new IllegalArgumentException("진단 임계값이 올바르지 않습니다.");
            }
        }

        public static Policy defaults() {
            return new Policy(1800, 0.4);
        }
    }

    public static List<DiagnosisRule> national(Policy policy) {
        return List.of(new Travel(), new FixedVisit(), new Conflict(), new EndTime(), new Stay(),
                new Remaining(policy), new TravelRatio(policy), new RegionApplicability(),
                new Unsupported("OPERATING_HOURS", RuleScope.national(), IMPORTANT, "운영정보 연동·해석 미지원"),
                new Unsupported("WEATHER", RuleScope.national(), IMPORTANT, "날씨 연동·위험 임계값 미정"));
    }

    abstract static class Base implements DiagnosisRule {
        private final String id;
        private final RuleScope scope;
        private final RuleResult.Importance importance;

        Base(String id, RuleResult.Importance importance) {
            this(id, RuleScope.national(), importance);
        }

        Base(String id, RuleScope scope, RuleResult.Importance importance) {
            this.id = id;
            this.scope = scope;
            this.importance = importance;
        }

        @Override
        public String id() { return id; }
        @Override
        public RuleScope scope() { return scope; }
        @Override
        public RuleResult.Importance importance() { return importance; }
        @Override
        public List<RuleResult.Target> targets(DiagnosisContext context) {
            return List.of(RuleResult.Target.schedule());
        }

        List<RuleResult.Target> stopTargets(DiagnosisContext context) {
            return IntStream.range(0, context.stops().size())
                    .mapToObj(i -> RuleResult.Target.stop(i, context.stops().get(i).placeId())).toList();
        }

        RuleResult evaluated(RuleResult.Target target, RuleResult.Outcome outcome, String reason) {
            return new RuleResult(id, scope, importance, target, EVALUATED, outcome, id, reason,
                    outcome == PASS ? null : "방문 순서·방문시간·최종 체류시간을 조정해 주세요.");
        }

        RuleResult unavailable(RuleResult.Target target, String reason) {
            return new RuleResult(id, scope, importance, target, UNVERIFIABLE, null, id, reason,
                    "확인하지 못한 정보와 지원 범위를 확인해 주세요.");
        }
    }

    public static final class Unsupported extends Base {
        private final String reason;

        public Unsupported(String id, RuleScope scope, RuleResult.Importance importance, String reason) {
            super(id, scope, importance);
            this.reason = reason;
        }

        @Override
        public List<RuleResult.Target> targets(DiagnosisContext context) { return stopTargets(context); }
        @Override
        public List<RuleResult> evaluate(DiagnosisContext context, DiagnosisSchedule schedule, RuleResult.Target target) {
            return List.of(unavailable(target, reason));
        }
    }

    static final class Travel extends Base {
        Travel() { super("TRAVEL_TIME", IMPORTANT); }
        @Override
        public List<RuleResult.Target> targets(DiagnosisContext context) {
            return context.segments().stream()
                    .map(s -> RuleResult.Target.segment(s.segmentId(), s.from(), s.to())).toList();
        }
        @Override
        public List<RuleResult> evaluate(DiagnosisContext context, DiagnosisSchedule schedule, RuleResult.Target target) {
            var route = context.segments().stream().filter(s -> s.segmentId().equals(target.segmentId()))
                    .findFirst().orElseThrow().route();
            return List.of(route.confirmed() ? evaluated(target, PASS, "조회 시점의 예상 이동시간을 확인했습니다.")
                    : unavailable(target, route.limitation()));
        }
    }

    static final class FixedVisit extends Base {
        FixedVisit() { super("FIXED_VISIT_ARRIVAL", IMPORTANT); }
        @Override
        public List<RuleResult.Target> targets(DiagnosisContext context) {
            return stopTargets(context).stream()
                    .filter(t -> context.stops().get(t.stopIndex()).plannedVisitTime() != null).toList();
        }
        @Override
        public List<RuleResult> evaluate(DiagnosisContext context, DiagnosisSchedule schedule, RuleResult.Target target) {
            var timing = schedule.stops().get(target.stopIndex());
            return List.of(timing.arrival() == null ? unavailable(target, "예상 도착시각을 계산할 수 없습니다.")
                    : evaluated(target, timing.arrival().isAfter(timing.plannedVisitTime()) ? ADJUSTMENT_REQUIRED : PASS,
                    "예상 도착시각과 고정 방문시간을 비교했습니다."));
        }
    }

    static final class Conflict extends Base {
        Conflict() { super("SCHEDULE_CONFLICT", IMPORTANT); }
        @Override
        public List<RuleResult.Target> targets(DiagnosisContext context) {
            return stopTargets(context).stream().filter(t -> t.stopIndex() > 0
                    && context.stops().get(t.stopIndex()).plannedVisitTime() != null).toList();
        }
        @Override
        public List<RuleResult> evaluate(DiagnosisContext context, DiagnosisSchedule schedule, RuleResult.Target target) {
            int index = target.stopIndex();
            var current = context.stops().get(index);
            var previous = schedule.stops().get(index - 1);
            var previousEnd = previous.departure();
            if (previousEnd == null && previous.plannedVisitTime() != null) {
                previousEnd = previous.plannedVisitTime().plusSeconds(previous.plannedStaySeconds());
            }
            if (previousEnd != null && current.plannedVisitTime().isBefore(previousEnd)) {
                return List.of(evaluated(target, ADJUSTMENT_REQUIRED, "앞 장소의 방문 구간과 고정 방문시간이 겹칩니다."));
            }
            return List.of(previous.departure() == null ? unavailable(target, "앞 장소의 실제 출발시각이 미확인입니다.")
                    : evaluated(target, PASS, "앞 방문 구간과 고정 방문시간이 겹치지 않습니다."));
        }
    }

    static final class EndTime extends Base {
        EndTime() { super("SCHEDULE_END", IMPORTANT); }
        @Override
        public List<RuleResult> evaluate(DiagnosisContext context, DiagnosisSchedule schedule, RuleResult.Target target) {
            if (provesOverrun(context)) {
                return List.of(evaluated(target, ADJUSTMENT_REQUIRED, "확인된 시간만으로 여행 종료시간 초과가 증명됩니다."));
            }
            return List.of(schedule.calculationComplete() ? evaluated(target, PASS, "여행 종료시간 안에 일정을 마칩니다.")
                    : unavailable(target, "이동시간 미확인으로 일정 종료시각을 계산할 수 없습니다."));
        }

        private boolean provesOverrun(DiagnosisContext context) {
            // This bound proves violations only. It is never exposed as an estimated or exact timestamp.
            var departureLowerBound = context.start();
            for (int i = 0; i < context.stops().size(); i++) {
                var route = context.segments().get(i).route();
                if (route.confirmed()) {
                    departureLowerBound = departureLowerBound.plusSeconds(route.value().seconds());
                }
                var stop = context.stops().get(i);
                if (stop.plannedVisitTime() != null && stop.plannedVisitTime().isAfter(departureLowerBound)) {
                    departureLowerBound = stop.plannedVisitTime();
                }
                departureLowerBound = departureLowerBound.plusSeconds(stop.plannedStaySeconds());
                if (departureLowerBound.isAfter(context.end())) {
                    return true;
                }
            }
            return false;
        }
    }

    static final class Stay extends Base {
        Stay() { super("RECOMMENDED_STAY", NORMAL); }
        @Override
        public List<RuleResult.Target> targets(DiagnosisContext context) { return stopTargets(context); }
        @Override
        public List<RuleResult> evaluate(DiagnosisContext context, DiagnosisSchedule schedule, RuleResult.Target target) {
            var stop = context.stops().get(target.stopIndex());
            var recommendation = stop.recommendedTotalStaySeconds();
            return List.of(recommendation.confirmed() ? evaluated(target,
                    stop.plannedStaySeconds() < recommendation.value() ? CAUTION : PASS,
                    "근거와 활동 포함 범위가 확인된 권장 총시간과 최종 체류시간을 비교했습니다.")
                    : unavailable(target, recommendation.limitation()));
        }
    }

    static final class Remaining extends Base {
        private final Policy policy;
        Remaining(Policy policy) { super("REMAINING_TIME", NORMAL); this.policy = policy; }
        @Override
        public List<RuleResult> evaluate(DiagnosisContext context, DiagnosisSchedule schedule, RuleResult.Target target) {
            return List.of(schedule.remainingSeconds() == null ? unavailable(target, "정확한 잔여시간을 계산할 수 없습니다.")
                    : evaluated(target, schedule.remainingSeconds() >= 0
                    && schedule.remainingSeconds() < policy.lowRemainingSeconds() ? CAUTION : PASS,
                    "잔여시간과 여유시간 주의 기준을 비교했습니다."));
        }
    }

    static final class TravelRatio extends Base {
        private final Policy policy;
        TravelRatio(Policy policy) { super("TRAVEL_RATIO", NORMAL); this.policy = policy; }
        @Override
        public List<RuleResult> evaluate(DiagnosisContext context, DiagnosisSchedule schedule, RuleResult.Target target) {
            return List.of(schedule.totalTravelSeconds() == null ? unavailable(target, "총 이동시간이 미확인입니다.")
                    : evaluated(target, (double) schedule.totalTravelSeconds() / schedule.availableSeconds()
                    >= policy.highTravelRatio() ? CAUTION : PASS, "사용 가능 시간 중 이동시간 비율을 비교했습니다."));
        }
    }

    static final class RegionApplicability extends Base {
        RegionApplicability() { super("REGION_APPLICABILITY", IMPORTANT); }
        @Override
        public List<RuleResult.Target> targets(DiagnosisContext context) { return stopTargets(context); }
        @Override
        public List<RuleResult> evaluate(DiagnosisContext context, DiagnosisSchedule schedule, RuleResult.Target target) {
            var place = context.stops().get(target.stopIndex()).place();
            if (!place.confirmed()) {
                return List.of(unavailable(target, place.limitation()));
            }
            var region = place.value().region();
            return List.of(region.confirmed() ? evaluated(target, PASS, "장소의 법정동 시도코드를 확인했습니다. 지역 통제 확인은 별도입니다.")
                    : unavailable(target, region.limitation()));
        }
    }
}
