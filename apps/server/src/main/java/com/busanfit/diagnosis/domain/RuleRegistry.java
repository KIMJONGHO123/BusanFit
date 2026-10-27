package com.busanfit.diagnosis.domain;

import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;

public final class RuleRegistry {
    public record Selection(DiagnosisRule rule, RuleResult.Target target) { }
    private final List<DiagnosisRule> rules;
    private final boolean includeUnsupportedRegions;

    public RuleRegistry(List<DiagnosisRule> rules, boolean includeUnsupportedRegions) {
        this.rules = List.copyOf(rules);
        this.includeUnsupportedRegions = includeUnsupportedRegions;
        var ids = new HashSet<String>();
        for (var rule : rules) {
            if (!ids.add(rule.id() + ":" + rule.scope())) {
                throw new IllegalArgumentException("중복 Rule 등록입니다.");
            }
        }
    }

    public List<Selection> select(DiagnosisContext context) {
        var available = new ArrayList<>(rules);
        if (includeUnsupportedRegions) {
            var regions = context.stops().stream().filter(s -> s.place().confirmed())
                    .map(s -> s.place().value().region()).filter(Evidence::confirmed)
                    .map(Evidence::value).distinct().toList();
            for (String region : regions) {
                if (rules.stream().noneMatch(r -> r.id().equals("REGIONAL_CONTROL")
                        && r.scope().equals(RuleScope.region(region)))) {
                    available.add(new CoreRules.Unsupported("REGIONAL_CONTROL", RuleScope.region(region),
                            RuleResult.Importance.IMPORTANT, "해당 지역의 통제·위험 데이터 연동 미지원"));
                }
            }
        }
        var selections = new ArrayList<Selection>();
        for (var rule : available) {
            for (var target : rule.targets(context)) {
                if (target.type() == RuleResult.TargetType.STOP && (target.stopIndex() >= context.stops().size()
                        || !target.placeId().equals(context.stops().get(target.stopIndex()).placeId()))) {
                    throw new IllegalStateException("Rule의 장소 평가 대상이 일정과 일치하지 않습니다.");
                }
                if (applies(rule.scope(), target, context)) {
                    selections.add(new Selection(rule, target));
                }
            }
        }
        return List.copyOf(selections);
    }

    private boolean applies(RuleScope scope, RuleResult.Target target, DiagnosisContext context) {
        if (scope.type() == RuleScope.Type.NATIONAL) {
            return true;
        }
        if (target.type() != RuleResult.TargetType.STOP) {
            throw new IllegalArgumentException("지역 Rule은 장소별 평가 대상을 지정해야 합니다.");
        }
        var place = context.stops().get(target.stopIndex()).place();
        return place.confirmed() && place.value().region().confirmed()
                && scope.regionCode().equals(place.value().region().value());
    }
}
