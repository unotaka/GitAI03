const fs = require('fs');
const path = require('path');

// 💡 エラーの原因となるNotion SDKのインポートを完全に廃止します。
// 代わりにNode.js標準の fetch API を使用してNotion APIを直接叩きます。

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const DATABASE_ID = process.env.NOTION_DATABASE_ID;

/**
 * NotionのRichText型プロパティから安全にプレーンテキストを抽出するヘルパー関数
 */
function getRichTextValue(property) {
  if (property && property.rich_text && property.rich_text.length > 0) {
    return property.rich_text.map(t => t.plain_text).join("").trim();
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
    // 💡 Notion API のデータベースクエリ用エンドポイントURL
    const url = `https://api.notion.com/v1/databases/${DATABASE_ID}/query`;
    
    // 💡 SDKを経由せず、直接HTTP POSTリクエストを送信
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${NOTION_TOKEN}`,
        'Notion-Version': '2022-06-28', // ワークフローのPATCHステップと統一
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

    // レスポンスをJSONとしてパース
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
