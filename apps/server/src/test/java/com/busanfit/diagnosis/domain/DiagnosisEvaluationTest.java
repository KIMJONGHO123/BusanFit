package com.busanfit.diagnosis.domain;

import static com.busanfit.diagnosis.domain.DiagnosisFixtures.START;
import static com.busanfit.diagnosis.domain.DiagnosisFixtures.context;
import static com.busanfit.diagnosis.domain.DiagnosisFixtures.engine;
import static com.busanfit.diagnosis.domain.DiagnosisFixtures.fixed;
import static com.busanfit.diagnosis.domain.DiagnosisFixtures.known;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.Tag;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;

@Tag("evaluation")
class DiagnosisEvaluationTest {
    @Test
    void eval301And303FinalStayAndSecondsAreNeverAddedOrRoundedAgain() {
        var input = context(14400, new long[]{6000, 600}, new Long[]{61L, 61L}, new String[]{"26", "26"});
        var stops = new ArrayList<>(input.stops());
        var stop = stops.getFirst();
        stops.set(0, new DiagnosisContext.Stop(stop.placeId(), null, 6000, 1200, stop.place(), stop.recommendedTotalStaySeconds()));
        var result = engine().diagnose(new DiagnosisContext(input.start(), input.end(), input.departure(), stops, input.segments()));
        assertThat(result.schedule().totalStaySeconds()).isEqualTo(6600);
        assertThat(result.schedule().totalTravelSeconds()).isEqualTo(122);
        assertThat(result.schedule().requiredSeconds()).isEqualTo(6722);
        assertThat(result.schedule().stops().getFirst().departure()).isEqualTo(START.plusSeconds(6061));
    }

    @Test
    void eval305EarlyArrivalWaitsAndLateArrivalRequiresAdjustment() {
        var input = context(10800, new long[]{600}, new Long[]{61L}, new String[]{"26"});
        var early = engine().diagnose(fixed(input, 0, START.plusSeconds(1800)));
        assertThat(early.schedule().stops().getFirst().waitingSeconds()).isEqualTo(1739);
        assertThat(early.schedule().requiredSeconds()).isEqualTo(2400);
        assertThat(early.schedule().stops().getFirst().stayStart()).isEqualTo(START.plusSeconds(1800));
        var late = engine().diagnose(fixed(input, 0, START.plusSeconds(60)));
        assertThat(late.decision()).isEqualTo(DiagnosisDecision.ADJUSTMENT_REQUIRED);
        assertThat(late.ruleResults()).anyMatch(r -> r.ruleId().equals("FIXED_VISIT_ARRIVAL")
                && r.outcome() == RuleResult.Outcome.ADJUSTMENT_REQUIRED);
    }

    @Test
    void fixedTimeConflictIsPreservedWhenLaterRouteIsUnknown() {
        var input = context(10800, new long[]{3600, 600}, new Long[]{0L, null}, new String[]{"26", "26"});
        input = fixed(input, 1, START.plusSeconds(1800));
        var result = engine().diagnose(input);
        assertThat(result.decision()).isEqualTo(DiagnosisDecision.ADJUSTMENT_REQUIRED);
        assertThat(result.ruleResults()).anyMatch(r -> r.ruleId().equals("SCHEDULE_CONFLICT")
                && r.outcome() == RuleResult.Outcome.ADJUSTMENT_REQUIRED);
    }

    @ParameterizedTest(name = "EVAL-315/316 stay={0} => {1}")
    @CsvSource({"14400, ADJUSTMENT_REQUIRED", "3600, UNDETERMINED"})
    void eval315And316UnknownRouteNeverProducesExactTotalsOrPossible(long stay, DiagnosisDecision expected) {
        var result = engine().diagnose(context(10800, new long[]{stay}, new Long[]{null}, new String[]{"26"}));
        assertThat(result.decision()).isEqualTo(expected);
        assertThat(result.verificationStatus()).isEqualTo(VerificationStatus.PARTIAL);
        assertThat(result.schedule().requiredSeconds()).isNull();
        assertThat(result.schedule().remainingSeconds()).isNull();
        assertThat(result.schedule().totalTravelSeconds()).isNull();
        assertThat(result.schedule().stops().getFirst().arrival()).isNull();
    }

