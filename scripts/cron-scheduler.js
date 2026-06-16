// プロパティから担当者名（1人目）を取得する例
const assigneeProperty = page.properties['担当者']?.people;
const assigneeName = assigneeProperty && assigneeProperty.length > 0 
  ? assigneeProperty[0].name 
  : 'Claude Bot'; // 空だった場合のデフォルト名

// task_info.json に追加して保存
const taskInfo = {
  TASK_ID: taskId,
  TITLE: title,
  DESCRIPTION: description,
  PAGE_ID: page.id,
  ASSIGNEE: assigneeName // ★これを追加
};
fs.writeFileSync('./task_info.json', JSON.stringify(taskInfo, null, 2));
