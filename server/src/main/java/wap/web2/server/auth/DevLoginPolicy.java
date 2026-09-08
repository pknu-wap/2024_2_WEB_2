package wap.web2.server.auth;

public final class DevLoginPolicy {
    public static final int MIN_DEV_ACCOUNT_NUMBER = 1;
    public static final int MAX_DEV_ACCOUNT_NUMBER = 100;
    public static final int DEV_ACCOUNT_COUNT = MAX_DEV_ACCOUNT_NUMBER - MIN_DEV_ACCOUNT_NUMBER + 1;

    private DevLoginPolicy() {}
}
