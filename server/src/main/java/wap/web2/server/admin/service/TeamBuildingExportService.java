package wap.web2.server.admin.service;

import static wap.web2.server.util.SemesterGenerator.generateSemester;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.OutputStreamWriter;
import java.nio.charset.StandardCharsets;
import lombok.RequiredArgsConstructor;
import org.apache.commons.csv.CSVFormat;
import org.apache.commons.csv.CSVPrinter;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Service;
import wap.web2.server.exception.InternalServerException;
import wap.web2.server.teambuild.entity.ProjectApply;
import wap.web2.server.teambuild.entity.ProjectRecruit;
import wap.web2.server.teambuild.entity.ProjectRecruitWish;
import wap.web2.server.teambuild.repository.ProjectApplyRepository;
import wap.web2.server.teambuild.repository.ProjectRecruitRepository;

@Service
@RequiredArgsConstructor
public class TeamBuildingExportService {
    private static final int EXPORT_PAGE_SIZE = 1000;
    private static final int INITIAL_BUFFER_SIZE_BYTES = 64 * 1024;

    private final ProjectApplyRepository applyRepository;
    private final ProjectRecruitRepository projectRecruitRepository;

    /**
     * 지원현황 CSV(UTF-8 with BOM) 전체를 메모리에서 만들어 byte[]로 반환
     */
    public byte[] generateAppliesCsvBytes() {
        ByteArrayOutputStream baos = new ByteArrayOutputStream(INITIAL_BUFFER_SIZE_BYTES);

        try (
            OutputStreamWriter w = new OutputStreamWriter(baos, StandardCharsets.UTF_8);
            CSVPrinter csv = new CSVPrinter(w, CSVFormat.DEFAULT)
        ) {
            // Excel 한글 호환 BOM
            w.write('\uFEFF');

            // 헤더
            csv.printRecord("applyId", "userId", "projectId", "position", "priority", "semester");

            int page = 0;
            Page<ProjectApply> p;
            do {
                p = applyRepository.findAllBySemester(
                    generateSemester(),
                    PageRequest.of(page++, EXPORT_PAGE_SIZE)
                );
                for (ProjectApply a : p.getContent()) {
                    csv.printRecord(
                        a.getId(),
                        a.getUser().getId(),
                        a.getProject().getProjectId(),
                        a.getPosition(),
                        a.getPriority(),
                        a.getSemester()
                    );
                }
                csv.flush(); // 메모리 내 flush
            } while (!p.isLast());
        } catch (IOException e) {
            throw new InternalServerException("지원 CSV 생성 중 오류가 발생했습니다.", e);
        }

        return baos.toByteArray();
    }

    /**
     * 모집 현황 CSV(UTF-8 with BOM)를 메모리에서 생성해 byte[]로 반환. 1행 = 한 모집의 한 wish(우선순위 한 줄). wish가 없으면 빈 wish로 1행을 만들어 모집 자체가
     * 누락되지 않도록 함.
     */
    public byte[] generateRecruitsCsvBytes() {
        ByteArrayOutputStream baos = new ByteArrayOutputStream(INITIAL_BUFFER_SIZE_BYTES);

        try (
            OutputStreamWriter w = new OutputStreamWriter(baos, StandardCharsets.UTF_8);
            CSVPrinter csv = new CSVPrinter(w, CSVFormat.DEFAULT)
        ) {
            // Excel 한글 호환 BOM
            w.write('\uFEFF');

            // 헤더
            csv.printRecord(
                "recruitId",
                "projectId",
                "leaderId",
                "position",
                "capacity",
                "semester",
                "wishApplicantId",
                "wishPriority"
            );

            int page = 0;
            Page<ProjectRecruit> p;
            do {
                p = projectRecruitRepository.findAllBySemester(
                    generateSemester(),
                    PageRequest.of(page++, EXPORT_PAGE_SIZE)
                );

                for (ProjectRecruit r : p.getContent()) {
                    if (r.getWishList() == null || r.getWishList().isEmpty()) {
                        // wish가 전혀 없으면 빈 wish로 1행
                        csv.printRecord(
                            r.getId(),
                            r.getProjectId(),
                            r.getLeaderId(),
                            r.getPosition(),
                            r.getCapacity(),
                            r.getSemester(),
                            "", // wishApplicantId
                            "" // wishPriority
                        );
                    } else {
                        for (ProjectRecruitWish wsh : r.getWishList()) {
                            csv.printRecord(
                                r.getId(),
                                r.getProjectId(),
                                r.getLeaderId(),
                                r.getPosition(),
                                r.getCapacity(),
                                r.getSemester(),
                                wsh.getApplicantId(),
                                wsh.getPriority()
                            );
                        }
                    }
                }

                csv.flush(); // 메모리 내 flush
            } while (!p.isLast());
        } catch (IOException e) {
            throw new InternalServerException("모집 CSV 생성 중 오류가 발생했습니다.", e);
        }

        return baos.toByteArray();
    }
}
