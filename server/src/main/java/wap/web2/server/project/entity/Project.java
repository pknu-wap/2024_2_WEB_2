package wap.web2.server.project.entity;

import jakarta.persistence.CollectionTable;
import jakarta.persistence.ElementCollection;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.Lob;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import java.util.ArrayList;
import java.util.Collection;
import java.util.HashSet;
import java.util.List;
import java.util.Objects;
import java.util.Set;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Getter;
import lombok.NoArgsConstructor;
import wap.web2.server.comment.entity.Comment;
import wap.web2.server.member.entity.User;
import wap.web2.server.project.dto.RecruitmentPositionDto;
import wap.web2.server.project.dto.TeamMemberDto;
import wap.web2.server.project.dto.TechStackDto;
import wap.web2.server.project.dto.request.ProjectRequest;

@Entity
@Getter
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class Project {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long projectId;

    @Column
    private String title;

    @Column
    private String projectType;

    @Lob
    @Column(length = 9000)
    private String content;

    @Column
    private String summary;

    @Column(length = 7)
    private String semester;

    @Column(length = 1000)
    private String thumbnail;

    @Builder.Default
    @OneToMany(mappedBy = "project", cascade = CascadeType.ALL, orphanRemoval = true)
    List<Image> images = new ArrayList<>();

    @Builder.Default
    @OneToMany(mappedBy = "project", cascade = CascadeType.ALL, orphanRemoval = true)
    List<Comment> comments = new ArrayList<>();

    @Builder.Default
    @OneToMany(mappedBy = "project", cascade = CascadeType.ALL, orphanRemoval = true)
    List<TeamMember> teamMembers = new ArrayList<>();

    @Builder.Default
    @OneToMany(mappedBy = "project", cascade = CascadeType.ALL, orphanRemoval = true)
    List<TechStack> techStacks = new ArrayList<>();

    @Builder.Default
    @ElementCollection
    @CollectionTable(name = "project_recruitment_position", joinColumns = @JoinColumn(name = "project_id"))
    @OrderColumn(name = "position_order")
    private List<RecruitmentPosition> recruitmentPositions = new ArrayList<>();

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id")
    private User user; // Owner

    public void update(ProjectRequest request) {
        // 필드가 생략된 기존 클라이언트 요청은 모집 정보를 유지한다.
        if (request.getRecruitmentPositions() != null) {
            List<RecruitmentPosition> positions = RecruitmentPositionDto.toEntities(request.getRecruitmentPositions());
            this.recruitmentPositions.clear();
            this.recruitmentPositions.addAll(positions);
        }

        // 기본 필드 업데이트
        this.title = request.getTitle();
        this.projectType = request.getProjectType();
        this.content = request.getContent();
        this.summary = request.getSummary();

        // 팀 멤버 리스트 초기화 및 새로 추가
        this.teamMembers.clear();
        if (request.getTeamMember() != null && !request.getTeamMember().isEmpty()) {
            List<TeamMember> newTeamMembers = request
                .getTeamMember()
                .stream()
                .map(TeamMemberDto::toEntity)
                .toList();
            this.teamMembers.addAll(newTeamMembers);
        }

        // 기술 스택 리스트 초기화 및 새로 추가
        this.techStacks.clear();
        if (request.getTechStack() != null && !request.getTechStack().isEmpty()) {
            List<TechStack> newTechStacks = request
                .getTechStack()
                .stream()
                .map(TechStackDto::toEntity)
                .toList();
            this.techStacks.addAll(newTechStacks);
        }

        // 기존 댓글 리스트는 요청에서 수정되지 않음

        // 연관관계 설정이 필요한 경우 추가 로직
        this.images.forEach(image -> image.updateImage(this));
        this.teamMembers.forEach(teamMember -> teamMember.updateTeamMember(this));
        this.techStacks.forEach(techStack -> techStack.updateTechStack(this));
    }

    public void updateThumbnail(String thumbnailUrl) {
        this.thumbnail = thumbnailUrl;
    }

    public void addAllImage(List<Image> images) {
        for (Image image : images) {
            this.images.add(image);
            image.updateImage(this); // 연관관계 양쪽 매핑
        }
    }

    public List<String> removeImages(Collection<String> imageUrls) {
        Set<String> removalTargets = new HashSet<>(imageUrls);
        List<String> removedImageUrls = this.images.stream()
            .map(Image::getImageFile)
            .filter(removalTargets::contains)
            .toList();

        this.images.removeIf(image -> removalTargets.contains(image.getImageFile()));

        return removedImageUrls;
    }

    public boolean isOwner(User user) {
        return Objects.equals(this.user.getId(), user.getId());
    }
}
