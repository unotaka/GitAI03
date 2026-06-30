package com.example.ai03.service;

import com.example.ai03.domain.entity.User;
import com.example.ai03.domain.enums.UserRole;

public interface UserService {

    User register(String loginId, String rawPassword, String displayName, String email, UserRole role);
}
