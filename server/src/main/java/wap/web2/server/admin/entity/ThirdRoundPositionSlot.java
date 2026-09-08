package wap.web2.server.admin.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import wap.web2.server.teambuild.entity.Position;

/** An applicant in the staffing plan; this does not finalize team allocation. */
@Entity
@Getter
@NoArgsConstructor
public class ThirdRoundPositionSlot {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, length = 7) private String semester;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 32) private Position position;
    private Long teamId;
    private Long userId;

    public ThirdRoundPositionSlot(String semester, Position position) {
        this.semester = semester;
        this.position = position;
    }
    public void identify(Long userId) { this.userId = userId; }
    public void moveTo(Long teamId) { this.teamId = teamId; }
}
