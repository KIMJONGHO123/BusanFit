package com.busanfit.diagnosis.domain;

import java.util.List;

public interface DiagnosisRule {
    String id();
    RuleScope scope();
    RuleResult.Importance importance();
    List<RuleResult.Target> targets(DiagnosisContext context);
    List<RuleResult> evaluate(DiagnosisContext context, DiagnosisSchedule schedule, RuleResult.Target target);
}
