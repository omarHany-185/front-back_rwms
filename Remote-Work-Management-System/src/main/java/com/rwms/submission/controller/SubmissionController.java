package com.rwms.submission.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.rwms.submission.dto.*;
import com.rwms.submission.service.SubmissionService;
import com.rwms.user.entity.User;
import jakarta.validation.Valid;
import org.springframework.core.io.InputStreamResource;
import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.File;
import java.io.FileInputStream;
import java.io.FileNotFoundException;
import java.util.List;

@RestController
@RequestMapping("/submissions")
public class SubmissionController {

    private final SubmissionService submissionService;

    public SubmissionController(SubmissionService submissionService) {
        this.submissionService = submissionService;
    }

    @PostMapping(value = "/task/{taskId}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<SubmissionResponse> submitTask(@PathVariable Long taskId,
                                                         @RequestParam("request") String requestJson,
                                                         @RequestParam(value = "file", required = false) MultipartFile file,
                                                         @AuthenticationPrincipal User user) throws Exception {
        
        ObjectMapper mapper = new ObjectMapper();
        SubmitTaskRequest request = mapper.readValue(requestJson, SubmitTaskRequest.class);
        
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(submissionService.submitTask(taskId, request, file, user.getEmail()));
    }

    @GetMapping("/my")
    public ResponseEntity<List<SubmissionResponse>> getMySubmissions(@AuthenticationPrincipal User user) {
        return ResponseEntity.ok(submissionService.getMySubmissions(user.getEmail()));
    }

    @GetMapping("/{id}/detail")
    public ResponseEntity<SubmissionDetailResponse> getSubmissionDetail(@PathVariable Long id) {
        return ResponseEntity.ok(submissionService.getSubmissionDetail(id));
    }

    @PostMapping("/{id}/review")
    public ResponseEntity<SubmissionResponse> reviewSubmission(@PathVariable Long id,
                                                               @Valid @RequestBody ReviewRequest request,
                                                               @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(submissionService.reviewSubmission(id, request, user.getEmail()));
    }

    @GetMapping("/pending/project/{projectId}")
    public ResponseEntity<List<SubmissionResponse>> getPendingSubmissionsByProject(@PathVariable Long projectId) {
        return ResponseEntity.ok(submissionService.getPendingSubmissionsByProject(projectId));
    }

    // --- Comments ---

    @PostMapping("/{id}/comments")
    public ResponseEntity<CommentResponse> addComment(@PathVariable Long id,
                                                      @Valid @RequestBody CommentRequest request,
                                                      @AuthenticationPrincipal User user) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(submissionService.addComment(id, request, user.getEmail()));
    }

    @GetMapping("/{id}/comments")
    public ResponseEntity<List<CommentResponse>> getComments(@PathVariable Long id,
                                                             @AuthenticationPrincipal User user) {
        return ResponseEntity.ok(submissionService.getComments(id, user.getEmail()));
    }

    @GetMapping("/{id}/file")
    public ResponseEntity<Resource> getAttachmentFile(@PathVariable Long id) {
        String path = submissionService.getAttachmentPath(id);
        if (path == null || path.isEmpty()) {
            return ResponseEntity.notFound().build();
        }
        File file = new File(path);
        if (!file.exists()) {
            return ResponseEntity.notFound().build();
        }
        try {
            InputStreamResource resource = new InputStreamResource(new FileInputStream(file));
            String filename = file.getName();
            int idx = filename.indexOf('_');
            String displayName = (idx > 0 && idx + 1 < filename.length()) ? filename.substring(idx + 1) : filename;

            return ResponseEntity.ok()
                    .contentType(MediaType.APPLICATION_OCTET_STREAM)
                    .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + displayName + "\"")
                    .body(resource);
        } catch (FileNotFoundException e) {
            return ResponseEntity.notFound().build();
        }
    }
}
