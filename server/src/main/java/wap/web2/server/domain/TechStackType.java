package wap.web2.server.domain;

import lombok.Getter;

@Getter
public enum TechStackType {
    FRONT("Front"),
    BACK("Back"),
    APP("App"),
    DEPLOYMENT("Deployment"),
    GAME("Game");

    private final String type;

    TechStackType(String type) {
        this.type = type;
    }
}
