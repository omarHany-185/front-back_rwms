package com.rwms.timer.repository;

import com.rwms.timer.entity.WorkSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface WorkSessionRepository extends JpaRepository<WorkSession, Long> {

    Optional<WorkSession> findByEmployeeIdAndState(Long empId, WorkSession.SessionState state);

    @Query("SELECT ws FROM WorkSession ws WHERE ws.employee.id = :empId AND ws.state IN ('RUNNING', 'ON_BREAK')")
    Optional<WorkSession> findActiveByEmployeeId(Long empId);

    @Query("SELECT ws FROM WorkSession ws WHERE ws.employee.id IN :empIds AND ws.state IN ('RUNNING', 'ON_BREAK')")
    List<WorkSession> findActiveByEmployeeIdIn(List<Long> empIds);

    @Query("SELECT ws FROM WorkSession ws WHERE ws.employee.id IN :empIds AND ws.sessionStartedAt >= :since ORDER BY ws.employee.id, ws.sessionStartedAt DESC")
    List<WorkSession> findByEmployeeIdInAndSessionStartedAtAfter(List<Long> empIds, LocalDateTime since);
}
