public class LoginService {

    public enum LoginResult {
        SUCCESS,
        EMPTY_INPUT,
        INVALID_CREDENTIALS
    }

    public LoginResult authenticate(String username, String password) {
        if (username == null || username.trim().isEmpty() ||
            password == null || password.trim().isEmpty()) {
            return LoginResult.EMPTY_INPUT;
        }
        if (username.equals("admin") && password.equals("1234")) {
            return LoginResult.SUCCESS;
        }
        return LoginResult.INVALID_CREDENTIALS;
    }
}