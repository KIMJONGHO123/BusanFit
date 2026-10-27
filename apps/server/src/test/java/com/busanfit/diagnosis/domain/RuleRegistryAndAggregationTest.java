package com.busanfit.diagnosis.domain;

import static com.busanfit.diagnosis.domain.DiagnosisFixtures.CLOCK;
import static com.busanfit.diagnosis.domain.DiagnosisFixtures.context;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;

@Tag("evaluation")
class RuleRegistryAndAggregationTest {
    @Test
    void mismatchedTargetCannotEscapeRegistryScopeValidation() {
        DiagnosisRule invalid = new CoreRules.Base("INVALID", RuleScope.region("26"), RuleResult.Importance.IMPORTANT) {
            @Override
            public List<RuleResult.Target> targets(DiagnosisContext context) {
                return List.of(RuleResult.Target.stop(0, "tourapi-other"));
            }
            @Override
            public List<RuleResult> evaluate(DiagnosisContext context, DiagnosisSchedule schedule, RuleResult.Target target) {
                return List.of(unavailable(target, "fixture"));
            }
        };
        var input = context(10800, new long[]{600}, new Long[]{60L}, new String[]{"26"});
        assertThatThrownBy(() -> new RuleRegistry(List.of(invalid), false).select(input))
                .isInstanceOf(IllegalStateException.class);
    }
    @Test
    void eval309RegistryExecutesRegionalRuleOnlyForMatchingStop() {
        var targets = new ArrayList<RuleResult.Target>();
        DiagnosisRule busan = rule("BUSAN_TEST", RuleScope.region("26"), RuleResult.Importance.CRITICAL,
                RuleResult.Outcome.ADJUSTMENT_REQUIRED, targets);
        var rules = new ArrayList<>(CoreRules.national(CoreRules.Policy.defaults()));
        rules.add(busan);
        var input = context(10800, new long[]{600, 600, 600}, new Long[]{60L, 60L, 60L}, new String[]{"26", "11", null});
        var result = new DiagnosisEngine(new RuleRegistry(rules, true), CLOCK).diagnose(input);
        assertThat(targets).containsExactly(RuleResult.Target.stop(0, "tourapi-1"));
        assertThat(result.decision()).isEqualTo(DiagnosisDecision.ADJUSTMENT_REQUIRED);
        assertThat(result.ruleResults()).anyMatch(r -> r.scope().equals(RuleScope.region("11"))
                && r.evaluationStatus() == RuleResult.EvaluationStatus.UNVERIFIABLE);
    }

    @Test
    void eval312UnknownRegionIsNationalUnverifiableAndPartial() {
        var result = DiagnosisFixtures.engine().diagnose(context(10800, new long[]{600}, new Long[]{60L}, new String[]{null}));
        assertThat(result.decision()).isEqualTo(DiagnosisDecision.POSSIBLE);
        assertThat(result.verificationStatus()).isEqualTo(VerificationStatus.PARTIAL);
        assertThat(result.ruleResults()).filteredOn(r -> r.ruleId().equals("REGION_APPLICABILITY"))
                .singleElement().satisfies(r -> {
                    assertThat(r.scope()).isEqualTo(RuleScope.national());
                    assertThat(r.importance()).isEqualTo(RuleResult.Importance.IMPORTANT);
                    assertThat(r.evaluationStatus()).isEqualTo(RuleResult.EvaluationStatus.UNVERIFIABLE);
                });
        assertThat(result.ruleResults()).noneMatch(r -> r.scope().type() == RuleScope.Type.REGION);
    }

    @Test
    void eval313AllUnverifiableIncludingRegionIsUnknownAndUndetermined() {
        var input = context(10800, new long[]{600}, new Long[]{null}, new String[]{null});
        var rules = List.<DiagnosisRule>of(new CoreRules.RegionApplicability(),
                new CoreRules.Unsupported("TRAVEL_TIME", RuleScope.national(), RuleResult.Importance.IMPORTANT, "이동 미확인"));
        var result = new DiagnosisEngine(new RuleRegistry(rules, true), CLOCK).diagnose(input);
        assertThat(result.decision()).isEqualTo(DiagnosisDecision.UNDETERMINED);
        assertThat(result.verificationStatus()).isEqualTo(VerificationStatus.UNKNOWN);
    }

    @Test
    void emptyRegistryNeverDefaultsToPossibleVerified() {
        var result = new DiagnosisEngine(new RuleRegistry(List.of(), false), CLOCK)
                .diagnose(context(10800, new long[]{600}, new Long[]{60L}, new String[]{"26"}));
        assertThat(result.decision()).isEqualTo(DiagnosisDecision.UNDETERMINED);
        assertThat(result.verificationStatus()).isEqualTo(VerificationStatus.UNKNOWN);
    }

