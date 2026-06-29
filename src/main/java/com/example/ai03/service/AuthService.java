package com.example.ai03.service;

import com.example.ai03.domain.entity.User;

public interface AuthService {

    User authenticate(String loginId, String rawPassword);
}
