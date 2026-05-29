package com.rwms.timer.dto;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TeamWorkStatusResponse {
    private Long employeeId;
    private String sessionState;
    private long workedSeconds;
    private long breakSeconds;
}