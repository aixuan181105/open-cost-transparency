# Ghi chú thiết kế (DESIGN.md)

Tài liệu ngắn giải thích **vì sao** dự án được thiết kế như vậy — dùng để trả lời phần hỏi đáp khi trình diễn.

## 1. Vì sao tách cấu hình (config/*.json) khỏi mã nguồn?

Biểu giá điện thay đổi định kỳ (Quyết định 1279/QĐ-BCT có thể được thay thế bởi quyết định mới), thuế suất GTGT có
thời hạn hiệu lực (đến 31/12/2026 theo chính sách hiện hành). Nếu hard-code các con số này trong hàm tính toán,
mỗi lần chính sách đổi sẽ phải sửa code, biên dịch lại, dễ gây lỗi. Tách ra JSON giúp:

- Cập nhật số liệu mà không đụng vào logic đã kiểm thử.
- Người không biết lập trình (ví dụ chủ trọ, sinh viên khác) vẫn có thể cập nhật giá đúng.
- Dễ viết test case với nhiều bộ số liệu khác nhau (ví dụ giả lập biểu giá cũ/mới).

## 2. Vì sao `pricing-engine.js` không đụng vào DOM?

Để lõi nghiệp vụ có thể:
- Chạy độc lập trong Node.js để viết test (`tests/pricing-engine.test.js`) mà không cần trình duyệt.
- Tái sử dụng cho các bài toán tương tự (tiền nước, phí dịch vụ) chỉ bằng cách đổi bộ config.
- Không bị lẫn lỗi giao diện với lỗi công thức tính toán khi debug.

## 3. Vì sao dùng phép tính lũy tiến theo "ranh giới liên tục" thay vì [từ, đến] rời rạc?

Biểu giá công bố dạng "bậc 1: 0–50 kWh, bậc 2: 51–100 kWh..." nhưng về bản chất tính toán, đây là các đoạn liên tục
nối tiếp nhau. Việc dùng ranh giới liên tục (0→50, 50→100, 100→200...) giúp công thức không bị lệch 1 đơn vị (off-by-one)
khi nhân với định mức không phải số nguyên (ví dụ 0.75 định mức).

## 4. Vì sao trường hợp "không kê khai" không dùng hàm lũy tiến?

Theo quy định, đây là một **chế tài khác về bản chất** (áp giá cố định 1 bậc cho toàn bộ sản lượng), không phải một
biến thể của lũy tiến. Tách thành hàm riêng (`tinhKhongKeKhai`) giúp code phản ánh đúng bản chất nghiệp vụ, tránh
nhét thêm điều kiện `if` chằng chịt vào hàm lũy tiến vốn đã phải xử lý nhiều bậc.

## 5. Giới hạn đã biết / việc chưa làm

- Giá nước một số tỉnh dùng số liệu mẫu, cần đối chiếu trước khi dùng thực tế.
