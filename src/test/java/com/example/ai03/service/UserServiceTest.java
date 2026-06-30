package com.example.ai03.service;

import com.example.ai03.domain.entity.User;
import com.example.ai03.domain.enums.UserRole;
import com.example.ai03.exception.BusinessException;
import com.example.ai03.repository.UserRepository;
import com.example.ai03.service.impl.UserServiceImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class UserServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private BCryptPasswordEncoder passwordEncoder;

    @InjectMocks
    private UserServiceImpl userService;

    @Test
    void registerSucceedsWithValidInput() {
        when(userRepository.existsByLoginId("newuser")).thenReturn(false);
        when(passwordEncoder.encode("rawPw")).thenReturn("hashedPw");
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        User result = userService.register("newuser", "rawPw", "新規ユーザ", "new@example.com", UserRole.MEMBER);

        assertThat(result.getLoginId()).isEqualTo("newuser");
        assertThat(result.getPasswordHash()).isEqualTo("hashedPw");
        assertThat(result.getDisplayName()).isEqualTo("新規ユーザ");
        assertThat(result.getEmail()).isEqualTo("new@example.com");
        assertThat(result.getRole()).isEqualTo(UserRole.MEMBER);
        assertThat(result.isActive()).isTrue();
    }

    @Test
    void registerSavesEncodedPassword() {
        when(userRepository.existsByLoginId("newuser")).thenReturn(false);
        when(passwordEncoder.encode("rawPw")).thenReturn("hashedPw");
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        userService.register("newuser", "rawPw", "新規ユーザ", "new@example.com", UserRole.MEMBER);

        ArgumentCaptor<User> captor = ArgumentCaptor.forClass(User.class);
        verify(userRepository).save(captor.capture());
        assertThat(captor.getValue().getPasswordHash()).isEqualTo("hashedPw");
    }

    @Test
    void registerThrowsWhenLoginIdAlreadyExists() {
        when(userRepository.existsByLoginId("existing")).thenReturn(true);

        assertThatThrownBy(() -> userService.register("existing", "rawPw", "既存ユーザ", "ex@example.com", UserRole.MEMBER))
            .isInstanceOf(BusinessException.class)
            .hasMessageContaining("このユーザIDはすでに使用されています");

        verify(userRepository, never()).save(any());
    }

    @Test
    void registerWithAdminRolePersistsRoleCorrectly() {
        when(userRepository.existsByLoginId("adminuser")).thenReturn(false);
        when(passwordEncoder.encode(anyString())).thenReturn("hashedPw");
        when(userRepository.save(any(User.class))).thenAnswer(inv -> inv.getArgument(0));

        User result = userService.register("adminuser", "rawPw", "管理者", "admin@example.com", UserRole.ADMIN);

        assertThat(result.getRole()).isEqualTo(UserRole.ADMIN);
    }
}
