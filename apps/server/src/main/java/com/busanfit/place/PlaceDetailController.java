package com.busanfit.place;

import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
public class PlaceDetailController {
    private final PlaceDetailService service;

    public PlaceDetailController(PlaceDetailService service) {
        this.service = service;
    }

    @GetMapping("/api/places/tourapi-{contentId:[0-9]+}/detail")
    public PlaceDetailService.Detail detail(@PathVariable String contentId, @RequestParam String name,
                              @RequestParam String address, @RequestParam double latitude,
                              @RequestParam double longitude) {
        return service.detail(contentId, name, address, latitude, longitude);
    }
}
