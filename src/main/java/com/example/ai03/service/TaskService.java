package com.example.ai03.service;

import com.example.ai03.domain.entity.Task;
import com.example.ai03.domain.entity.User;
import com.example.ai03.domain.enums.TaskStatus;

import java.util.List;

public interface TaskService {

    List<Task> findAllTasks();

    List<Task> findTasksByAssignedUser(User user);

    List<Task> findTasksByStatus(TaskStatus status);

    List<Task> findTasksByAssignedUserAndStatus(User user, TaskStatus status);
}
