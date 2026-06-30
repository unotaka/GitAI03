package com.example.ai03.ui;

import com.example.ai03.domain.entity.User;
import com.example.ai03.domain.enums.UserRole;
import com.example.ai03.exception.BusinessException;
import com.example.ai03.service.UserService;
import lombok.extern.slf4j.Slf4j;

import javax.swing.DefaultComboBoxModel;
import javax.swing.JButton;
import javax.swing.JComboBox;
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
public class UserRegistrationFrame extends JFrame {

    private static final int TEXT_FIELD_COLUMNS = 20;
    private static final int INSETS_SIZE = 8;

    private final UserService userService;

    private JTextField loginIdField;
    private JPasswordField passwordField;
    private JTextField displayNameField;
    private JTextField emailField;
    private JComboBox<UserRole> roleComboBox;
    private JButton registerButton;
    private JButton cancelButton;

    public UserRegistrationFrame(UserService userService) {
        this.userService = userService;
        initComponents();
    }

    private void initComponents() {
        setTitle("ユーザー登録");
        setDefaultCloseOperation(JFrame.DISPOSE_ON_CLOSE);
        setResizable(false);

        JPanel panel = new JPanel(new GridBagLayout());
        GridBagConstraints gbc = new GridBagConstraints();
        gbc.insets = new Insets(INSETS_SIZE, INSETS_SIZE, INSETS_SIZE, INSETS_SIZE);

        int row = 0;

        gbc.gridx = 0;
        gbc.gridy = row;
        gbc.anchor = GridBagConstraints.EAST;
        panel.add(new JLabel("ユーザID:"), gbc);

        loginIdField = new JTextField(TEXT_FIELD_COLUMNS);
        gbc.gridx = 1;
        gbc.gridy = row;
        gbc.anchor = GridBagConstraints.WEST;
        panel.add(loginIdField, gbc);
        row++;

        gbc.gridx = 0;
        gbc.gridy = row;
        gbc.anchor = GridBagConstraints.EAST;
        panel.add(new JLabel("パスワード:"), gbc);

        passwordField = new JPasswordField(TEXT_FIELD_COLUMNS);
        gbc.gridx = 1;
        gbc.gridy = row;
        gbc.anchor = GridBagConstraints.WEST;
        panel.add(passwordField, gbc);
        row++;

        gbc.gridx = 0;
        gbc.gridy = row;
        gbc.anchor = GridBagConstraints.EAST;
        panel.add(new JLabel("表示名:"), gbc);

        displayNameField = new JTextField(TEXT_FIELD_COLUMNS);
        gbc.gridx = 1;
        gbc.gridy = row;
        gbc.anchor = GridBagConstraints.WEST;
        panel.add(displayNameField, gbc);
        row++;

        gbc.gridx = 0;
        gbc.gridy = row;
        gbc.anchor = GridBagConstraints.EAST;
        panel.add(new JLabel("メールアドレス:"), gbc);

        emailField = new JTextField(TEXT_FIELD_COLUMNS);
        gbc.gridx = 1;
        gbc.gridy = row;
        gbc.anchor = GridBagConstraints.WEST;
        panel.add(emailField, gbc);
        row++;

        gbc.gridx = 0;
        gbc.gridy = row;
        gbc.anchor = GridBagConstraints.EAST;
        panel.add(new JLabel("ロール:"), gbc);

        roleComboBox = new JComboBox<>(new DefaultComboBoxModel<>(UserRole.values()));
        roleComboBox.setSelectedItem(UserRole.MEMBER);
        gbc.gridx = 1;
        gbc.gridy = row;
        gbc.anchor = GridBagConstraints.WEST;
        panel.add(roleComboBox, gbc);
        row++;

        JPanel buttonPanel = new JPanel();
        registerButton = new JButton("登録");
        registerButton.addActionListener(this::onRegisterButtonClicked);
        cancelButton = new JButton("キャンセル");
        cancelButton.addActionListener(e -> dispose());
        buttonPanel.add(registerButton);
        buttonPanel.add(cancelButton);

        gbc.gridx = 0;
        gbc.gridy = row;
        gbc.gridwidth = 2;
        gbc.anchor = GridBagConstraints.CENTER;
        panel.add(buttonPanel, gbc);

        setContentPane(panel);
        pack();
        setLocationRelativeTo(null);
    }

    private void onRegisterButtonClicked(ActionEvent event) {
        String loginId = loginIdField.getText().trim();
        char[] passwordChars = passwordField.getPassword();
        String displayName = displayNameField.getText().trim();
        String email = emailField.getText().trim();
        UserRole role = (UserRole) roleComboBox.getSelectedItem();

        if (loginId.isEmpty()) {
            showErrorDialog("ユーザIDを入力してください");
            loginIdField.requestFocus();
            Arrays.fill(passwordChars, '\0');
            return;
        }
        if (passwordChars.length == 0) {
            showErrorDialog("パスワードを入力してください");
            passwordField.requestFocus();
            return;
        }
        if (displayName.isEmpty()) {
            showErrorDialog("表示名を入力してください");
            displayNameField.requestFocus();
            Arrays.fill(passwordChars, '\0');
            return;
        }
        if (email.isEmpty()) {
            showErrorDialog("メールアドレスを入力してください");
            emailField.requestFocus();
            Arrays.fill(passwordChars, '\0');
            return;
        }

        String rawPassword = new String(passwordChars);
        Arrays.fill(passwordChars, '\0');

        registerButton.setEnabled(false);
        try {
            User user = userService.register(loginId, rawPassword, displayName, email, role);
            log.info("User registration successful: loginId={}", loginId);
            JOptionPane.showMessageDialog(
                this,
                user.getDisplayName() + " さんのユーザー登録が完了しました。",
                "登録完了",
                JOptionPane.INFORMATION_MESSAGE
            );
            dispose();
        } catch (BusinessException e) {
            showErrorDialog(e.getMessage());
        } finally {
            registerButton.setEnabled(true);
        }
    }

    private void showErrorDialog(String message) {
        JOptionPane.showMessageDialog(this, message, "エラー", JOptionPane.ERROR_MESSAGE);
    }
}
