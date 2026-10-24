package com.busanfit.planner;

import java.util.Arrays;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** Exposes the existing activity policy without duplicating duration values in clients. */
@RestController
@RequestMapping("/api/planner/activity-policy")
public class ActivityPolicyController {

    @GetMapping
    public List<ActivityPolicyItem> getPolicy() {
        return Arrays.stream(ActivityType.values())
                .map(activity -> new ActivityPolicyItem(
                        activity.getRequestValue(),
                        label(activity),
                        requiresCustomDuration(activity) ? null : activity.getMinutes() * 60,
                        requiresCustomDuration(activity)))
                .toList();
    }

    private boolean requiresCustomDuration(ActivityType activity) {
        return activity == ActivityType.REST || activity == ActivityType.OTHER;
    }

    private String label(ActivityType activity) {
        return switch (activity) {
            case CAFE -> "카페 이용";
            case MEAL -> "식사";
            case SHOPPING -> "쇼핑";
            case PHOTO -> "사진 촬영";
            case WALK -> "산책";
            case VIEWING -> "관람·전시";
            case EXPERIENCE -> "체험 프로그램";
            case NIGHT_VIEW -> "전망·야경 감상";
            case REST -> "휴식";
            case OTHER -> "기타 활동";
        };
    }

    public record ActivityPolicyItem(
            String code, String label, Integer durationSeconds, boolean customDurationRequired) {}
}