    @Test
    void eval307And314CriticalAdjustmentSurvivesUnknownTravelAndRegion() {
        var input = context(10800, new long[]{600}, new Long[]{null}, new String[]{null});
        var rules = new ArrayList<>(CoreRules.national(CoreRules.Policy.defaults()));
        rules.add(rule("CONFIRMED_RESTRICTION", RuleScope.national(), RuleResult.Importance.CRITICAL,
                RuleResult.Outcome.ADJUSTMENT_REQUIRED, new ArrayList<>()));
        var result = new DiagnosisEngine(new RuleRegistry(rules, true), CLOCK).diagnose(input);
        assertThat(result.decision()).isEqualTo(DiagnosisDecision.ADJUSTMENT_REQUIRED);
        assertThat(result.verificationStatus()).isEqualTo(VerificationStatus.PARTIAL);
    }

    @Test
    void eval311And319IndependentViolationAndUnknownConditionShareTargetWithoutLosingEither() {
        var input = context(10800, new long[]{600, 600}, new Long[]{null, 60L}, new String[]{"26", "26"});
        DiagnosisRule operating = new CoreRules.Base("OPERATING_TEST", RuleResult.Importance.IMPORTANT) {
            @Override
            public List<RuleResult.Target> targets(DiagnosisContext context) { return stopTargets(context); }
            @Override
            public List<RuleResult> evaluate(DiagnosisContext context, DiagnosisSchedule schedule, RuleResult.Target target) {
                var unknown = new RuleResult(id(), scope(), importance(), target, RuleResult.EvaluationStatus.UNVERIFIABLE,
                        null, "BREAK", "휴게시간 해석 미지원", null);
                return target.stopIndex() == 0 ? List.of(new RuleResult(id(), scope(), importance(), target,
                        RuleResult.EvaluationStatus.EVALUATED, RuleResult.Outcome.ADJUSTMENT_REQUIRED,
                        "CLOSED", "방문일 휴무 확인", "방문일 변경"), unknown) : List.of(unknown);
            }
        };
        var result = new DiagnosisEngine(new RuleRegistry(List.of(operating), false), CLOCK).diagnose(input);
        assertThat(result.decision()).isEqualTo(DiagnosisDecision.ADJUSTMENT_REQUIRED);
        assertThat(result.verificationStatus()).isEqualTo(VerificationStatus.PARTIAL);
        assertThat(result.ruleResults()).hasSize(3);
        assertThat(result.ruleResults().get(0).target()).isEqualTo(result.ruleResults().get(1).target());
    }

    @Test
    void eval320UnconfirmedRestrictionCannotCreateCriticalOutcome() {
        var unavailable = new CoreRules.Unsupported("RESTRICTION", RuleScope.region("26"),
                RuleResult.Importance.CRITICAL, "여행 날짜에 적용되는지 미확인");
        var rules = new ArrayList<>(CoreRules.national(CoreRules.Policy.defaults()));
        rules.add(unavailable);
        var result = new DiagnosisEngine(new RuleRegistry(rules, true), CLOCK)
                .diagnose(context(10800, new long[]{600}, new Long[]{600L}, new String[]{"26"}));
        assertThat(result.decision()).isEqualTo(DiagnosisDecision.POSSIBLE);
        assertThat(result.verificationStatus()).isEqualTo(VerificationStatus.PARTIAL);
        assertThat(result.ruleResults()).filteredOn(r -> r.ruleId().equals("RESTRICTION"))
                .allSatisfy(r -> assertThat(r.outcome()).isNull());
    }

    @Test
    void eval321ConfirmedLookupTimeEstimateIsUsableWithoutFuturePrediction() {
        var rules = List.<DiagnosisRule>of(new CoreRules.Travel(), new CoreRules.EndTime());
        var result = new DiagnosisEngine(new RuleRegistry(rules, false), CLOCK)
                .diagnose(context(10800, new long[]{3600}, new Long[]{600L}, new String[]{"26"}));
        assertThat(result.decision()).isEqualTo(DiagnosisDecision.POSSIBLE);
        assertThat(result.verificationStatus()).isEqualTo(VerificationStatus.VERIFIED);
        assertThat(result.schedule().totalTravelSeconds()).isEqualTo(600);
    }

    private DiagnosisRule rule(String id, RuleScope scope, RuleResult.Importance importance,
                               RuleResult.Outcome outcome, List<RuleResult.Target> calls) {
        return new CoreRules.Base(id, scope, importance) {
            @Override
            public List<RuleResult.Target> targets(DiagnosisContext context) { return stopTargets(context); }
            @Override
            public List<RuleResult> evaluate(DiagnosisContext context, DiagnosisSchedule schedule, RuleResult.Target target) {
                calls.add(target);
                return List.of(evaluated(target, outcome, "테스트에서 주어진 확인된 근거"));
            }
        };
    }
}
