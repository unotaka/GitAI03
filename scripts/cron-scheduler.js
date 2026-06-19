const fs = require('fs');
const path = require('path');

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const DATABASE_ID = process.env.NOTION_DATABASE_ID;

/**
 * Notionの各種プロパティから安全に文字列を抽出するヘルパー関数
 */
function getNotionValue(property) {
  if (!property) return "";
  
  // 1. テキスト型 (rich_text) の場合
  if (property.rich_text && property.rich_text.length > 0) {
    return property.rich_text.map(t => t.plain_text).join("").trim();
  }
  
  // 2. 公式の自動採番 ID型 (unique_id) の場合
  if (property.unique_id) {
    const prefix = property.unique_id.prefix ? `${property.unique_id.prefix}-` : "";
    return `${prefix}${property.unique_id.number}`.trim();
  }
  
  // 3. タイトル型 (title) の場合
  if (property.title && property.title.length > 0) {
    return property.title.map(t => t.plain_text).join("").trim();
  }
  
  return "";
}

async function main() {
  console.log("🔍 Notionデータベースのタスク状況をチェック中...");

  if (!NOTION_TOKEN || !DATABASE_ID) {
    console.error("❌ エラー: NOTION_TOKEN または NOTION_DATABASE_ID が設定されていません。");
    process.exit(1);
  }

  try {
    const url = `https://api.notion.com/v1/databases/${DATABASE_ID}/query`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NOTION_TOKEN}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        filter: {
          property: "ステータス",
          status: { equals: "Claude生成待ち" }
        },
        page_size: 1
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`❌ Notion APIリクエストエラー (Status: ${response.status}):`);
      console.error(errorText);
      process.exit(1);
    }

    const data = await response.json();

    if (!data.results || data.results.length === 0) {
      console.log("🎵 『Claude生成待ち』のタスクはありません。終了します。");
      if (process.env.GITHUB_ENV) {
        fs.appendFileSync(process.env.GITHUB_ENV, `TASK_ID=\n`);
      }
      process.exit(0);
    }

    const page = data.results[0];
    const props = page.properties;
    const pageId = page.id;

    // 各種プロパティの取得
    const title = getNotionValue(props["名称"]) || "無題のタスク";
    const taskId = getNotionValue(props["タスクID"]);
    const className = getNotionValue(props["クラス名"]);
    const packageName = getNotionValue(props["パッケージ名"]);
    const featureSummary = getNotionValue(props["機能概要"]);
    const screenItems = getNotionValue(props["画面項目"]);
    const detailedSpecs = getNotionValue(props["仕様"]);

    let assigneeName = "Claude Bot";
    if (props["担当者"] && props["担当者"].people && props["担当者"].people.length > 0) {
      assigneeName = props["担当者"].people[0].name;
    }

    const inputCheckStatus = props["入力チェック"] && props["入力チェック"].checkbox
      ? (props["入力チェック"].checkbox ? "✅ OK" : "❌ 未着手")
      : "未定義";

    const fullDescription = `
【機能概要】
${featureSummary || "特になし"}

【仕様詳細】
${detailedSpecs || "特になし"}

【事前入力チェック状況】
${inputCheckStatus}
`.trim();

    // taskId が取得できている場合はそれを最優先で使用
    const finalTaskId = taskId || `NOTION-${pageId.substring(0, 8)}`;

    const taskInfo = {
      TASK_ID: finalTaskId,
      PAGE_ID: pageId,
      TITLE: title,
      CLASS_NAME: className,
      PACKAGE_NAME: packageName,
      SCREEN_ITEMS: screenItems,
      DESCRIPTION: fullDescription,
      ASSIGNEE: assigneeName
    };

    const outputPath = path.join(__dirname, '../task_info.json');
    fs.writeFileSync(outputPath, JSON.stringify(taskInfo, null, 2), 'utf8');
    console.log(`✅ task_info.json の作成に成功しました。確定した TASK_ID: ${finalTaskId}`);

    if (process.env.GITHUB_ENV) {
      fs.appendFileSync(process.env.GITHUB_ENV, `TASK_ID=${finalTaskId}\n`);
      console.log(`🚀 GitHub Actions環境変数に TASK_ID=${finalTaskId} を設定。`);
    }

  } catch (error) {
    console.error("❌ Notionデータベースのポーリング中に例外エラーが発生しました:");
    console.error(error);
    process.exit(1);
  }
}

main();
