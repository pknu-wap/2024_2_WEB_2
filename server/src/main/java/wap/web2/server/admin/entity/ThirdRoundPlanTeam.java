package wap.web2.server.admin.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Getter
@NoArgsConstructor
@Table(uniqueConstraints = @UniqueConstraint(columnNames = {"semester", "project_id"}))
public class ThirdRoundPlanTeam {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY) private Long id;
    @Column(nullable = false, length = 7) private String semester;
    private Long projectId;
    @Column(nullable = false) private String name;

    public ThirdRoundPlanTeam(String semester, Long projectId, String name) {
        this.semester = semester;
        this.projectId = projectId;
        this.name = name;
    }
    public boolean isCreated() { return projectId == null; }
}
