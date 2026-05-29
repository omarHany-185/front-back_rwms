package com.rwms.submission.dto;

import lombok.*;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SubmissionResponse {

    private Long id;
    private String taskName;
    private Long employeeId;
    private String employeeName;
    private LocalDateTime submittedAt;
    private String reviewStatus;
    private String rejectionReason;
    private String adminNote;
}
