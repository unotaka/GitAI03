const fs = require('fs');
const path = require('path');
const { Client } = require("@notionhq/client");

// Notionクライアントの初期化（GitHub Secretsから環境変数として渡されます）
const notion = new Client({ auth: process.env.NOTION_TOKEN });
const DATABASE_ID = process.env.NOTION_DATABASE_ID;

/**
 * 💡 NotionのRichText型プロパティから安全にプレーンテキストを抽出するヘルパー関数
 */
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
    // 1. 「ステータス」が「Claude生成待ち」になっているタスクを1件検索
    const response = await notion.databases.query({
      database_id: DATABASE_ID,
      filter: {
        property: "ステータス",
        status: {
          equals: "Claude生成待ち"
        }
      },
      page_size: 1 // 1回につき1タスクずつ確実に処理する
    });

    // 該当するタスクがない場合は終了
    if (response.results.length === 0) {
      console.log("🎵 『Claude生成待ち』のタスクはありません。処理を終了します。");
      // GitHub Actions側にタスクがないことを伝えるため、TASK_IDを空にする
      if (process.env.GITHUB_ENV) {
        fs.appendFileSync(process.env.GITHUB_ENV, `TASK_ID=\n`);
      }
      process.exit(0);
    }

    // 2. ターゲットとなるタスクページを取得
    const page = response.results[0];
    const props = page.properties;

    // 💡 各かんばんプロパティをNotionのデータ構造から抽出
    const pageId = page.id;
    // 「名前」プロパティはtitle型
    const title = props["名前"] && props["名前"].title && props["名前"].title.length > 0
      ? props["名前"].title.map(t => t.plain_text).join("")
      : "無題のタスク";

    const taskId = getRichTextValue(props["タスクID"]);
    const className = getRichTextValue(props["クラス名"]);
    const packageName = getRichTextValue(props["パッケージ名"]);
    const featureSummary = getRichTextValue(props["機能概要"]);
    const screenItems = getRichTextValue(props["画面項目"]);
    const detailedSpecs = getRichTextValue(props["仕様"]);

    // 担当者名の取得（People型の場合を想定。テキスト型ならgetRichTextValueに変えてください）
    let assigneeName = "Claude Bot";
    if (props["担当者"] && props["担当者"].people && props["担当者"].people.length > 0) {
      assigneeName = props["担当者"].people[0].name;
    }

    // クロードに渡すメインの説明文（機能概要、仕様、入力チェック状況などを統合）
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

    // 3. 次のステップ（claude-coder.js）へ引き渡すためのJSONオブジェクトを作成
    const taskInfo = {
      TASK_ID: taskId || `NOTION-${pageId.substring(0, 8)}`,
      PAGE_ID: pageId, // Notionのページを直接更新・追記するために必要
      TITLE: title,
      CLASS_NAME: className,
      PACKAGE_NAME: packageName,
      SCREEN_ITEMS: screenItems,
      DESCRIPTION: fullDescription,
      ASSIGNEE: assigneeName // Gitのコミットログ用ユーザー名
    };

    // jsonファイルをルート直下に書き出し
    const outputPath = path.join(__dirname, '../task_info.json');
    fs.writeFileSync(outputPath, JSON.stringify(taskInfo, null, 2), 'utf8');
    console.log(`✅ task_info.json の作成に成功しました。`);

    // 4. GitHub Actions の環境変数（$GITHUB_ENV）に TASK_ID を書き出し、後続ステップを起動可能にする
    if (process.env.GITHUB_ENV) {
      fs.appendFileSync(process.env.GITHUB_ENV, `TASK_ID=${taskInfo.TASK_ID}\n`);
      console.log(`🚀 GitHub Actionsの環境変数に TASK_ID=${taskInfo.TASK_ID} を設定しました。`);
    }

  } catch (error) {
    console.error("❌ Notionデータベースのポーリング中に例外エラーが発生しました:");
    console.error(error);
    process.exit(1);
  }
}

main();
