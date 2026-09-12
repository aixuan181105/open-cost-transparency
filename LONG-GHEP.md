# Lồng phần nước vào trang tính tiền điện — v0.3.0

## Cách làm này khác gì bản patch trước

Bản trước để phần nước thành một thẻ riêng và yêu cầu bạn sửa `app.js`.
Bản này **lồng thẳng vào trang điện, và không sửa một dòng nào** trong
`app.js`, `pricing-engine.js`, `explain.js`, `test-cases.js`.

Cơ chế: mọi `id` mà `app.js` đang đọc đều **còn nguyên** trong DOM. Những ô
nào đã có ô nhập mới thân thiện hơn thay thế thì bị đẩy vào khối
`.o-cu-giu-lai` (ẩn hoàn toàn), và `src/hop-nhat.js` tự điền giá trị vào đó
rồi phát sự kiện `input` — `app.js` chạy y như trước, không biết gì về sự thay đổi.

```
Người dùng nhập "4.000 đ/kWh"
        │
        ▼
  hop-nhat.js  ──►  #tien-chu-tro-thu-dien (ẩn)  ──►  app.js (không đổi)
                                                           │
                                                           ▼
                                              #so-thuc-thu = tiền ĐIỆN
        ┌──────────────────────────────────────────────────┘
        ▼
  hop-nhat.js đọc lại, cộng thêm tiền NƯỚC, ghi lại vào Tổng quan
```

Điểm chốt làm cho cách này an toàn: checkbox `#bat-tinh-nuoc` cũ được đặt
`checked = false` vĩnh viễn, nên nhánh tính nước cũ trong `app.js` **không bao
giờ chạy**. Con số `app.js` ghi vào Tổng quan luôn là của riêng phần điện, nên
cộng thêm phần nước không bao giờ bị tính hai lần. Checkbox mà người dùng thấy
là `#nuoc-bat`.

---

## Cần copy 6 tệp

| Tệp | Việc |
| --- | --- |
| `index.html` | **Ghi đè** bản cũ |
| `style.css` | **Ghi đè** bản cũ (đã gồm toàn bộ CSS cũ + phần bổ sung ở cuối) |
| `package.json` | **Ghi đè** (để `npm test` chạy cả hai bộ) |
| `src/water-engine.js` | Thêm mới |
| `src/hop-nhat.js` | Thêm mới |
| `config/water-rates.json` | **Ghi đè** bản cũ |
| `tests/water-engine.test.js` | Thêm mới |

**Tuyệt đối không chạm vào:** `src/app.js`, `src/pricing-engine.js`,
`src/explain.js`, `tests/test-cases.js`, `tests/pricing-engine.test.js`.

```bash
git checkout -b feat/long-ghep-tien-nuoc
# copy 7 tệp vào đúng vị trí
npm test          # cả hai bộ phải xanh
npm start         # mở http://localhost:3000
```

---

## Nghiệm thu — làm đúng thứ tự này, cũng là kịch bản demo

Mở Console (F12) trước khi bắt đầu. Console phải trắng suốt buổi.

