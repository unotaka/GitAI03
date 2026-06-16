import javax.swing.*;
import javax.swing.border.EmptyBorder;
import java.awt.*;
import java.awt.event.*;

public class LoginFrame extends JFrame {

    private JTextField usernameField;
    private JPasswordField passwordField;
    private JButton loginButton;
    private JButton clearButton;
    private JLabel messageLabel;

    public LoginFrame() {
        setTitle("ログイン");
        setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
        setSize(400, 320);
        setLocationRelativeTo(null);
        setResizable(false);

        initComponents();
    }

    private void initComponents() {
        JPanel mainPanel = new JPanel();
        mainPanel.setLayout(new BorderLayout());
        mainPanel.setBackground(new Color(245, 247, 250));

        // タイトルパネル
        JPanel titlePanel = new JPanel();
        titlePanel.setBackground(new Color(63, 114, 175));
        titlePanel.setBorder(new EmptyBorder(20, 0, 20, 0));
        JLabel titleLabel = new JLabel("ログイン");
        titleLabel.setFont(new Font("SansSerif", Font.BOLD, 22));
        titleLabel.setForeground(Color.WHITE);
        titlePanel.add(titleLabel);

        // フォームパネル
        JPanel formPanel = new JPanel(new GridBagLayout());
        formPanel.setBackground(new Color(245, 247, 250));
        formPanel.setBorder(new EmptyBorder(20, 40, 10, 40));
        GridBagConstraints gbc = new GridBagConstraints();
        gbc.fill = GridBagConstraints.HORIZONTAL;
        gbc.insets = new Insets(6, 0, 6, 0);

        // ユーザー名
        JLabel userLabel = new JLabel("ユーザー名");
        userLabel.setFont(new Font("SansSerif", Font.PLAIN, 13));
        gbc.gridx = 0; gbc.gridy = 0; gbc.gridwidth = 2;
        formPanel.add(userLabel, gbc);

        usernameField = new JTextField();
        usernameField.setFont(new Font("SansSerif", Font.PLAIN, 14));
        usernameField.setPreferredSize(new Dimension(280, 34));
        usernameField.setBorder(BorderFactory.createCompoundBorder(
                BorderFactory.createLineBorder(new Color(180, 190, 200), 1),
                BorderFactory.createEmptyBorder(4, 8, 4, 8)));
        gbc.gridy = 1;
        formPanel.add(usernameField, gbc);

        // パスワード
        JLabel passLabel = new JLabel("パスワード");
        passLabel.setFont(new Font("SansSerif", Font.PLAIN, 13));
        gbc.gridy = 2;
        formPanel.add(passLabel, gbc);

        passwordField = new JPasswordField();
        passwordField.setFont(new Font("SansSerif", Font.PLAIN, 14));
        passwordField.setPreferredSize(new Dimension(280, 34));
        passwordField.setBorder(BorderFactory.createCompoundBorder(
                BorderFactory.createLineBorder(new Color(180, 190, 200), 1),
                BorderFactory.createEmptyBorder(4, 8, 4, 8)));
        gbc.gridy = 3;
        formPanel.add(passwordField, gbc);

        // メッセージラベル
        messageLabel = new JLabel(" ");
        messageLabel.setFont(new Font("SansSerif", Font.PLAIN, 12));
        messageLabel.setHorizontalAlignment(SwingConstants.CENTER);
        gbc.gridy = 4;
        formPanel.add(messageLabel, gbc);

        // ボタンパネル
        JPanel buttonPanel = new JPanel(new FlowLayout(FlowLayout.CENTER, 12, 0));
        buttonPanel.setBackground(new Color(245, 247, 250));

        loginButton = new JButton("ログイン");
        styleButton(loginButton, new Color(63, 114, 175), Color.WHITE);
        loginButton.addActionListener(e -> handleLogin());

        clearButton = new JButton("クリア");
        styleButton(clearButton, new Color(200, 205, 215), new Color(60, 60, 60));
        clearButton.addActionListener(e -> handleClear());

        buttonPanel.add(loginButton);
        buttonPanel.add(clearButton);
        gbc.gridy = 5;
        formPanel.add(buttonPanel, gbc);

        // Enter キーでログイン
        getRootPane().setDefaultButton(loginButton);

        mainPanel.add(titlePanel, BorderLayout.NORTH);
        mainPanel.add(formPanel, BorderLayout.CENTER);

        add(mainPanel);
    }

    private void styleButton(JButton button, Color bg, Color fg) {
        button.setBackground(bg);
        button.setForeground(fg);
        button.setFont(new Font("SansSerif", Font.BOLD, 13));
        button.setPreferredSize(new Dimension(110, 36));
        button.setFocusPainted(false);
        button.setBorderPainted(false);
        button.setCursor(Cursor.getPredefinedCursor(Cursor.HAND_CURSOR));
    }

    private void handleLogin() {
        String username = usernameField.getText().trim();
        String password = new String(passwordField.getPassword());

        LoginService.LoginResult result = new LoginService().authenticate(username, password);
        if (result == LoginService.LoginResult.SUCCESS) {
            messageLabel.setForeground(new Color(40, 160, 80));
            messageLabel.setText("ログイン成功！ようこそ、" + username + " さん。");
            loginButton.setEnabled(false);
        } else if (result == LoginService.LoginResult.EMPTY_INPUT) {
            messageLabel.setForeground(new Color(200, 60, 60));
            messageLabel.setText("ユーザー名とパスワードを入力してください。");
        } else {
            messageLabel.setForeground(new Color(200, 60, 60));
            messageLabel.setText("ユーザー名またはパスワードが正しくありません。");
            passwordField.setText("");
            passwordField.requestFocus();
        }
    }

    private void handleClear() {
        usernameField.setText("");
        passwordField.setText("");
        messageLabel.setText(" ");
        loginButton.setEnabled(true);
        usernameField.requestFocus();
    }
}