package com.busanfit.user;

import static org.hamcrest.Matchers.not;
import static org.hamcrest.Matchers.blankOrNullString;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class UserAuthApiContractTest {

    @Autowired
    private MockMvc mockMvc;

    @Test
    void signupLoginAndCurrentUserMatchMobileAuthContract() throws Exception {
        mockMvc.perform(post("/api/user/signup")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "email": "mobile-contract@example.com",
                                  "password": "password123!",
                                  "nickname": "mobileUser"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("회원가입 성공"))
                .andExpect(jsonPath("$.id").isNumber())
                .andExpect(jsonPath("$.nickname").value("mobileUser"));

        MvcResult loginResult = mockMvc.perform(post("/api/user/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("""
                                {
                                  "email": "mobile-contract@example.com",
                                  "password": "password123!"
                                }
                                """))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.message").value("로그인 성공"))
                .andExpect(jsonPath("$.id").isNumber())
                .andExpect(jsonPath("$.email").value("mobile-contract@example.com"))
                .andExpect(jsonPath("$.nickname").value("mobileUser"))
                .andExpect(jsonPath("$.tokenType").value("Bearer"))
                .andExpect(jsonPath("$.accessToken").value(not(blankOrNullString())))
                .andExpect(jsonPath("$.expiresIn").value(3600))
                .andReturn();

        String accessToken = JsonTestUtils.readString(loginResult.getResponse().getContentAsString(), "accessToken");

        mockMvc.perform(get("/api/user/me")
                        .header("Authorization", "Bearer " + accessToken))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.id").isNumber())
                .andExpect(jsonPath("$.email").value("mobile-contract@example.com"))
                .andExpect(jsonPath("$.nickname").value("mobileUser"));
    }

    @Test
    void currentUserRequiresValidBearerToken() throws Exception {
        mockMvc.perform(get("/api/user/me"))
                .andExpect(status().isUnauthorized());

        mockMvc.perform(get("/api/user/me")
                        .header("Authorization", "Bearer invalid-token"))
                .andExpect(status().isUnauthorized());
    }
}