    @ParameterizedTest(name = "known travel {0}/{1}, available {2} => {3}")
    @CsvSource(value = {
            "9000,NULL,10800,ADJUSTMENT_REQUIRED",
            "7200,NULL,10800,UNDETERMINED",
            "7199,NULL,10800,UNDETERMINED",
            "NULL,9000,10800,ADJUSTMENT_REQUIRED"
    }, nullValues = "NULL")
    void knownTravelAndRemainingStayProveOverrunWithoutInventingUnknownDurations(
            Long firstTravel, Long secondTravel, long available, DiagnosisDecision expected) {
        var result = engine().diagnose(context(available, new long[]{1800, 1800},
                new Long[]{firstTravel, secondTravel}, new String[]{"26", "26"}));
        assertThat(result.decision()).isEqualTo(expected);
        assertThat(result.verificationStatus()).isEqualTo(VerificationStatus.PARTIAL);
        assertThat(result.schedule().calculationComplete()).isFalse();
        assertThat(result.schedule().requiredSeconds()).isNull();
        assertThat(result.schedule().remainingSeconds()).isNull();
        assertThat(result.schedule().totalTravelSeconds()).isNull();
        assertThat(result.schedule().totalWaitingSeconds()).isNull();
        int unknownIndex = firstTravel == null ? 0 : 1;
        assertThat(result.schedule().stops().subList(unknownIndex, 2)).allSatisfy(s -> {
            assertThat(s.arrival()).isNull();
            assertThat(s.departure()).isNull();
        });
        assertThat(result.ruleResults()).filteredOn(r -> r.ruleId().equals("SCHEDULE_END"))
                .singleElement().satisfies(r -> {
                    assertThat(r.importance()).isEqualTo(RuleResult.Importance.IMPORTANT);
                    if (expected == DiagnosisDecision.ADJUSTMENT_REQUIRED) {
                        assertThat(r.evaluationStatus()).isEqualTo(RuleResult.EvaluationStatus.EVALUATED);
                        assertThat(r.outcome()).isEqualTo(RuleResult.Outcome.ADJUSTMENT_REQUIRED);
                    } else {
                        assertThat(r.evaluationStatus()).isEqualTo(RuleResult.EvaluationStatus.UNVERIFIABLE);
                        assertThat(r.outcome()).isNull();
                    }
                });
    }

    @Test
    void confirmedWaitingAndRemainingStayProveOverrunAfterLastKnownDepartureReachesEnd() {
        var input = fixed(context(10800, new long[]{1800, 1800}, new Long[]{3600L, null},
                new String[]{"26", "26"}), 0, START.plusSeconds(9000));
        var result = engine().diagnose(input);
        assertThat(result.schedule().stops().getFirst().waitingSeconds()).isEqualTo(5400);
        assertThat(result.schedule().stops().getFirst().departure()).isEqualTo(input.end());
        assertThat(result.decision()).isEqualTo(DiagnosisDecision.ADJUSTMENT_REQUIRED);
        assertThat(result.verificationStatus()).isEqualTo(VerificationStatus.PARTIAL);
        assertThat(result.schedule().requiredSeconds()).isNull();
        assertThat(result.schedule().remainingSeconds()).isNull();
        assertThat(result.schedule().stops().get(1).departure()).isNull();
    }

    @Test
    void fixedVisitAfterUnknownRouteAndFollowingStayCanProveOverrunWithoutExactTimeline() {
        var input = fixed(context(10800, new long[]{1800, 1800, 1800}, new Long[]{null, null, null},
                new String[]{"26", "26", "26"}), 1, START.plusSeconds(9000));
        var result = engine().diagnose(input);
        assertThat(result.decision()).isEqualTo(DiagnosisDecision.ADJUSTMENT_REQUIRED);
        assertThat(result.verificationStatus()).isEqualTo(VerificationStatus.PARTIAL);
        assertThat(result.schedule().requiredSeconds()).isNull();
        assertThat(result.schedule().remainingSeconds()).isNull();
        assertThat(result.schedule().stops()).allSatisfy(s -> assertThat(s.departure()).isNull());
    }

    @Test
    void lowerBoundAtEndDoesNotDoubleCountKnownWaitingOrAlreadyCompletedStay() {
        var input = fixed(context(7200, new long[]{1800, 1800}, new Long[]{600L, null},
                new String[]{"26", "26"}), 0, START.plusSeconds(3600));
        var result = engine().diagnose(input);
        assertThat(result.schedule().stops().getFirst().departure()).isEqualTo(START.plusSeconds(5400));
        assertThat(result.decision()).isEqualTo(DiagnosisDecision.UNDETERMINED);
        assertThat(result.schedule().requiredSeconds()).isNull();
        assertThat(result.schedule().remainingSeconds()).isNull();
    }

