package com.rwms.project.service;

import com.rwms.project.dto.AddContributorsRequest;
import com.rwms.project.dto.CreateProjectRequest;
import com.rwms.project.dto.ProjectResponse;
import com.rwms.project.dto.TeamLeaderRequestResponse;

import java.util.List;

public interface IProjectService {

    ProjectResponse createProject(CreateProjectRequest request, String creatorEmail);

    List<ProjectResponse> getProjectsByDepartment(String department);

    List<ProjectResponse> getMyProjects(String adminEmail);

    ProjectResponse getProjectById(Long id);

    ProjectResponse addContributors(Long projectId, AddContributorsRequest request);

    ProjectResponse removeContributor(Long projectId, Long userId);

    void submitTeamLeaderRequest(Long projectId, String adminEmail);

    // Manager Operations for TL Requests
    List<TeamLeaderRequestResponse> getPendingTeamLeaderRequests();

    void approveTeamLeaderRequest(Long requestId);

    void rejectTeamLeaderRequest(Long requestId);
}
