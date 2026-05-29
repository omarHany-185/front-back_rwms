package com.rwms.project.service;

import com.rwms.common.exception.ResourceNotFoundException;
import com.rwms.project.dto.AddContributorsRequest;
import com.rwms.project.dto.CreateProjectRequest;
import com.rwms.project.dto.ProjectResponse;
import com.rwms.project.dto.TeamLeaderRequestResponse;
import com.rwms.project.entity.Project;
import com.rwms.project.entity.TeamLeaderRequest;
import com.rwms.project.repository.ProjectRepository;
import com.rwms.project.repository.TeamLeaderRequestRepository;
import com.rwms.user.entity.User;
import com.rwms.user.repository.UserRepository;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@Transactional
public class ProjectService implements IProjectService {

    private final ProjectRepository projectRepository;
    private final UserRepository userRepository;
    private final TeamLeaderRequestRepository teamLeaderRequestRepository;

    public ProjectService(ProjectRepository projectRepository, UserRepository userRepository,
                          TeamLeaderRequestRepository teamLeaderRequestRepository) {
        this.projectRepository = projectRepository;
        this.userRepository = userRepository;
        this.teamLeaderRequestRepository = teamLeaderRequestRepository;
    }

    private ProjectResponse toResponse(Project project) {
        List<ProjectResponse.ContributorDto> contributors = project.getContributors().stream()
                .map(u -> ProjectResponse.ContributorDto.builder()
                        .id(u.getId())
                        .fullName(u.getFullName())
                        .email(u.getEmail())
                        .build())
                .collect(Collectors.toList());

        return ProjectResponse.builder()
                .id(project.getId())
                .name(project.getName())
                .department(project.getDepartment())
                .description(project.getDescription())
                .status(project.getStatus().name())
                .teamLeaderName(project.getTeamLeader() != null ? project.getTeamLeader().getFullName() : null)
                .contributorCount(contributors.size())
                .contributors(contributors)
                .taskCount(0)
                .completedTaskCount(0)
                .build();
    }

    private TeamLeaderRequestResponse toTlResponse(TeamLeaderRequest request) {
        return TeamLeaderRequestResponse.builder()
                .id(request.getId())
                .requesterId(request.getRequester().getId())
                .requesterName(request.getRequester().getFullName())
                .requesterEmail(request.getRequester().getEmail())
                .projectId(request.getProject().getId())
                .projectName(request.getProject().getName())
                .status(request.getStatus().name())
                .submittedAt(request.getSubmittedAt())
                .build();
    }

    @Override
    public ProjectResponse createProject(CreateProjectRequest request, String creatorEmail) {
        User creator = userRepository.findByEmail(creatorEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + creatorEmail));

        // Projects start as PENDING until a manager approves them.
        Project project = Project.builder()
                .name(request.getName())
                .department(request.getDepartment())
                .description(request.getDescription())
                .status(Project.Status.PENDING)
                .teamLeader(creator)
                .build();
        Project saved = projectRepository.save(project);

        // Automatically create a TeamLeaderRequest so the manager sees it in the approval queue.
        TeamLeaderRequest tlRequest = TeamLeaderRequest.builder()
                .project(saved)
                .requester(creator)
                .status(TeamLeaderRequest.RequestStatus.PENDING)
                .build();
        teamLeaderRequestRepository.save(tlRequest);

        return toResponse(saved);
    }

    @Override
    public List<ProjectResponse> getProjectsByDepartment(String department) {
        return projectRepository.findByDepartment(department)
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    public List<ProjectResponse> getAllProjects() {
        return projectRepository.findAll()
                .stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    public List<ProjectResponse> getMyProjects(String adminEmail) {
        User user = userRepository.findByEmail(adminEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found"));

        List<Project> asLeader = projectRepository.findByTeamLeaderId(user.getId());
        List<Project> asContributor = projectRepository.findByContributorsContaining(user);

        java.util.Map<Long, Project> merged = new java.util.LinkedHashMap<>();
        asLeader.forEach(p -> merged.put(p.getId(), p));
        asContributor.forEach(p -> merged.putIfAbsent(p.getId(), p));

        return merged.values().stream()
                .map(this::toResponse)
                .collect(Collectors.toList());
    }

    @Override
    public ProjectResponse getProjectById(Long id) {
        Project project = projectRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found with id: " + id));
        return toResponse(project);
    }

    @Override
    public ProjectResponse addContributors(Long projectId, AddContributorsRequest request) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found: " + projectId));

        for (Long userId : request.getUserIds()) {
            User user = userRepository.findById(userId)
                    .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));
            if (!project.getContributors().contains(user)) {
                project.getContributors().add(user);
            }
        }
        return toResponse(projectRepository.save(project));
    }

    @Override
    public ProjectResponse removeContributor(Long projectId, Long userId) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found: " + projectId));
        User user = userRepository.findById(userId)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + userId));

        project.getContributors().remove(user);
        return toResponse(projectRepository.save(project));
    }

    @Override
    public void submitTeamLeaderRequest(Long projectId, String adminEmail) {
        Project project = projectRepository.findById(projectId)
                .orElseThrow(() -> new ResourceNotFoundException("Project not found: " + projectId));
        User requester = userRepository.findByEmail(adminEmail)
                .orElseThrow(() -> new ResourceNotFoundException("User not found: " + adminEmail));

        TeamLeaderRequest request = TeamLeaderRequest.builder()
                .project(project)
                .requester(requester)
                .status(TeamLeaderRequest.RequestStatus.PENDING)
                .build();
        teamLeaderRequestRepository.save(request);
    }

    @Override
    public List<TeamLeaderRequestResponse> getPendingTeamLeaderRequests() {
        return teamLeaderRequestRepository.findByStatus(TeamLeaderRequest.RequestStatus.PENDING)
                .stream()
                .map(this::toTlResponse)
                .collect(Collectors.toList());
    }

    @Override
    public void approveTeamLeaderRequest(Long requestId) {
        TeamLeaderRequest request = teamLeaderRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Request not found: " + requestId));

        if (request.getStatus() != TeamLeaderRequest.RequestStatus.PENDING) {
            throw new IllegalArgumentException("Request is not pending");
        }

        request.setStatus(TeamLeaderRequest.RequestStatus.APPROVED);
        teamLeaderRequestRepository.save(request);

        // Activate the project and assign the team leader.
        Project project = request.getProject();
        project.setStatus(Project.Status.ACTIVE);
        project.setTeamLeader(request.getRequester());
        projectRepository.save(project);
    }

    @Override
    public void rejectTeamLeaderRequest(Long requestId) {
        TeamLeaderRequest request = teamLeaderRequestRepository.findById(requestId)
                .orElseThrow(() -> new ResourceNotFoundException("Request not found: " + requestId));

        if (request.getStatus() != TeamLeaderRequest.RequestStatus.PENDING) {
            throw new IllegalArgumentException("Request is not pending");
        }

        request.setStatus(TeamLeaderRequest.RequestStatus.REJECTED);
        teamLeaderRequestRepository.save(request);
    }
}
