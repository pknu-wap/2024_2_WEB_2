package wap.web2.server.teambuild.entity;

import static wap.web2.server.util.SemesterGenerator.generateSemester;

import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.PrePersist;
import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProjectRecruit {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Long leaderId;

    @Column(nullable = false)
    private Long projectId;

    // 모집 분야
    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private Position position;

    // 팀원 제한 수
    @Column(nullable = false)
    private Integer capacity;

    @Builder.Default
    @Column(nullable = false)
    private int round = 1;

    @Column(nullable = false, length = 7)
    private String semester; // "year-semester"

    // 희망 지원자 목록
    @Setter
    @OrderBy("priority ASC")
    @OneToMany(mappedBy = "recruit", cascade = CascadeType.ALL, fetch = FetchType.LAZY)
    private List<ProjectRecruitWish> wishList;

    @PrePersist
    private void onCreate() {
        if (this.semester == null) {
            this.semester = generateSemester();
        }
    }
}
