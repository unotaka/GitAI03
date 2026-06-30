package com.example.ai03.ui;

import com.example.ai03.service.AuthService;
import com.example.ai03.service.TaskService;
import com.example.ai03.service.UserService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.stereotype.Component;

import javax.swing.SwingUtilities;

@Slf4j
@Component
@RequiredArgsConstructor
public class SwingApplicationRunner implements ApplicationRunner {

    private final AuthService authService;
    private final UserService userService;
    private final TaskService taskService;

    @Override
    public void run(ApplicationArguments args) {
        log.info("Launching login screen");
        SwingUtilities.invokeLater(() -> {
            LoginFrame loginFrame = new LoginFrame(authService, userService, taskService);
            loginFrame.setVisible(true);
        });
    }
}
