package wap.web2.server.domain;

import jakarta.persistence.*;
import lombok.AllArgsConstructor;
import lombok.Getter;
import lombok.NoArgsConstructor;

@Entity
@Getter
@NoArgsConstructor
@AllArgsConstructor
public class TechStack {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long techStackId;

    private String image;

    @Enumerated(EnumType.STRING)
    private TechStackName techStackName;

    @Enumerated(EnumType.STRING)
    private TechStackType techStackType;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "project_id")
    private Project project;
}