package com.example.ai03.ui;

import com.example.ai03.domain.entity.Task;
import com.example.ai03.domain.entity.User;
import com.example.ai03.domain.enums.TaskPriority;
import com.example.ai03.domain.enums.TaskStatus;
import com.example.ai03.service.AuthService;
import com.example.ai03.service.TaskService;
import com.example.ai03.service.UserService;
import lombok.extern.slf4j.Slf4j;

import javax.swing.BorderFactory;
import javax.swing.table.AbstractTableModel;
import javax.swing.JButton;
import javax.swing.JCheckBox;
import javax.swing.JComboBox;
import javax.swing.JFrame;
import javax.swing.JLabel;
import javax.swing.JOptionPane;
import javax.swing.JPanel;
import javax.swing.JScrollPane;
import javax.swing.JTable;
import javax.swing.ListSelectionModel;
import javax.swing.SwingWorker;
import java.awt.BorderLayout;
import java.awt.Dimension;
import java.awt.FlowLayout;
import java.awt.Font;
import java.awt.event.ActionEvent;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.ExecutionException;

@Slf4j
public class MainFrame extends JFrame {

    private static final int MIN_WIDTH = 1000;
    private static final int MIN_HEIGHT = 700;
    private static final int INSETS_SIZE = 8;
    private static final int HEADER_FONT_SIZE = 14;
    private static final int COL_WIDTH_ID = 60;
    private static final int COL_WIDTH_TITLE = 300;
    private static final int COL_WIDTH_STATUS = 100;
    private static final int COL_WIDTH_PRIORITY = 80;
    private static final int COL_WIDTH_ASSIGNED = 120;
    private static final int COL_WIDTH_DUE_DATE = 100;
    private static final int COL_WIDTH_CREATED_AT = 140;

    private static final String FILTER_ALL = "すべて";

    private final User loginUser;
    private final AuthService authService;
    private final UserService userService;
    private final TaskService taskService;

    private JComboBox<StatusFilterItem> statusFilterCombo;
    private JCheckBox myTasksCheckBox;
    private JButton refreshButton;
    private TaskTableModel taskTableModel;

    public MainFrame(User loginUser, AuthService authService, UserService userService, TaskService taskService) {
        this.loginUser = loginUser;
        this.authService = authService;
        this.userService = userService;
        this.taskService = taskService;
        initComponents();
        loadTasks();
    }

    private void initComponents() {
        setTitle("タスク管理 - " + loginUser.getDisplayName());
        setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE);
        setMinimumSize(new Dimension(MIN_WIDTH, MIN_HEIGHT));
        setLayout(new BorderLayout());

        add(buildHeaderPanel(), BorderLayout.NORTH);
        add(buildCenterPanel(), BorderLayout.CENTER);

