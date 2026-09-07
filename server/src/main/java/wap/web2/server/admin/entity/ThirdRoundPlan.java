package wap.web2.server.admin.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Getter
@NoArgsConstructor
public class ThirdRoundPlan {
    @Id @Column(length = 7) private String semester;
    @Column(nullable = false) private long revision;
    @Column(nullable = false) private long nextTeamNumber = 1;

    public ThirdRoundPlan(String semester) { this.semester = semester; }
    public void advanceRevision() { revision++; }
    public String nextTeamName() {
        long number = nextTeamNumber++;
        StringBuilder suffix = new StringBuilder();
        while (number > 0) {
            number--;
            suffix.append((char) ('A' + number % 26));
            number /= 26;
        }
        return "팀 " + suffix.reverse();
    }
}