    @Test
    void unknownRouteInvalidatesLaterTimelineButKeepsIndependentRouteEvidence() {
        var result = engine().diagnose(context(10800, new long[]{600, 600, 600},
                new Long[]{61L, null, 61L}, new String[]{"26", "26", "26"}));
        assertThat(result.schedule().stops().get(0).departure()).isNotNull();
        assertThat(result.schedule().stops().get(1).departure()).isNull();
        assertThat(result.schedule().stops().get(2).arrival()).isNull();
        assertThat(result.schedule().segments().get(2).route().value().seconds()).isEqualTo(61);
    }

    @Test
    void eval317UncertainRecommendationDoesNotChangePlanOrInventWarning() {
        var result = engine().diagnose(context(10800, new long[]{3600}, new Long[]{600L}, new String[]{"26"}));
        assertThat(result.decision()).isEqualTo(DiagnosisDecision.POSSIBLE);
        assertThat(result.verificationStatus()).isEqualTo(VerificationStatus.PARTIAL);
        assertThat(result.schedule().requiredSeconds()).isEqualTo(4200);
        assertThat(result.ruleResults()).filteredOn(r -> r.ruleId().equals("RECOMMENDED_STAY"))
                .singleElement().satisfies(r -> {
                    assertThat(r.evaluationStatus()).isEqualTo(RuleResult.EvaluationStatus.UNVERIFIABLE);
                    assertThat(r.outcome()).isNull();
                });
        assertThat(result.coverage()).anyMatch(c -> c.ruleId().equals("OPERATING_HOURS")
                && c.evaluationStatus() == RuleResult.EvaluationStatus.UNVERIFIABLE);
    }

    @Test
    void recommendationWithConfirmedTotalCanProduceCaution() {
        var original = context(10800, new long[]{600}, new Long[]{61L}, new String[]{"26"});
        var stop = original.stops().getFirst();
        var input = new DiagnosisContext(original.start(), original.end(), original.departure(),
                List.of(new DiagnosisContext.Stop(stop.placeId(), null, 600, 0, stop.place(), known(1200L))), original.segments());
        assertThat(engine().diagnose(input).decision()).isEqualTo(DiagnosisDecision.CAUTION);
    }

    @ParameterizedTest
    @CsvSource({"1799, CAUTION", "1800, POSSIBLE", "0, CAUTION"})
    void remainingTimeBoundary(long remaining, DiagnosisDecision expected) {
        var input = context(7200, new long[]{7200 - remaining - 60}, new Long[]{60L}, new String[]{"26"});
        assertThat(engine().diagnose(input).decision()).isEqualTo(expected);
    }

    @ParameterizedTest
    @CsvSource({"3999, POSSIBLE", "4000, CAUTION"})
    void travelRatioBoundary(long travel, DiagnosisDecision expected) {
        assertThat(engine().diagnose(context(10000, new long[]{600}, new Long[]{travel}, new String[]{"26"})).decision())
                .isEqualTo(expected);
    }

    @Test
    void midnightOverrunRetainsDateAndOffset() {
        var input = context(7200, new long[]{7200}, new Long[]{3600L}, new String[]{"26"});
        var start = START.withHour(22);
        input = new DiagnosisContext(start, start.withHour(23).withMinute(59), input.departure(), input.stops(), input.segments());
        var result = engine().diagnose(input);
        assertThat(result.schedule().stops().getFirst().departure().toString()).isEqualTo("2026-10-27T01:00+09:00");
        assertThat(result.decision()).isEqualTo(DiagnosisDecision.ADJUSTMENT_REQUIRED);
    }

    @Test
    void invalidInputNeverReachesRuleEvaluation() {
        var input = context(7200, new long[]{600}, new Long[]{61L}, new String[]{"26"});
        assertThatThrownBy(() -> new DiagnosisContext(input.start(), input.start(), input.departure(), input.stops(), input.segments()))
                .isInstanceOf(IllegalArgumentException.class);
        assertThatThrownBy(() -> new DiagnosisContext.Coordinate(Double.NaN, 129))
                .isInstanceOf(IllegalArgumentException.class);
    }
}
