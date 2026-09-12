# Changelog

Mọi thay đổi đáng chú ý của dự án được ghi lại tại đây.
Định dạng dựa theo [Keep a Changelog](https://keepachangelog.com/vi/1.0.0/),
dự án tuân theo [Semantic Versioning](https://semver.org/lang/vi/).

## [Chưa phát hành]

### Dự kiến thêm
- [Điền tính năng bạn đang làm dở, nếu có]

---

## [0.6.0] - 2026-09-[dd]

### Thêm mới
- Bổ sung BIỂU GIÁ NƯỚC CHÍNH THỨC của TP.HCM và Hà Nội làm chuẩn đối chiếu độc lập:
  - TP.HCM (Quyết định 25/2019/QĐ-UBND): định mức 4 m³/người, bậc 6.700 / 12.900 / 14.400 đ/m³,
    phí thoát nước 25%.
  - Hà Nội (Quyết định 3541/QĐ-UBND, áp dụng 01/01/2026): bậc theo m³/đồng hồ,
    8.500 / 9.900 / 16.000 / 27.000 đ/m³, phí BVMT 10%. Cả hai chịu thuế GTGT 5%.
- Người dùng chọn tỉnh làm chuẩn → ứng dụng tính "giá đúng theo quyết định nhà nước"
  và so với mức chủ trọ thu, chỉ rõ chênh lệch. Đây là đối chiếu với nguồn độc lập,
  không phải với chính giá chủ trọ nhập — đáp ứng đúng yêu cầu minh bạch chi phí.
- Engine hỗ trợ thêm phương thức BAC_THANG_M3 (bậc theo m³ tuyệt đối trên đồng hồ,
  kiểu Hà Nội), song song với BAC_THANG_DINH_MUC (nhân định mức số người, kiểu TP.HCM).
- Thêm 3 ca kiểm thử cho biểu giá hai thành phố (tổng 34 ca).

## [0.5.0] - 2026-09-[dd]

### Thêm mới
- Bổ sung khung giá nước sạch sinh hoạt toàn quốc theo Thông tư 44/2021/TT-BTC
  (nông thôn 2.000–11.000; đô thị loại 2–5 là 3.000–15.000; đô thị đặc biệt/loại 1
  là 3.500–18.000 đ/m³, đã gồm VAT) — hiển thị bảng tra cứu ở tab Căn cứ pháp lý.
- Cảnh báo tự động khi đơn giá nước bình quân vượt mức trần 18.000 đ/m³.
- Bổ sung Thông tư 219/2013/TT-BTC (thuế GTGT nước sạch 5%) vào văn bản tham chiếu.
- Giá nước mặc định trong form điều chỉnh theo hệ số bậc thang của Thông tư 44/2021.
- Thêm 2 ca kiểm thử cho đơn giá bình quân nước (tổng 32 ca).

## [0.4.0] - 2026-09-[dd]

### Thay đổi
- Phần tính tiền nước chuyển sang cho người dùng TỰ NHẬP cách chủ trọ thu, thay
  vì chọn từ danh sách tỉnh có sẵn giá mẫu. Lý do: mỗi nhà trọ thu một kiểu và giá
  nước khác nhau theo địa phương, để người dùng tự nhập là chính xác và sát thực tế
  nhất. Hỗ trợ ba kiểu: giá cố định mỗi m³, bậc thang theo định mức (thêm/bớt bậc
  linh hoạt), khoán đầu người. Có ô phí bảo vệ môi trường tùy chỉnh.

### Thêm mới
- Thêm 4 ca kiểm thử cho tính tiền nước tự nhập (tổng 30 ca).

### Kỹ thuật
- Hàm tinhTienNuoc nhận thêm input.bieuThu (người dùng nhập), vẫn tương thích ngược
  với input.maDiaPhuong (tra config).

## [0.3.0] - 2026-09-[dd]

### Thêm mới
- Nhập số điện theo hai cách: gõ trực tiếp số kWh, hoặc nhập chỉ số công tơ
  đầu kỳ/cuối kỳ để ứng dụng tự tính hiệu số (khớp dữ liệu người thuê thật sự có).
- Phần "phân tích cách tính bậc thang" có thể bấm mở/đóng: giải thích nguyên lý
  lũy tiến, minh họa bằng số liệu của người dùng, so sánh với cách tính sai
  (nhân đơn giá phẳng). Mặc định thu gọn để không làm giao diện dài dòng.
- Ghi chú rõ thuế GTGT điện áp dụng thống nhất toàn quốc, không khác theo tỉnh.
- Thêm 4 ca kiểm thử cho tính năng nhập chỉ số công tơ (tổng 26 ca).

## [0.2.1] - 2026-09-[dd]

### Sửa lỗi
- Sửa lỗi nghiêm trọng khiến ứng dụng không tính toán được trên trình duyệt: các tệp JS
  cùng khai báo biến toàn cục `api` gây xung đột "Identifier already declared", làm module
  explain.js dừng giữa chừng và không tạo được `window.Explain`. Đã bọc mỗi tệp trong IIFE
  để cô lập phạm vi biến.
- Thêm kiểm tra module đã nạp đủ khi khởi động, báo lỗi rõ ràng thay vì "reading undefined".
- Thêm tham số chống bộ nhớ đệm cho tệp JS và JSON.

## [0.1.0] - 2026-09-[dd]

### Thêm mới
- Lõi tính toán `pricing-engine.js`: tính tiền điện lũy tiến theo 6 bậc thang.
- Xử lý định mức theo số người thuê (Thông tư 60/2025/TT-BCT).
- Xử lý trường hợp không kê khai số người (áp giá bậc 3 cố định).
- Diễn giải từng bước tính toán (`explain.js`) bằng tiếng Việt dễ hiểu.
- Giao diện web đơn giản (`index.html`, `style.css`, `app.js`).
- Cấu hình biểu giá và thuế tách riêng khỏi mã nguồn (`config/*.json`).
- Bộ 8 test case cho lõi tính toán (`tests/pricing-engine.test.js`).
- README, LICENSE (MIT), issue template.

<!--
  Mẫu cho các lần cập nhật sau:

  ## [0.2.0] - 2026-xx-xx
  ### Thêm mới
  - ...
  ### Sửa lỗi
  - ...
  ### Thay đổi
  - ...
-->
