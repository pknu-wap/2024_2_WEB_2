package wap.web2.server.domain;

import lombok.Getter;

@Getter
public enum TechStack {
    // Frontend
    REACT("React", "", TechStackType.FRONT),
    ANGULAR("Angular", "", TechStackType.FRONT),
    NEXT_JS("Next.js", "", TechStackType.FRONT),

    // Backend
    SPRING("Spring", "", TechStackType.BACK),
    DJANGO("Django", "", TechStackType.BACK),
    FLASK("Flask", "", TechStackType.BACK),
    EXPRESS("Express.js", "", TechStackType.BACK),

    // App
    ANDROID("Android", "", TechStackType.APP),
    IOS("iOS", "", TechStackType.APP),
    REACT_NATIVE("React Native", "", TechStackType.APP),
    FLUTTER("Flutter", "", TechStackType.APP),

    // DEPLOYMENT
    AWS("AWS", "", TechStackType.DEPLOYMENT),
    AZURE("Azure", "", TechStackType.DEPLOYMENT),
    GOOGLE_CLOUD("Google Cloud", "", TechStackType.DEPLOYMENT),
    DOCKER("Docker", "", TechStackType.DEPLOYMENT),

    // Game Development
    UNITY("Unity", "", TechStackType.GAME),
    UNREAL_ENGINE("Unreal Engine", "", TechStackType.GAME),
    GODOT("Godot", "", TechStackType.GAME),
    GAME_MAKER("GameMaker", "", TechStackType.GAME);

    private final String name;
    private final String image;
    private final TechStackType type;

    TechStack(String name, String image, TechStackType type) {
        this.name = name;
        this.image = image;
        this.type = type;
    }
}
