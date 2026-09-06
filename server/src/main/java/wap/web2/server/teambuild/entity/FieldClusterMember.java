package wap.web2.server.teambuild.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Getter
@NoArgsConstructor
@Table(uniqueConstraints = @UniqueConstraint(columnNames = {"semester", "user_id"}))
public class FieldClusterMember {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @Column(nullable = false, length = 7)
    private String semester;
    @Column(nullable = false)
    private Long userId;
    @Enumerated(EnumType.STRING) @Column(nullable = false, length = 32)
    private Position position;

    public FieldClusterMember(String semester, Long userId, Position position) {
        this.semester = semester; this.userId = userId; this.position = position;
    }
    public void changePosition(Position position) {
        this.position = position;
    }
}
