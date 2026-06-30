package com.example.ai03.repository;

import com.example.ai03.domain.entity.Task;
import com.example.ai03.domain.entity.User;
import com.example.ai03.domain.enums.TaskStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface TaskRepository extends JpaRepository<Task, Long> {

    @Query("SELECT t FROM Task t LEFT JOIN FETCH t.assignedUser LEFT JOIN FETCH t.createdUser ORDER BY t.createdAt DESC")
    List<Task> findAllWithDetails();

    @Query("SELECT t FROM Task t LEFT JOIN FETCH t.assignedUser LEFT JOIN FETCH t.createdUser WHERE t.assignedUser = :user ORDER BY t.createdAt DESC")
    List<Task> findByAssignedUserWithDetails(@Param("user") User user);

    @Query("SELECT t FROM Task t LEFT JOIN FETCH t.assignedUser LEFT JOIN FETCH t.createdUser WHERE t.status = :status ORDER BY t.createdAt DESC")
    List<Task> findByStatusWithDetails(@Param("status") TaskStatus status);

    @Query("SELECT t FROM Task t LEFT JOIN FETCH t.assignedUser LEFT JOIN FETCH t.createdUser WHERE t.assignedUser = :user AND t.status = :status ORDER BY t.createdAt DESC")
    List<Task> findByAssignedUserAndStatusWithDetails(@Param("user") User user, @Param("status") TaskStatus status);
}
