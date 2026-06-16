import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

@DisplayName("LoginService テスト")
class LoginServiceTest {

    private LoginService service;

    @BeforeEach
    void setUp() {
        service = new LoginService();
    }

    // --- 正常系 ---

    @Test
    @DisplayName("正しいユーザー名とパスワードでログイン成功")
    void testValidCredentials() {
        assertEquals(LoginService.LoginResult.SUCCESS,
                service.authenticate("admin", "1234"));
    }

    // --- 異常系: 認証失敗 ---

    @Test
    @DisplayName("パスワードが間違っている場合は認証失敗")
    void testWrongPassword() {
        assertEquals(LoginService.LoginResult.INVALID_CREDENTIALS,
                service.authenticate("admin", "wrong"));
    }

    @Test
    @DisplayName("ユーザー名が間違っている場合は認証失敗")
    void testWrongUsername() {
        assertEquals(LoginService.LoginResult.INVALID_CREDENTIALS,
                service.authenticate("unknown", "1234"));
    }

    @Test
    @DisplayName("ユーザー名・パスワードがどちらも間違っている場合は認証失敗")
    void testBothWrong() {
        assertEquals(LoginService.LoginResult.INVALID_CREDENTIALS,
                service.authenticate("unknown", "wrong"));
    }

    @Test
    @DisplayName("ユーザー名の大文字小文字は区別される")
    void testUsernameCaseSensitive() {
        assertEquals(LoginService.LoginResult.INVALID_CREDENTIALS,
                service.authenticate("Admin", "1234"));
    }

    @Test
    @DisplayName("パスワードの大文字小文字は区別される")
    void testPasswordCaseSensitive() {
        assertEquals(LoginService.LoginResult.INVALID_CREDENTIALS,
                service.authenticate("admin", "ADMIN"));
    }

    // --- 異常系: 入力未入力 ---

    @Test
    @DisplayName("ユーザー名が空文字の場合は EMPTY_INPUT")
    void testEmptyUsername() {
        assertEquals(LoginService.LoginResult.EMPTY_INPUT,
                service.authenticate("", "1234"));
    }

    @Test
    @DisplayName("パスワードが空文字の場合は EMPTY_INPUT")
    void testEmptyPassword() {
        assertEquals(LoginService.LoginResult.EMPTY_INPUT,
                service.authenticate("admin", ""));
    }

    @Test
    @DisplayName("両方空文字の場合は EMPTY_INPUT")
    void testBothEmpty() {
        assertEquals(LoginService.LoginResult.EMPTY_INPUT,
                service.authenticate("", ""));
    }

    @Test
    @DisplayName("ユーザー名がスペースのみの場合は EMPTY_INPUT")
    void testBlankUsername() {
        assertEquals(LoginService.LoginResult.EMPTY_INPUT,
                service.authenticate("   ", "1234"));
    }

    @Test
    @DisplayName("パスワードがスペースのみの場合は EMPTY_INPUT")
    void testBlankPassword() {
        assertEquals(LoginService.LoginResult.EMPTY_INPUT,
                service.authenticate("admin", "   "));
    }

    @Test
    @DisplayName("ユーザー名が null の場合は EMPTY_INPUT")
    void testNullUsername() {
        assertEquals(LoginService.LoginResult.EMPTY_INPUT,
                service.authenticate(null, "1234"));
    }

    @Test
    @DisplayName("パスワードが null の場合は EMPTY_INPUT")
    void testNullPassword() {
        assertEquals(LoginService.LoginResult.EMPTY_INPUT,
                service.authenticate("admin", null));
    }
}