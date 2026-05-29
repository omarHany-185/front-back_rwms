package com.rwms.project.dto;

import lombok.*;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ProjectResponse {

    private Long id;
    private String name;
    private String department;
    private String description;
    private String status;
    private String teamLeaderName;
    private int contributorCount;
    private int taskCount;
    private int completedTaskCount;

    /** Full contributor list so the frontend can manage team membership. */
    private List<ContributorDto> contributors;

    @Data
    @Builder
    @NoArgsConstructor
    @AllArgsConstructor
    public static class ContributorDto {
        private Long id;
        private String fullName;
        private String email;
    }
}
