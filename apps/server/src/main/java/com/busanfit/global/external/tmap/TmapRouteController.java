package com.busanfit.global.external.tmap;

import com.busanfit.global.external.tmap.dto.TmapCarRouteRequest;
import com.busanfit.global.external.tmap.dto.TmapCarRouteResult;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/tmap")
@RequiredArgsConstructor
public class TmapRouteController {

    private final TmapClient tmapClient;

    @PostMapping("/car-route")
    public ResponseEntity<TmapCarRouteResult> getCarRoute(
            @Valid @RequestBody TmapCarRouteRequest request
    ) {
        // 현재는 자동차 기준 두 지점 경로만 제공합니다. 대중교통/보행자/경유지 최적화는 별도 단계에서 추가합니다.
        return ResponseEntity.ok(tmapClient.getCarRoute(
                request.startLatitude(),
                request.startLongitude(),
                request.endLatitude(),
                request.endLongitude()
        ));
    }
}
