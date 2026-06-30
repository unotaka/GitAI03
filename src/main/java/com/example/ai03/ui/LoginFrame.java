package com.example.ai03.ui;

import com.example.ai03.domain.entity.User;
import com.example.ai03.exception.BusinessException;
import com.example.ai03.service.AuthService;
import com.example.ai03.service.TaskService;
import com.example.ai03.service.UserService;
import lombok.extern.slf4j.Slf4j;

import javax.swing.JButton;
import javax.swing.JFrame;
import javax.swing.JLabel;
import javax.swing.JOptionPane;
import javax.swing.JPanel;
import javax.swing.JPasswordField;
import javax.swing.JTextField;
import java.awt.GridBagConstraints;
import java.awt.GridBagLayout;
import java.awt.Insets;
import java.awt.event.ActionEvent;
import java.util.Arrays;

@Slf4j
public class LoginFrame extends JFrame {

    private static final int TEXT_FIELD_COLUMNS = 20;
    private static final int INSETS_SIZE = 8;

    private final AuthService authService;
    private final UserService userService;
    private final TaskService taskService;

    private JTextField userIdField;
    private JPasswordField passwordField;
    private JButton loginButton;
    private JButton registerButton;

    public LoginFrame(AuthService authService, UserService userService, TaskService taskService) {
        this.authService = authService;
        this.userService = userService;
        this.taskService = taskService;
        initComponents();
    }

    private void initComponents() {
        setTitle("ログイン");
        setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
        setResizable(false);

        JPanel panel = new JPanel(new GridBagLayout());
        GridBagConstraints gbc = new GridBagConstraints();
        gbc.insets = new Insets(INSETS_SIZE, INSETS_SIZE, INSETS_SIZE, INSETS_SIZE);

        gbc.gridx = 0;
        gbc.gridy = 0;
        gbc.anchor = GridBagConstraints.EAST;
        panel.add(new JLabel("ユーザID:"), gbc);

        userIdField = new JTextField(TEXT_FIELD_COLUMNS);
        gbc.gridx = 1;
        gbc.gridy = 0;
        gbc.anchor = GridBagConstraints.WEST;
        panel.add(userIdField, gbc);

        gbc.gridx = 0;
        gbc.gridy = 1;
        gbc.anchor = GridBagConstraints.EAST;
        panel.add(new JLabel("パスワード:"), gbc);

        passwordField = new JPasswordField(TEXT_FIELD_COLUMNS);
        gbc.gridx = 1;
        gbc.gridy = 1;
        gbc.anchor = GridBagConstraints.WEST;
        panel.add(passwordField, gbc);

        loginButton = new JButton("ログイン");
        loginButton.addActionListener(this::onLoginButtonClicked);
        gbc.gridx = 0;
        gbc.gridy = 2;
        gbc.gridwidth = 2;
        gbc.anchor = GridBagConstraints.CENTER;
        panel.add(loginButton, gbc);

        registerButton = new JButton("新規登録");
        registerButton.addActionListener(this::onRegisterButtonClicked);
        gbc.gridx = 0;
        gbc.gridy = 3;
        gbc.gridwidth = 2;
        gbc.anchor = GridBagConstraints.CENTER;
        panel.add(registerButton, gbc);

        setContentPane(panel);
        pack();
        setLocationRelativeTo(null);
    }

    private void onLoginButtonClicked(ActionEvent event) {
        String loginId = userIdField.getText().trim();
        char[] passwordChars = passwordField.getPassword();

        if (loginId.isEmpty()) {
            showErrorDialog("ユーザIDを入力してください");
            userIdField.requestFocus();
            Arrays.fill(passwordChars, '\0');
            return;
        }
        if (passwordChars.length == 0) {
            showErrorDialog("パスワードを入力してください");
            passwordField.requestFocus();
            return;
        }

        String rawPassword = new String(passwordChars);
        Arrays.fill(passwordChars, '\0');

        loginButton.setEnabled(false);
        try {
            User user = authService.authenticate(loginId, rawPassword);
            log.info("Login successful: loginId={}", loginId);
            onLoginSuccess(user);
        } catch (BusinessException e) {
            showErrorDialog(e.getMessage());
            passwordField.setText("");
            userIdField.requestFocus();
        } finally {
            loginButton.setEnabled(true);
        }
    }

    private void onRegisterButtonClicked(ActionEvent event) {
        UserRegistrationFrame registrationFrame = new UserRegistrationFrame(userService);
        registrationFrame.setVisible(true);
    }

    private void onLoginSuccess(User user) {
        dispose();
        MainFrame mainFrame = new MainFrame(user, authService, userService, taskService);
        mainFrame.setVisible(true);
    }

    private void showErrorDialog(String message) {
        JOptionPane.showMessageDialog(this, message, "エラー", JOptionPane.ERROR_MESSAGE);
    }
}
