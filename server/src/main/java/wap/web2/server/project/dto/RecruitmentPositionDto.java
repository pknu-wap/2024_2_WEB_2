package wap.web2.server.project.dto;

import com.fasterxml.jackson.core.JsonParser;
import com.fasterxml.jackson.core.JsonToken;
import com.fasterxml.jackson.databind.DeserializationContext;
import com.fasterxml.jackson.databind.JsonDeserializer;
import com.fasterxml.jackson.databind.annotation.JsonDeserialize;
import java.io.IOException;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import wap.web2.server.exception.BadRequestException;
import wap.web2.server.project.entity.RecruitmentPosition;

public record RecruitmentPositionDto(
    String role,
    @JsonDeserialize(using = HeadcountDeserializer.class) Integer count
) {

    public static class HeadcountDeserializer extends JsonDeserializer<Integer> {
        @Override
        public Integer deserialize(JsonParser parser, DeserializationContext context) throws IOException {
            if (!parser.hasToken(JsonToken.VALUE_NUMBER_INT)) {
                return (Integer) context.handleUnexpectedToken(Integer.class, parser);
            }
            return parser.getIntValue();
        }
    }

    public static RecruitmentPositionDto from(RecruitmentPosition position) {
        return new RecruitmentPositionDto(position.getRole(), position.getCount());
    }

    public static List<RecruitmentPosition> toEntities(List<RecruitmentPositionDto> positions) {
        List<RecruitmentPosition> result = new ArrayList<>();
        if (positions == null) {
            return result;
        }
        Set<String> roles = new HashSet<>();
        for (RecruitmentPositionDto position : positions) {
            if (position == null || position.role() == null || position.role().isBlank()
                || position.role().strip().length() > 50) {
                throw new BadRequestException("모집 직무는 1~50자로 입력해 주세요.");
            }
            String role = position.role().strip();
            if (!roles.add(role)) {
                throw new BadRequestException("모집 직무가 중복되었습니다.");
            }
            if (position.count() == null || position.count() < 1) {
                throw new BadRequestException("모집 인원은 1 이상의 정수로 입력해 주세요.");
            }
            result.add(new RecruitmentPosition(role, position.count()));
        }
        return result;
    }
}
