package wap.web2.server.admin.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Getter
@NoArgsConstructor
@AllArgsConstructor
public class TeamBuildingMeta {

    public TeamBuildingMeta(String semester) {
        this.semester = semester;
    }

    public TeamBuildingMeta(Long id, String semester, TeamBuildingStatus status) {
        this.id = id;
        this.semester = semester;
        this.status = status;
    }

    @Column(nullable = false)
    private int round = 1;

    @Column(nullable = false)
    private int completedRound = 0;

    public void changeStatus(TeamBuildingStatus next) {
        if (next == TeamBuildingStatus.APPLY && status == TeamBuildingStatus.CLOSED
            && completedRound == round) {
            if (round >= 2) {
                throw new wap.web2.server.exception.ConflictException("지원 방식의 팀빌딩은 2차까지 진행할 수 있습니다.");
            }
            round++;
        } else if (next != TeamBuildingStatus.CLOSED && completedRound >= round) {
            throw new wap.web2.server.exception.ConflictException("완료된 차수는 다시 진행할 수 없습니다.");
        }
        this.status = next;
    }

    public void completeRound() {
        completedRound = round;
    }

    @Id
    @Column
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 7)
    private String semester;

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private TeamBuildingStatus status = TeamBuildingStatus.OPEN;
}
