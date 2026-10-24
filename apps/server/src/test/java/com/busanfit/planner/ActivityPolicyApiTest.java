package com.busanfit.planner;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
class ActivityPolicyApiTest {
    @Autowired
    private MockMvc mockMvc;

    @Test
    void policyUsesExistingDurationsButRestAndOtherRequireUserInput() {
        var policy = new ActivityPolicyController().getPolicy();
        assertThat(policy).hasSize(ActivityType.values().length);
        assertThat(policy).extracting(ActivityPolicyController.ActivityPolicyItem::code).doesNotHaveDuplicates();
        for (var activity : ActivityType.values()) {
            var item = policy.stream().filter(p -> p.code().equals(activity.getRequestValue())).findFirst().orElseThrow();
            assertThat(item.label()).isNotBlank();
            boolean customDuration = activity == ActivityType.REST || activity == ActivityType.OTHER;
            assertThat(item.customDurationRequired()).isEqualTo(customDuration);
            if (customDuration) assertThat(item.durationSeconds()).isNull();
            else assertThat(item.durationSeconds()).isEqualTo(activity.getMinutes() * 60);
        }
    }

    @Test
    void anonymousGetReturnsPolicyAndCustomRestAndOtherWithoutFixedDurations() throws Exception {
        mockMvc.perform(get("/api/planner/activity-policy"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.length()").value(10))
                .andExpect(jsonPath("$[0].code").value("cafe"))
                .andExpect(jsonPath("$[0].durationSeconds").value(2400))
                .andExpect(jsonPath("$[8].code").value("rest"))
                .andExpect(jsonPath("$[8].durationSeconds").isEmpty())
                .andExpect(jsonPath("$[8].customDurationRequired").value(true))
                .andExpect(jsonPath("$[9].code").value("other"))
                .andExpect(jsonPath("$[9].durationSeconds").isEmpty())
                .andExpect(jsonPath("$[9].customDurationRequired").value(true));
    }

    @Test
    void publicReadDoesNotOpenDiagnosisOrPolicyWrites() throws Exception {
        mockMvc.perform(post("/api/planner/activity-policy")).andExpect(status().isUnauthorized());
        mockMvc.perform(post("/api/planner/diagnose")).andExpect(status().isUnauthorized());
    }
}
