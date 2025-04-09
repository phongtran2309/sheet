const { google } = require("googleapis");
const fs = require("fs");
const path = require("path");

const nameList = [
  "Trưởng", "Hiếu", "Nam", "Điệp", "Long",
  "Khu", "Vinh", "Huy", "Đại", "Dũng", "Thao"
];

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

function getDateSheetNames() {
  const sheetNames = [];
  const startDate = new Date(2025, 2, 28);
  const today = new Date();
  let d = new Date(startDate);
  while (d <= today) {
    sheetNames.push(`${d.getDate()}/${d.getMonth() + 1}`);
    d.setDate(d.getDate() + 1);
  }
  return sheetNames;
}

function getFileNameFromSheet(sheetName) {
  const [day, month] = sheetName.split("/").map(Number);
  const dateObj = new Date(2025, month - 1, day);
  return `${dateObj.getFullYear()}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}.txt`;
}

async function splitAccBySender() {
  try {
    const client = await auth.getClient();
    const sheets = google.sheets({ version: "v4", auth: client });
    const sheetNames = getDateSheetNames();

    const baseFolder = "tong_acc";
    if (!fs.existsSync(baseFolder)) fs.mkdirSync(baseFolder);

    nameList.forEach(name => {
      const dir = path.join(baseFolder, name);
      if (!fs.existsSync(dir)) fs.mkdirSync(dir);
    });

    let grandTotal = 0;
    const thongKe = {};

    for (let sheetName of sheetNames) {
      try {
        const res = await sheets.spreadsheets.values.get({
          spreadsheetId: SHEET_ID,
          range: `${sheetName}!A2:I`,
        });

        const rows = res.data.values || [];
        const dailyMap = {};
        const countMap = {};

        rows.forEach(row => {
          const acc = row[0];       // Cột A
          const senderRaw = row[8]; // Cột I
          if (acc && acc.includes("@") && senderRaw) {
            const normalized = senderRaw.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
            const mappedName = nameMap[normalized];
            if (mappedName) {
              if (!dailyMap[mappedName]) dailyMap[mappedName] = [];
              if (!countMap[mappedName]) countMap[mappedName] = 0;

              dailyMap[mappedName].push(acc);
              countMap[mappedName]++;
              grandTotal++;
            }
          }
        });

        for (let name in dailyMap) {
          const fileName = getFileNameFromSheet(sheetName);
          const filePath = path.join(baseFolder, name, fileName);
          fs.writeFileSync(filePath, dailyMap[name].join("\n"), "utf-8");
        }

        const filteredCounts = {};
        let totalCount = 0;
        for (let name in countMap) {
          const count = countMap[name];
          if (count > 0) {
            filteredCounts[name] = count;
            totalCount += count;
          }
        }

        thongKe[sheetName] = {
          counts: filteredCounts,
          totalCount: totalCount,
        };

        console.log(`✅ Đã xử lý sheet ${sheetName}`);
      } catch (err) {
        console.warn(`⚠️ Sheet "${sheetName}" lỗi hoặc không tồn tại.`);
      }
    }

        // Ghi file thongKe.json
        fs.writeFileSync("thongKe.json", JSON.stringify(thongKe, null, 2), "utf-8");

        // Tính tổng số acc theo từng người
        const totalByPerson = {};
        for (const day in thongKe) {
          const counts = thongKe[day].counts;
          for (const name in counts) {
            if (!totalByPerson[name]) totalByPerson[name] = 0;
            totalByPerson[name] += counts[name];
          }
        }
    
        // Log số acc theo từng người
        console.log("\n📊 Số acc theo từng người:");
        for (const name in totalByPerson) {
          console.log(`- ${name}: ${totalByPerson[name]}`);
        }
    
        // Log tổng acc
        console.log(`\n📦 Tổng số acc đã xử lý: ${grandTotal}`);
        console.log("✅ Đã lưu thống kê vào thongKe.json");
    
  } catch (err) {
    console.error("❌ Lỗi tổng:", err);
  }
}

splitAccBySender();
