package com.busanfit.diagnosis.config;

import com.busanfit.diagnosis.domain.CoreRules;
import com.busanfit.diagnosis.domain.DiagnosisEngine;
import com.busanfit.diagnosis.domain.RuleRegistry;
import java.time.Clock;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration
public class DiagnosisConfiguration {
    @Bean
    Clock diagnosisClock() {
        return Clock.systemUTC();
    }

    @Bean
    DiagnosisEngine diagnosisEngine(Clock diagnosisClock,
            @Value("${diagnosis.low-remaining-seconds:1800}") long lowRemainingSeconds,
            @Value("${diagnosis.high-travel-ratio:0.4}") double highTravelRatio) {
        var policy = new CoreRules.Policy(lowRemainingSeconds, highTravelRatio);
        return new DiagnosisEngine(new RuleRegistry(CoreRules.national(policy), true), diagnosisClock);
    }
}
