const fs = require('fs');
const path = require('path');
const { Client } = require("@notionhq/client");

const notion = new Client({ auth: process.env.NOTION_TOKEN });
const DATABASE_ID = process.env.NOTION_DATABASE_ID;

function getRichTextValue(property) {
  if (property && property.rich_text && property.rich_text.length > 0) {
    return property.rich_text.map(t => t.plain_text).join("").trim();
  }
  return "";
}

async function main() {
  console.log("🔍 Notionデータベースのタスク状況をチェック中...");

  if (!process.env.NOTION_TOKEN || !DATABASE_ID) {
    console.error("❌ エラー: NOTION_TOKEN または NOTION_DATABASE_ID が設定されていません。");
    process.exit(1);
  }

  try {
    const response = await notion.databases.query({
      database_id: DATABASE_ID,
      filter: {
        property: "ステータス",
        status: { equals: "Claude生成待ち" }
      },
      page_size: 1
    });

    if (response.results.length === 0) {
      console.log("🎵 『Claude生成待ち』のタスクはありません。終了します。");
      if (process.env.GITHUB_ENV) {
        fs.appendFileSync(process.env.GITHUB_ENV, `TASK_ID=\n`);
      }
      process.exit(0);
    }

    const page = response.results[0];
    const props = page.properties;

    const pageId = page.id;
    const title = props["名前"] && props["名前"].title && props["名前"].title.length > 0
      ? props["名前"].title.map(t => t.plain_text).join("")
      : "無題のタスク";

    const taskId = getRichTextValue(props["タスクID"]);
    const className = getRichTextValue(props["クラス名"]);
    const packageName = getRichTextValue(props["パッケージ名"]);
    const featureSummary = getRichTextValue(props["機能概要"]);
    const screenItems = getRichTextValue(props["画面項目"]);
    const detailedSpecs = getRichTextValue(props["仕様"]);

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

    const taskInfo = {
      TASK_ID: taskId || `NOTION-${pageId.substring(0, 8)}`,
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
    console.log(`✅ task_info.json の作成に成功しました。`);

    if (process.env.GITHUB_ENV) {
      fs.appendFileSync(process.env.GITHUB_ENV, `TASK_ID=${taskInfo.TASK_ID}\n`);
      console.log(`🚀 GitHub Actions環境変数に TASK_ID=${taskInfo.TASK_ID} を設定。`);
    }

  } catch (error) {
    console.error("❌ Notionデータベースのポーリング中に例外エラーが発生しました:");
    console.error(error);
    process.exit(1);
  }
}

main();
