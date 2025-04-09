const { google } = require("googleapis");

const auth = new google.auth.GoogleAuth({
  keyFile: "credentials.json",
  scopes: ["https://www.googleapis.com/auth/spreadsheets"],
});

const SHEET_ID = "1wDck3Pl8JhuaqQMyJKgVjc2os-DIAAmRM0bbDPyi7Kc";

// Danh sách cố định các tên cần kiểm tra (giữ nguyên định dạng)
const fixedNames = [
  "Trưởng", "Hiếu", "Nam", "Điệp", "Long", 
  "Khu", "Vinh", "Huy", "Đại", "Dũng", "Thao"
];

// Hàm loại bỏ dấu và chuyển thành chữ thường để so sánh
const removeDiacritics = (str) => {
  return str
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
};

// Hàm lấy tên sheet theo ngày hiện tại
function getSheetName() {
  let now = new Date();
  return `${now.getDate()}/${now.getMonth() + 1}`;
}

async function countSenders() {
  try {
    const client = await auth.getClient();
    const sheets = google.sheets({ version: "v4", auth: client });
    const SHEET_NAME = getSheetName();
    // const SHEET_NAME = '7/4'
    const range = `${SHEET_NAME}!I2:I`; // Lấy dữ liệu từ cột I

    const res = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: range,
    });

    let values = res.data.values || [];
    let countMap = {};
    let totalCount = 0;

    // Khởi tạo countMap với giá trị mặc định là 0, giữ nguyên format tên
    fixedNames.forEach(name => {
      countMap[name] = 0;
    });

    // Đếm số lần xuất hiện
    values.forEach(row => {
      let sender = row[0];
      if (sender) {
        let normalizedSender = removeDiacritics(sender); // Loại bỏ dấu để so sánh

        // Tìm tên khớp với danh sách cố định
        let originalName = fixedNames.find(name => removeDiacritics(name) === normalizedSender);

        if (originalName) {
          countMap[originalName] += 1;
          totalCount++;
        }
      }
    });

    const jsonString = JSON.stringify(countMap, null, 2);
    console.log(`📊 Số acc gửi ngày ${SHEET_NAME}:`);
    console.log(jsonString);
    console.log("📌 Tổng số lượng tất cả người gửi:", totalCount);
  } catch (error) {
    console.error("❌ Lỗi:", error);
  }
}

countSenders();
