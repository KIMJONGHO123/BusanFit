package com.busanfit.diagnosis.api;

import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.options;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.header;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.ValueSource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
class WebCorsApiContractTest {
    @Autowired private MockMvc mvc;

    @ParameterizedTest
    @ValueSource(strings = {"http://127.0.0.1:5173", "http://localhost:5173", "http://localhost:8081"})
    void supportedClientOriginCanSendPostWithAuthorization(String origin) throws Exception {
        mvc.perform(options("/api/v2/planner/diagnose").header("Origin", origin)
                        .header("Access-Control-Request-Method", "POST")
                        .header("Access-Control-Request-Headers", "authorization,content-type"))
                .andExpect(status().isOk())
                .andExpect(header().string("Access-Control-Allow-Origin", origin));
    }

    @Test
    void actualBrowserLoginPostReachesInputHandlingInsteadOfCorsRejection() throws Exception {
        mvc.perform(post("/api/user/login").header("Origin", "http://127.0.0.1:5173")
                        .contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(header().string("Access-Control-Allow-Origin", "http://127.0.0.1:5173"));
    }

    @Test
    void unrelatedOriginRemainsForbidden() throws Exception {
        mvc.perform(options("/api/user/login").header("Origin", "https://unrelated.example.test")
                        .header("Access-Control-Request-Method", "POST"))
                .andExpect(status().isForbidden())
                .andExpect(header().doesNotExist("Access-Control-Allow-Origin"));
    }
}
