package com.example.ai03.service;

import com.example.ai03.domain.entity.Task;
import com.example.ai03.domain.entity.User;
import com.example.ai03.domain.enums.TaskPriority;
import com.example.ai03.domain.enums.TaskStatus;
import com.example.ai03.domain.enums.UserRole;
import com.example.ai03.repository.TaskRepository;
import com.example.ai03.service.impl.TaskServiceImpl;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class TaskServiceTest {

    @Mock
    private TaskRepository taskRepository;

    @InjectMocks
    private TaskServiceImpl taskService;

    @Test
    void findAllTasksReturnsAllTasksFromRepository() {
        List<Task> expected = List.of(buildTask("タスクA", TaskStatus.TODO), buildTask("タスクB", TaskStatus.DONE));
        when(taskRepository.findAllWithDetails()).thenReturn(expected);

        List<Task> result = taskService.findAllTasks();

        assertThat(result).hasSize(2);
        verify(taskRepository).findAllWithDetails();
    }

    @Test
    void findAllTasksReturnsEmptyListWhenNoTasks() {
        when(taskRepository.findAllWithDetails()).thenReturn(List.of());

        List<Task> result = taskService.findAllTasks();

        assertThat(result).isEmpty();
    }

    @Test
    void findTasksByAssignedUserReturnsTasksForGivenUser() {
        User user = buildUser("user01");
        List<Task> expected = List.of(buildTask("担当タスク", TaskStatus.IN_PROGRESS));
        when(taskRepository.findByAssignedUserWithDetails(user)).thenReturn(expected);

        List<Task> result = taskService.findTasksByAssignedUser(user);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getTitle()).isEqualTo("担当タスク");
        verify(taskRepository).findByAssignedUserWithDetails(user);
    }

    @Test
    void findTasksByStatusReturnsTasksMatchingStatus() {
        List<Task> expected = List.of(buildTask("レビュータスク", TaskStatus.REVIEW));
        when(taskRepository.findByStatusWithDetails(TaskStatus.REVIEW)).thenReturn(expected);

        List<Task> result = taskService.findTasksByStatus(TaskStatus.REVIEW);

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getStatus()).isEqualTo(TaskStatus.REVIEW);
        verify(taskRepository).findByStatusWithDetails(TaskStatus.REVIEW);
    }

    @Test
    void findTasksByAssignedUserAndStatusReturnsFilteredTasks() {
        User user = buildUser("user01");
        List<Task> expected = List.of(buildTask("進行中の担当タスク", TaskStatus.IN_PROGRESS));
        when(taskRepository.findByAssignedUserAndStatusWithDetails(user, TaskStatus.IN_PROGRESS)).thenReturn(expected);

        List<Task> result = taskService.findTasksByAssignedUserAndStatus(user, TaskStatus.IN_PROGRESS);

        assertThat(result).hasSize(1);
        verify(taskRepository).findByAssignedUserAndStatusWithDetails(user, TaskStatus.IN_PROGRESS);
    }

    @Test
    void findTasksByAssignedUserAndStatusReturnsEmptyListWhenNoMatch() {
        User user = buildUser("user01");
        when(taskRepository.findByAssignedUserAndStatusWithDetails(user, TaskStatus.DONE)).thenReturn(List.of());

        List<Task> result = taskService.findTasksByAssignedUserAndStatus(user, TaskStatus.DONE);

        assertThat(result).isEmpty();
    }

    private Task buildTask(String title, TaskStatus status) {
        Task task = new Task();
        task.setTitle(title);
        task.setStatus(status);
        task.setPriority(TaskPriority.MEDIUM);
        return task;
    }

    private User buildUser(String loginId) {
        User user = new User();
        user.setLoginId(loginId);
        user.setDisplayName("テストユーザ");
        user.setEmail(loginId + "@example.com");
        user.setRole(UserRole.MEMBER);
        user.setActive(true);
        return user;
    }
}
