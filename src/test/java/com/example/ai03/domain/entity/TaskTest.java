package com.example.ai03.domain.entity;

import com.example.ai03.domain.enums.TaskPriority;
import com.example.ai03.domain.enums.TaskStatus;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

class TaskTest {

    @Test
    void defaultStatusIsTodo() {
        Task task = new Task();
        assertThat(task.getStatus()).isEqualTo(TaskStatus.TODO);
    }

    @Test
    void defaultPriorityIsMedium() {
        Task task = new Task();
        assertThat(task.getPriority()).isEqualTo(TaskPriority.MEDIUM);
    }

    @Test
    void commentsInitializedEmpty() {
        Task task = new Task();
        assertThat(task.getComments()).isNotNull().isEmpty();
    }

    @Test
    void tagsInitializedEmpty() {
        Task task = new Task();
        assertThat(task.getTags()).isNotNull().isEmpty();
    }
}
