package wap.web2.server.project.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Embeddable;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Embeddable
@Getter
@NoArgsConstructor
@AllArgsConstructor
public class RecruitmentPosition {

    @Column(name = "role", nullable = false, length = 50)
    private String role;

    @Column(name = "headcount", nullable = false)
    private Integer count;
}
