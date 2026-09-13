package com.busanfit.global.external.tmap;

public class TmapApiException extends RuntimeException {

    public TmapApiException(String message) {
        super(message);
    }

    public TmapApiException(String message, Throwable cause) {
        super(message, cause);
    }
}
