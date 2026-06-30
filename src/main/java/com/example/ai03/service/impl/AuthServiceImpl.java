package com.example.ai03.service.impl;

import com.example.ai03.domain.entity.User;
import com.example.ai03.exception.BusinessException;
import com.example.ai03.repository.UserRepository;
import com.example.ai03.service.AuthService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthServiceImpl implements AuthService {

    private static final String ERR_INVALID_CREDENTIALS = "AUTH_001";

    private final UserRepository userRepository;
    private final BCryptPasswordEncoder passwordEncoder;

    @Override
    public User authenticate(String loginId, String rawPassword) {
        User user = userRepository.findByLoginIdAndActiveTrue(loginId)
            .orElseThrow(() -> new BusinessException(ERR_INVALID_CREDENTIALS, "ユーザIDまたはパスワードが正しくありません"));

        if (!passwordEncoder.matches(rawPassword, user.getPasswordHash())) {
            log.warn("Authentication failed for loginId: {}", loginId);
            throw new BusinessException(ERR_INVALID_CREDENTIALS, "ユーザIDまたはパスワードが正しくありません");
        }

        log.info("Authentication successful for loginId: {}", loginId);
        return user;
    }
}
