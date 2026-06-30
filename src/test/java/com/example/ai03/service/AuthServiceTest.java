package com.example.ai03.service;

import com.example.ai03.domain.entity.User;
import com.example.ai03.domain.enums.UserRole;
import com.example.ai03.exception.BusinessException;
import com.example.ai03.repository.UserRepository;
import com.example.ai03.service.impl.AuthServiceImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private BCryptPasswordEncoder passwordEncoder;

    @InjectMocks
    private AuthServiceImpl authService;

    @Test
    void authenticateSucceedsWithValidCredentials() {
        User user = buildActiveUser("user01", "hashedPw");
        when(userRepository.findByLoginIdAndActiveTrue("user01")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("rawPw", "hashedPw")).thenReturn(true);

        User result = authService.authenticate("user01", "rawPw");

        assertThat(result.getLoginId()).isEqualTo("user01");
    }

    @Test
    void authenticateThrowsWhenUserNotFound() {
        when(userRepository.findByLoginIdAndActiveTrue("unknown")).thenReturn(Optional.empty());

        assertThatThrownBy(() -> authService.authenticate("unknown", "rawPw"))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("ユーザIDまたはパスワードが正しくありません");
    }

    @Test
    void authenticateThrowsWhenPasswordMismatch() {
        User user = buildActiveUser("user01", "hashedPw");
        when(userRepository.findByLoginIdAndActiveTrue("user01")).thenReturn(Optional.of(user));
        when(passwordEncoder.matches("wrongPw", "hashedPw")).thenReturn(false);

        assertThatThrownBy(() -> authService.authenticate("user01", "wrongPw"))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("ユーザIDまたはパスワードが正しくありません");
    }

    private User buildActiveUser(String loginId, String passwordHash) {
        User user = new User();
        user.setLoginId(loginId);
        user.setPasswordHash(passwordHash);
        user.setDisplayName("テストユーザ");
        user.setEmail("test@example.com");
        user.setRole(UserRole.MEMBER);
        user.setActive(true);
        return user;
    }
}
