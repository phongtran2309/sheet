const { google } = require("googleapis");
const fs = require("fs");

// Cấu hình xác thực Google Sheets API
const auth = new google.auth.GoogleAuth({
  keyFile: "credentials.json", // File JSON chứa thông tin API key
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

// Nhận tham số từ dòng lệnh
const SHEET_ID = "1WK9uIbSJCNBdTc9zldaWX_i6yHr8tkqrbs0-NTV6CBs"; // Thay bằng ID Google Sheet của bạn
const SHEET_NAME = "Trang tính1"; // Đổi thành tên sheet bạn muốn dùng
const OUTPUT_FILE = "result.txt";
const MAX_ROWS = parseInt(process.argv[2]) 
const FIXED_VALUE = process.argv[3]

async function exportDataToTxt() {
  const client = await auth.getClient();
  const sheets = google.sheets({ version: "v4", auth: client });

  try {
    // Đọc dữ liệu cột A
    const resA = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `${SHEET_NAME}!A:A`,
    });

    // Đọc dữ liệu cột D
    const resD = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: `${SHEET_NAME}!D:D`,
    });

    const dataA = resA.data.values || [];
    const dataD = resD.data.values || [];
    const totalAvailable = dataA.length; // Số dòng có dữ liệu thực tế trong cột A

    // Kiểm tra nếu không có dữ liệu
    if (totalAvailable === 0) {
      console.log("⚠ Không có dữ liệu trong cột A.");
      return;
    }

    // Kiểm tra nếu số dòng yêu cầu lớn hơn số dòng thực tế
    const rowsToFetch = Math.min(MAX_ROWS, totalAvailable);
    if (MAX_ROWS > totalAvailable) {
      console.log(`⚠ Chỉ có ${totalAvailable} dòng có dữ liệu, không thể lấy ${MAX_ROWS} dòng.`);
    }

    const result = [];
    const updatedRows = [];

    let count = 0;

    for (let i = 0; i < dataA.length; i++) {
      if (dataA[i][0] && (!dataD[i] || !dataD[i][0])) {
        result.push(dataA[i][0]);
        updatedRows.push([FIXED_VALUE]); // Điền giá trị từ arg3 vào cột D
        count++;
      } else {
        updatedRows.push([dataD[i] ? dataD[i][0] : ""]); // Giữ nguyên giá trị cũ
      }

      if (count >= rowsToFetch) break;
    }

    if (result.length === 0) {
      console.log("⚠ Không có dữ liệu hợp lệ để ghi vào file.");
      return;
    }

    // Lưu vào file result.txt
    fs.writeFileSync(OUTPUT_FILE, result.join("\n"), "utf8");
    console.log(`✅ File ${OUTPUT_FILE} đã được lưu với ${result.length} dòng.`);

    // Cập nhật lại cột D trên Google Sheets
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `${SHEET_NAME}!D1:D${updatedRows.length}`,
      valueInputOption: "RAW",
      requestBody: { values: updatedRows },
    });

    console.log(`✅ Cột D đã được cập nhật với giá trị "${FIXED_VALUE}".`);
  } catch (err) {
    console.error("❌ Lỗi:", err);
  }
}

// Chạy script
exportDataToTxt();
