package com.example.ai03.service.impl;

import com.example.ai03.domain.entity.User;
import com.example.ai03.domain.enums.UserRole;
import com.example.ai03.exception.BusinessException;
import com.example.ai03.repository.UserRepository;
import com.example.ai03.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserServiceImpl implements UserService {

    private static final String ERR_DUPLICATE_LOGIN_ID = "USER_001";

    private final UserRepository userRepository;
    private final BCryptPasswordEncoder passwordEncoder;

    @Override
    @Transactional
    public User register(String loginId, String rawPassword, String displayName, String email, UserRole role) {
        if (userRepository.existsByLoginId(loginId)) {
            throw new BusinessException(ERR_DUPLICATE_LOGIN_ID, "このユーザIDはすでに使用されています");
        }

        User user = new User();
        user.setLoginId(loginId);
        user.setPasswordHash(passwordEncoder.encode(rawPassword));
        user.setDisplayName(displayName);
        user.setEmail(email);
        user.setRole(role);
        user.setActive(true);

        User saved = userRepository.save(user);
        log.info("User registered: loginId={}", loginId);
        return saved;
    }
}
