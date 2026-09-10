package wap.web2.server.teambuild.entity;

import java.util.Locale;
import java.util.Optional;

public enum Position {
    FRONTEND, BACKEND, AI, DESIGN, APP, GAME, EMBEDDED;

    public static Optional<Position> fromRecruitmentRole(String role) {
        if (role == null) return Optional.empty();
        return Optional.ofNullable(switch (role.strip().toUpperCase(Locale.ROOT)) {
            case "FRONTEND", "프론트엔드", "CLIENT" -> FRONTEND;
            case "BACKEND", "백엔드", "SERVER" -> BACKEND;
            case "AI" -> AI;
            case "DESIGN", "DESIGNER", "디자인", "디자이너" -> DESIGN;
            case "APP", "앱" -> APP;
            case "GAME", "게임" -> GAME;
            case "EMBEDDED", "임베디드", "HARDWARE", "하드웨어" -> EMBEDDED;
            default -> null;
        });
    }
}
