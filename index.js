const { google } = require("googleapis");
const fs = require("fs");

// Load credentials từ credentials1.json
const auth = new google.auth.GoogleAuth({
  keyFile: "credentials.json",
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const SHEET_ID = "1wDck3Pl8JhuaqQMyJKgVjc2os-DIAAmRM0bbDPyi7Kc";

// Hàm lấy tên sheet theo ngày hiện tại (VD: "28/3")
function getSheetName() {
  let now = new Date();
  return `${now.getDate()}/${now.getMonth() + 1}`;
}
 
async function updateLoginTime() {
  try {
    const client = await auth.getClient();
    const sheets = google.sheets({ version: "v4", auth: client });

    const SHEET_NAME = getSheetName();
    console.log(`📅 Đang cập nhật sheet: ${SHEET_NAME}`);

    // Lấy dữ liệu cột F (trạng thái)
    const rangeF = `${SHEET_NAME}!H2:H`;
    const resF = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: rangeF,
    });

    let valuesF = resF.data.values || [];
    let updates = [];
    let clearUpdates = [];
    let now = new Date();
    let formattedDate = now.toLocaleString("vi-VN", {hour: "2-digit", minute: "2-digit", hour12: false });

    // Lấy dữ liệu cột G
    const rangeG = `${SHEET_NAME}!I2:I`;
    const resG = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: rangeG,
    });

    let valuesG = resG.data.values || [];
    // Kiểm tra trạng thái "OK MÈO"
    valuesF.forEach((row, index) => {
      let fValue = row[0] || "";
      let gValue = valuesG[index] ? valuesG[index][0] : "";

      if ((fValue === "OK MÈO" || fValue === "SK 8K 10K" || fValue === "Đã Nhúng" ) && !gValue) {
        // Nếu cột F có giá trị "OK MÈO" mà cột G chưa có giá trị, thì cập nhật giá trị thời gian
        updates.push({
          range: `${SHEET_NAME}!I${index + 2}`,
          values: [[formattedDate]],
        });
      } else if ((fValue !== "OK MÈO" && fValue !== "SK 8K 10K" && fValue !== "Đã Nhúng" ) && gValue) {
        // Nếu cột F không có giá trị "OK MÈO" mà cột G có giá trị, thì xóa giá trị cột G
        clearUpdates.push({
          range: `${SHEET_NAME}!I${index + 2}`,
          values: [[""]],
        });
      }
    });

    // Thực hiện các cập nhật
    if (updates.length > 0) {
      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId: SHEET_ID,
        requestBody: {
          valueInputOption: "RAW",
          data: updates,
        },
      });
      console.log(`✅ Đã cập nhật ${updates.length} ô thời gian vào cột G.`);
    }

    // Thực hiện các xóa dữ liệu
    if (clearUpdates.length > 0) {
      await sheets.spreadsheets.values.batchUpdate({
        spreadsheetId: SHEET_ID,
        requestBody: {
          valueInputOption: "RAW",
          data: clearUpdates,
        },
      });
      console.log(`✅ Đã xóa ${clearUpdates.length} ô dữ liệu cột G.`);
    }

    if (updates.length === 0 && clearUpdates.length === 0) {
      console.log("⚠️ Không có ô nào cần cập nhật hoặc xóa.");
    }
  } catch (error) {
    console.error("❌ Lỗi:", error);
  }
}

// Chạy script lần đầu tiên ngay lập tức
updateLoginTime();

// Sau đó, chạy script mỗi 5 giây (5000 ms)
setInterval(updateLoginTime, 5000);

console.log('⏳ Đã bắt đầu tự động cập nhật trạng thái đăng nhập.');
