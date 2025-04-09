const { google } = require("googleapis");
const fs = require("fs");

// Danh sách tên cần thống kê
const nameList = [
  "Trưởng", "Hiếu", "Nam", "Điệp", "Long",
  "Khu", "Vinh", "Huy", "Đại", "Dũng", "Thao"
];

// Map chuẩn hoá: không dấu → có dấu
const nameMap = {};
nameList.forEach(name => {
  const normalized = name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  nameMap[normalized] = name;
});

const auth = new google.auth.GoogleAuth({
  keyFile: "credentials.json",
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const SHEET_ID = "1wDck3Pl8JhuaqQMyJKgVjc2os-DIAAmRM0bbDPyi7Kc";

// Tạo danh sách ngày từ 28/3 đến hôm nay
function getDateSheetNames() {
  const sheetNames = [];
  const startDate = new Date(2025, 2, 28); // 28/3/2025
  const today = new Date();
  let d = new Date(startDate);

  while (d <= today) {
    sheetNames.push(`${d.getDate()}/${d.getMonth() + 1}`);
    d.setDate(d.getDate() + 1);
  }

  return sheetNames;
}

async function countAllSenders() {
  try {
    const client = await auth.getClient();
    const sheets = google.sheets({ version: "v4", auth: client });

    const sheetNames = getDateSheetNames();
    const finalTotalCountMap = {};
    nameList.forEach(name => finalTotalCountMap[name] = 0);
    let totalCount = 0;

    const dailyStats = {};

    for (let sheetName of sheetNames) {
      try {
        const res = await sheets.spreadsheets.values.get({
          spreadsheetId: SHEET_ID,
          range: `${sheetName}!I2:I`,
        });

        const values = res.data.values || [];
        const countMapPerDay = {};
        nameList.forEach(name => countMapPerDay[name] = 0);

        let dailyTotal = 0;

        values.forEach(row => {
          let rawName = row[0];
          if (rawName) {
            const normalized = rawName.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
            const mappedName = nameMap[normalized];
            if (mappedName) {
              countMapPerDay[mappedName]++;
              finalTotalCountMap[mappedName]++;
              totalCount++;
              dailyTotal++;
            }
          }
        });

        // Chỉ giữ lại key có value > 0
        const filteredMap = {};
        for (let name in countMapPerDay) {
          if (countMapPerDay[name] > 0) {
            filteredMap[name] = countMapPerDay[name];
          }
        }

        filteredMap.totalCount = dailyTotal;
        dailyStats[sheetName] = filteredMap;

        console.log(`✅ Đã thống kê sheet: ${sheetName}`);
      } catch (e) {
        console.warn(`⚠️ Không thể đọc sheet "${sheetName}": ${e.message}`);
      }
    }

    // Ghi file JSON
    fs.writeFileSync("thongKe.json", JSON.stringify(dailyStats, null, 2), "utf-8");
    console.log("💾 Đã lưu thống kê theo từng ngày vào thongKe.json");

    // In tổng tất cả ngày
    const filteredFinalMap = {};
    for (let name in finalTotalCountMap) {
      if (finalTotalCountMap[name] > 0) {
        filteredFinalMap[name] = finalTotalCountMap[name];
      }
    }

    console.log("\n📊 Tổng thống kê tất cả ngày:");
    console.log(JSON.stringify({
      counts: filteredFinalMap,
      totalCount
    }, null, 2));

  } catch (error) {
    console.error("❌ Lỗi:", error);
  }
}

countAllSenders();