        pack();
        setLocationRelativeTo(null);
    }

    private JPanel buildHeaderPanel() {
        JPanel panel = new JPanel(new BorderLayout());
        panel.setBorder(BorderFactory.createEmptyBorder(INSETS_SIZE, INSETS_SIZE + 4, INSETS_SIZE, INSETS_SIZE + 4));

        JLabel userInfoLabel = new JLabel(
            loginUser.getDisplayName() + "　（" + loginUser.getRole().name() + "）"
        );
        userInfoLabel.setFont(userInfoLabel.getFont().deriveFont(Font.BOLD, HEADER_FONT_SIZE));
        panel.add(userInfoLabel, BorderLayout.WEST);

        JButton logoutButton = new JButton("ログアウト");
        logoutButton.addActionListener(this::onLogoutButtonClicked);
        JPanel rightPanel = new JPanel(new FlowLayout(FlowLayout.RIGHT, 0, 0));
        rightPanel.add(logoutButton);
        panel.add(rightPanel, BorderLayout.EAST);

        return panel;
    }

    private JPanel buildCenterPanel() {
        JPanel panel = new JPanel(new BorderLayout());
        panel.add(buildFilterPanel(), BorderLayout.NORTH);
        panel.add(buildTableScrollPane(), BorderLayout.CENTER);
        return panel;
    }

    private JPanel buildFilterPanel() {
        JPanel panel = new JPanel(new FlowLayout(FlowLayout.LEFT, INSETS_SIZE, INSETS_SIZE));
        panel.setBorder(BorderFactory.createTitledBorder("フィルター"));

        panel.add(new JLabel("ステータス:"));
        statusFilterCombo = new JComboBox<>(buildStatusFilterItems());
        statusFilterCombo.addActionListener(e -> loadTasks());
        panel.add(statusFilterCombo);

        myTasksCheckBox = new JCheckBox("自分のタスクのみ");
        myTasksCheckBox.addActionListener(e -> loadTasks());
        panel.add(myTasksCheckBox);

        refreshButton = new JButton("更新");
        refreshButton.addActionListener(e -> loadTasks());
        panel.add(refreshButton);

        return panel;
    }

    private StatusFilterItem[] buildStatusFilterItems() {
        StatusFilterItem[] items = new StatusFilterItem[TaskStatus.values().length + 1];
        items[0] = new StatusFilterItem(FILTER_ALL, null);
        TaskStatus[] statuses = TaskStatus.values();
        for (int i = 0; i < statuses.length; i++) {
            items[i + 1] = new StatusFilterItem(toStatusLabel(statuses[i]), statuses[i]);
        }
        return items;
    }

    private JScrollPane buildTableScrollPane() {
        taskTableModel = new TaskTableModel();
        JTable taskTable = new JTable(taskTableModel);
        taskTable.setSelectionMode(ListSelectionModel.SINGLE_SELECTION);
        taskTable.setAutoResizeMode(JTable.AUTO_RESIZE_SUBSEQUENT_COLUMNS);
        taskTable.getTableHeader().setReorderingAllowed(false);

        taskTable.getColumnModel().getColumn(0).setPreferredWidth(COL_WIDTH_ID);
        taskTable.getColumnModel().getColumn(1).setPreferredWidth(COL_WIDTH_TITLE);
        taskTable.getColumnModel().getColumn(2).setPreferredWidth(COL_WIDTH_STATUS);
        taskTable.getColumnModel().getColumn(3).setPreferredWidth(COL_WIDTH_PRIORITY);
        taskTable.getColumnModel().getColumn(4).setPreferredWidth(COL_WIDTH_ASSIGNED);
        taskTable.getColumnModel().getColumn(5).setPreferredWidth(COL_WIDTH_DUE_DATE);
        taskTable.getColumnModel().getColumn(6).setPreferredWidth(COL_WIDTH_CREATED_AT);

        return new JScrollPane(taskTable);
    }

    private void loadTasks() {
        StatusFilterItem selectedItem = (StatusFilterItem) statusFilterCombo.getSelectedItem();
        TaskStatus filterStatus = selectedItem != null ? selectedItem.status() : null;
        boolean myTasksOnly = myTasksCheckBox.isSelected();

        refreshButton.setEnabled(false);
        new SwingWorker<List<Task>, Void>() {
            @Override
            protected List<Task> doInBackground() {
                if (myTasksOnly && filterStatus != null) {
                    return taskService.findTasksByAssignedUserAndStatus(loginUser, filterStatus);
                }
                if (myTasksOnly) {
                    return taskService.findTasksByAssignedUser(loginUser);
                }
                if (filterStatus != null) {
                    return taskService.findTasksByStatus(filterStatus);
                }
                return taskService.findAllTasks();
            }

            @Override
            protected void done() {
                try {
                    taskTableModel.setTasks(get());
                } catch (InterruptedException e) {
                    Thread.currentThread().interrupt();
                    log.error("Task loading interrupted", e);
                } catch (ExecutionException e) {
                    log.error("Failed to load tasks", e.getCause());
                    JOptionPane.showMessageDialog(
                        MainFrame.this,
                        "タスクの読み込みに失敗しました",
                        "エラー",
                        JOptionPane.ERROR_MESSAGE
                    );
                } finally {
                    refreshButton.setEnabled(true);
                }
            }
        }.execute();
    }

    private void onLogoutButtonClicked(ActionEvent event) {
        int result = JOptionPane.showConfirmDialog(
            this,
            "ログアウトしますか？",
            "確認",
            JOptionPane.YES_NO_OPTION
        );
        if (result == JOptionPane.YES_OPTION) {
            log.info("User logged out: loginId={}", loginUser.getLoginId());
            dispose();
            LoginFrame loginFrame = new LoginFrame(authService, userService, taskService);
            loginFrame.setVisible(true);
        }
    }

    private static String toStatusLabel(TaskStatus status) {
        return switch (status) {
            case TODO -> "未着手";
            case IN_PROGRESS -> "進行中";
            case REVIEW -> "レビュー中";
            case DONE -> "完了";
            case CANCELLED -> "キャンセル";
        };
    }

    private static String toPriorityLabel(TaskPriority priority) {
        return switch (priority) {
            case LOW -> "低";
            case MEDIUM -> "中";
            case HIGH -> "高";
            case CRITICAL -> "緊急";
        };
    }

    private record StatusFilterItem(String label, TaskStatus status) {
        @Override
        public String toString() {
            return label;
        }
    }

    private static final class TaskTableModel extends AbstractTableModel {

        private static final String[] COLUMN_NAMES = {
            "ID", "タイトル", "ステータス", "優先度", "担当者", "期限", "作成日時"
        };
        private static final DateTimeFormatter DATE_FORMATTER = DateTimeFormatter.ofPattern("yyyy/MM/dd");
        private static final DateTimeFormatter DATETIME_FORMATTER = DateTimeFormatter.ofPattern("yyyy/MM/dd HH:mm");

        private List<Task> tasks = new ArrayList<>();

        void setTasks(List<Task> tasks) {
            this.tasks = new ArrayList<>(tasks);
            fireTableDataChanged();
        }

        @Override
        public int getRowCount() {
            return tasks.size();
        }

        @Override
        public int getColumnCount() {
            return COLUMN_NAMES.length;
        }

        @Override
        public String getColumnName(int column) {
            return COLUMN_NAMES[column];
        }

        @Override
        public Object getValueAt(int rowIndex, int columnIndex) {
            Task task = tasks.get(rowIndex);
            return switch (columnIndex) {
                case 0 -> task.getId();
                case 1 -> task.getTitle();
                case 2 -> toStatusLabel(task.getStatus());
                case 3 -> toPriorityLabel(task.getPriority());
                case 4 -> task.getAssignedUser() != null ? task.getAssignedUser().getDisplayName() : "未割当";
                case 5 -> task.getDueDate() != null ? task.getDueDate().format(DATE_FORMATTER) : "-";
                case 6 -> task.getCreatedAt() != null ? task.getCreatedAt().format(DATETIME_FORMATTER) : "-";
                default -> "";
            };
        }
    }
}
