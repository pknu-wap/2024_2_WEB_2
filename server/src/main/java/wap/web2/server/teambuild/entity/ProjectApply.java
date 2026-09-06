package wap.web2.server.teambuild.entity;

import static wap.web2.server.util.SemesterGenerator.generateSemester;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.PrePersist;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import wap.web2.server.member.entity.User;
import wap.web2.server.project.entity.Project;

@Entity
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProjectApply {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private Integer priority; // 지원은 1부터 5까지 우선순위를 가진다.

    @Column(nullable = false)
    @Enumerated(EnumType.STRING)
    private Position position; // 지원 분야 ex) BE, FE, AI, etc..

    @Column(nullable = false, length = 255)
    private String comment; // 자율 서술 부분

    @Column(columnDefinition = "TEXT")
    private String career;

    @Builder.Default
    @Column(nullable = false)
    private int round = 1;

    @Column(nullable = false, length = 7)
    private String semester; // "year-semester"

    // TODO: N+1 문제 생기는지 파악 필요
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private User user;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id", nullable = false)
    private Project project;

    @PrePersist
    private void onCreate() {
        if (this.semester == null) {
            this.semester = generateSemester();
        }
    }
}
