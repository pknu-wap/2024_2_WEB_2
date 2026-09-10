package wap.web2.server.teambuild.service;

public final class ApplicationPolicy {
    public static final int MIN_APPLICATIONS_PER_REQUEST = 1;
    public static final int MAX_APPLICATIONS_PER_ROUND = 5;
    public static final int MAX_MESSAGE_LENGTH = 60;

    private ApplicationPolicy() {}
}
