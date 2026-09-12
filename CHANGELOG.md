# Changelog

Mọi thay đổi đáng chú ý của dự án được ghi lại tại đây.
Định dạng dựa theo [Keep a Changelog](https://keepachangelog.com/vi/1.0.0/),
dự án tuân theo [Semantic Versioning](https://semver.org/lang/vi/).

## [Chưa phát hành]

### Dự kiến thêm
- Nhập chỉ số công tơ đầu/cuối kỳ, tự tính sản lượng tiêu thụ
- Chia tiền điện nước theo từng người ở trong phòng
- Xuất bản đối chiếu ra PDF có bố cục hoàn chỉnh kèm căn cứ pháp lý
- So sánh biểu giá giữa các mốc thời gian điều chỉnh

---

## [1.0.0] - 2026-09-12

### Thêm mới
- Lõi tính toán `pricing-engine.js`: tính tiền điện lũy tiến theo 6 bậc thang.
- Xử lý định mức theo số người thuê (Thông tư 60/2025/TT-BCT).
- Xử lý trường hợp không kê khai số người (áp giá bậc 3 cố định).
- Diễn giải từng bước tính toán (`explain.js`) bằng tiếng Việt dễ hiểu.
- Giao diện web đơn giản (`index.html`, `style.css`, `app.js`).
- Cấu hình biểu giá và thuế tách riêng khỏi mã nguồn (`config/*.json`).
- Bộ 22 test case cho lõi tính toán (`tests/pricing-engine.test.js`).
- README, LICENSE (MIT), issue template.

