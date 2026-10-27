package com.busanfit.diagnosis.domain;

public record RuleScope(Type type, String regionCode) {
    public enum Type { NATIONAL, REGION }

    public RuleScope {
        if (type == null || (type == Type.NATIONAL && regionCode != null)
                || (type == Type.REGION && (regionCode == null || regionCode.isBlank()))) {
            throw new IllegalArgumentException("Rule Scope가 올바르지 않습니다.");
        }
    }

    public static RuleScope national() {
        return new RuleScope(Type.NATIONAL, null);
    }

    public static RuleScope region(String code) {
        return new RuleScope(Type.REGION, code);
    }
}
