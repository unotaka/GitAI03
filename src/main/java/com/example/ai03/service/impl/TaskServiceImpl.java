package com.example.ai03.service.impl;

import com.example.ai03.domain.entity.Task;
import com.example.ai03.domain.entity.User;
import com.example.ai03.domain.enums.TaskStatus;
import com.example.ai03.repository.TaskRepository;
import com.example.ai03.service.TaskService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;

@Slf4j
@Service
@RequiredArgsConstructor
public class TaskServiceImpl implements TaskService {

    private final TaskRepository taskRepository;

    @Override
    @Transactional(readOnly = true)
    public List<Task> findAllTasks() {
        List<Task> tasks = taskRepository.findAllWithDetails();
        log.debug("Loaded {} tasks", tasks.size());
        return tasks;
    }

    @Override
    @Transactional(readOnly = true)
    public List<Task> findTasksByAssignedUser(User user) {
        List<Task> tasks = taskRepository.findByAssignedUserWithDetails(user);
        log.debug("Loaded {} tasks for user: {}", tasks.size(), user.getLoginId());
        return tasks;
    }

    @Override
    @Transactional(readOnly = true)
    public List<Task> findTasksByStatus(TaskStatus status) {
        List<Task> tasks = taskRepository.findByStatusWithDetails(status);
        log.debug("Loaded {} tasks with status: {}", tasks.size(), status);
        return tasks;
    }

    @Override
    @Transactional(readOnly = true)
    public List<Task> findTasksByAssignedUserAndStatus(User user, TaskStatus status) {
        List<Task> tasks = taskRepository.findByAssignedUserAndStatusWithDetails(user, status);
        log.debug("Loaded {} tasks for user: {} with status: {}", tasks.size(), user.getLoginId(), status);
        return tasks;
    }
}