| # | Thao tác | Phải thấy |
| --- | --- | --- |
| 1 | Mở trang, bấm **Tính toán** | Tổng quan có nhãn “Điện”, kết quả điện y như bản cũ |
| 2 | Chọn “Tôi đọc chỉ số đồng hồ” ở phần điện, nhập `4820` → `5005` | Ghi chú “Đã dùng 185 kWh”, kết quả không đổi so với bước 1 |
| 3 | Đổi cách thu điện sang “Khoán theo đầu người”, `150000` | Chủ trọ thu 450.000đ (3 người), Tổng quan cập nhật |
| 4 | Tích **Tính thêm** ở phân khu Tiền nước | Nhãn Tổng quan đổi thành “Điện + nước”, xuất hiện dòng “Trong đó tiền nước…” |
| 5 | Mặc định 3 người / 12 m³ / 20.000đ/m³ | Thẻ Tiền nước: quy định **110.470đ**, chủ trọ **240.000đ**, chênh **+129.530đ**, hộp đỏ |
| 6 | Phần nước, chọn “Tôi đọc chỉ số đồng hồ”, nhập `1234` → `1246` | “Đã dùng 12 m³”, kết quả không đổi |
| 7 | Nhập ngược `1246` → `1234` | Hộp đỏ “Chỉ số đồng hồ chưa hợp lệ”, không ra số âm, Tổng quan không cộng nước |
| 8 | Đổi cách thu nước sang “Chia lại đúng theo hóa đơn nước” | Ô nhập số tiền biến mất, chênh lệch về 0, hộp xanh |
| 9 | Bỏ tích “Đã được cấp định mức nước” | Quy định nhảy 110.470đ → **237.427đ**, nhãn đổi “Chưa có định mức” |
| 10 | Đổi **Số người ở thực tế** 3 → 5 | Cả điện và nước tính lại, vì hai phần dùng chung một ô |
| 11 | Bỏ tích “Tính thêm” | Tổng quan trở về đúng số của bước 3, nhãn về “Điện” |
| 12 | Bấm **Đặt lại** rồi **Tính toán** | Không còn số cũ sót lại |

Bước 10 là điểm đáng nhấn khi thuyết trình: một ô nhập phục vụ hai biểu giá
khác nhau (4 người = 1 định mức điện, 4 m³/người = định mức nước).

Bước 11 chứng minh việc gộp Tổng quan không tính trùng — đây là chỗ dễ sai nhất
của mọi cách lồng ghép, nên nếu ban giám khảo hỏi "làm sao chắc không cộng hai
lần", diễn lại bước 4 → 11 là câu trả lời.

---

## Hai điều cần biết trước

**1. `app.js` có thể vẫn tự đổ dữ liệu vào `#dia-phuong` theo schema cũ.**
Không sao — select đó nằm trong khối ẩn, select thật người dùng thấy là
`#nuoc-dia-phuong`. Nếu Console báo lỗi từ `app.js` liên quan tới
`water-rates.json` (vì schema đổi sang 2.0.0), lỗi đó nằm trong nhánh nước cũ đã
bị vô hiệu hóa nên không ảnh hưởng kết quả — nhưng để Console sạch thì nên gỡ
nhánh đó. Gửi tôi `src/app.js`, tôi xóa đúng đoạn cần xóa thay vì để bạn đoán.

**2. Nút “Sao chép bản đối chiếu” nối thêm phần nước bằng cách đọc clipboard.**
Một số trình duyệt chặn `clipboard.readText()`. Nếu bản sao chép chỉ có phần
điện, đó là lý do — cách xử lý đúng là thêm 1 dòng vào hàm sao chép trong
`app.js`, có sẵn trong `patch/app-js-hook.js` (PATCH 5).

---

## Còn phải làm trước khi nộp

- [ ] `npm test` xanh trên bản `git clone` mới, thư mục sạch.
- [ ] Nhập một hóa đơn nước thật vào phần mềm; lệch quá vài trăm đồng thì tìm
      cho ra lý do. Ảnh hóa đơn đặt cạnh ảnh màn hình là bằng chứng mạnh nhất
      trong bài thuyết trình.
- [ ] Xác minh trường `khiChuaCoDinhMuc` trong `config/water-rates.json`
      (đang có cờ `canKiemChung: true`). Biểu giá 6.700/12.900/14.400 và tỷ lệ
      thoát nước 30% đã đối chiếu nhiều nguồn, chắc chắn cho năm 2026. Riêng
      quy tắc “chưa có định mức thì áp bậc mấy” cần hỏi công ty cấp nước hoặc
      đọc nguyên văn Quyết định 25/2019/QĐ-UBND. Ghi rõ là giả định thì mất ít
      điểm hơn nhiều so với bị phát hiện một con số bịa.
- [ ] Cập nhật `README.md` và `CHANGELOG.md` lên 0.3.0 (nội dung mẫu có trong
      `docs/HUONG-DAN-NUOC.md`, mục Bước 7).
- [ ] Ảnh chụp màn hình thật thay cho `docs/screenshots/demo-main.png`.
