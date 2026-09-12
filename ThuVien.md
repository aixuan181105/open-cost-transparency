# Danh mục thư viện & thành phần mã nguồn mở sử dụng

**Dự án:** Open Cost Transparency — Minh bạch chi phí điện nước nhà trọ
**Repository:** https://github.com/aixuan181105/open-cost-transparency
**Giấy phép dự án:** MIT
**Cập nhật:** 12/09/2026

---

## 1. Tóm tắt

Dự án được xây dựng theo nguyên tắc **zero-dependency**: toàn bộ mã sản phẩm
(`index.html`, `style.css`, `src/*.js`, `config/*.json`) **không nạp bất kỳ thư viện
bên thứ ba nào** — không framework, không CDN, không icon font, không web font.

| Nhóm thành phần | Số lượng | Ảnh hưởng tới sản phẩm phát hành |
|---|---|---|
| Thư viện chạy trong sản phẩm (runtime dependencies) | 0 | — |
| Công cụ phát triển / kiểm thử (dev tools) | 3 | Không đóng gói vào sản phẩm |
| API nền tảng chuẩn mở (thay cho thư viện) | 4 | Có sẵn trong trình duyệt |
| Tài nguyên & quy ước ngoài mã nguồn | 4 | Chỉ dùng trong tài liệu |

**Hệ quả pháp lý:** vì không có phụ thuộc runtime, dự án không kế thừa nghĩa vụ
giấy phép nào từ bên thứ ba. Giấy phép MIT của dự án là **giấy phép duy nhất**
mà người dùng và người phân phối lại cần tuân thủ.

---

## 2. Bảng A — Thư viện chạy trong sản phẩm (runtime dependencies)

| Thư viện | Phiên bản | Giấy phép | URL | Mục đích sử dụng |
|---|---|---|---|---|
| *(không có)* | — | — | — | Sản phẩm chỉ dùng HTML/CSS/JavaScript thuần và Web API tiêu chuẩn |

Kiểm chứng: trong `package.json` không có khối `dependencies` hoặc
`devDependencies`; trong `index.html` chỉ có 6 thẻ `<script src="src/...">`
trỏ tới mã nội bộ và 1 thẻ `<link href="style.css">`.

```bash
# Cả hai lệnh dưới đây phải trả về kết quả rỗng
grep -rn "cdn\|unpkg\|jsdelivr\|googleapis" index.html style.css src/
npm ls --all --omit=dev
```

---

## 3. Bảng B — Công cụ phát triển & kiểm thử

Các thành phần này chỉ dùng khi lập trình/kiểm thử, **không được nhúng vào sản phẩm**
và không phát sinh nghĩa vụ giấy phép đối với người dùng cuối.

| Thư viện | Phiên bản | Giấy phép | URL | Mục đích sử dụng |
|---|---|---|---|---|
| Node.js | 22.x LTS (yêu cầu tối thiểu 18.x) | MIT | https://nodejs.org · https://github.com/nodejs/node | Môi trường chạy bộ kiểm thử `tests/*.test.js` bằng `node`, không cần trình duyệt |
| npm (CLI) | 10.x (đi kèm Node.js 22) | Artistic-2.0 | https://github.com/npm/cli | Chạy script `npm test`, `npm start` khai báo trong `package.json` |
| serve (Vercel) | 14.2.6 | MIT | https://www.npmjs.com/package/serve · https://github.com/vercel/serve | Máy chủ tĩnh cục bộ (`npx --yes serve . -l 3000`) để `fetch()` đọc được `config/*.json` — giao thức `file://` chặn fetch |

> `serve` được gọi qua `npx --yes` nên **không** nằm trong `node_modules` của dự án
> và không xuất hiện trong `package-lock.json`. Có thể thay thế bằng bất kỳ máy chủ
> tĩnh khác (`python3 -m http.server`, `php -S`) mà không phải sửa một dòng mã nào.

Lệnh tự xác minh phiên bản trên máy của bạn trước khi nộp bài:

```bash
node -v          # -> v22.x.x
npm -v           # -> 10.x.x
npx serve --version
```

---

## 4. Bảng C — API nền tảng chuẩn mở (dùng thay cho thư viện)

Đây là các đặc tả mở, miễn phí bản quyền, được cài đặt sẵn trong mọi trình duyệt
hiện đại. Chúng là lý do dự án **không cần** React, Tailwind, Axios hay Lodash.

| Thư viện | Phiên bản | Giấy phép | URL | Mục đích sử dụng |
|---|---|---|---|---|
| ECMAScript (JavaScript) | ES2020+ | Ecma International — chuẩn mở, miễn phí bản quyền | https://tc39.es/ecma262/ | Toàn bộ logic `pricing-engine.js`, `water-engine.js` |
| DOM Standard (WHATWG) | Living Standard | CC BY 4.0 (văn bản đặc tả) | https://dom.spec.whatwg.org/ | Thao tác giao diện trong `app.js` — thay cho React/jQuery |
| Fetch API (WHATWG) | Living Standard | CC BY 4.0 (văn bản đặc tả) | https://fetch.spec.whatwg.org/ | Nạp biểu giá từ `config/*.json` theo ngày hiệu lực |
| ECMAScript Internationalization API (`Intl.NumberFormat`) | ECMA-402 | Ecma International — chuẩn mở, miễn phí bản quyền | https://tc39.es/ecma402/ | Định dạng số tiền VND — thay cho `numeral.js` / `accounting.js` |

---

## 5. Bảng D — Tài nguyên & quy ước ngoài mã nguồn

Không phải thư viện lập trình; chỉ được tham chiếu trong tài liệu, README và
lịch sử commit. Không liên kết vào sản phẩm, không ảnh hưởng giấy phép MIT.

| Thư viện | Phiên bản | Giấy phép | URL | Mục đích sử dụng |
|---|---|---|---|---|
| Shields.io | Dịch vụ web (không phiên bản) | CC0-1.0 | https://shields.io · https://github.com/badges/shields | Sinh huy hiệu (badge) License / Release / Issues trong README |
| Keep a Changelog | 1.0.0 | MIT | https://keepachangelog.com/vi/1.0.0/ | Định dạng chuẩn cho `CHANGELOG.md` |
| Semantic Versioning | 2.0.0 | CC BY 3.0 | https://semver.org/lang/vi/ | Quy ước đánh số phiên bản và gắn tag Git |
| Conventional Commits | 1.0.0 | CC BY 3.0 | https://www.conventionalcommits.org/vi/v1.0.0/ | Quy ước viết thông điệp commit |

---

## 6. Nguồn dữ liệu pháp lý (không phải phần mềm)

Biểu giá trong `config/*.json` được trích từ văn bản quy phạm pháp luật Việt Nam —
tài liệu nhà nước, không thuộc phạm vi giấy phép phần mềm.

| Văn bản | Nội dung được sử dụng |
|---|---|
| Quyết định 1279/QĐ-BCT (09/05/2025) | Biểu giá bán lẻ điện sinh hoạt 6 bậc |
| Thông tư 60/2025/TT-BCT | Quy tắc nhân định mức theo số người thuê; áp giá bậc 3 khi không kê khai |
| Quyết định 25/2019/QĐ-UBND (TP.HCM) | Biểu giá nước sạch 6.700 / 12.900 / 14.400 đ/m³ |
| Quyết định 3541/QĐ-UBND (Hà Nội, hiệu lực 01/01/2026) | Biểu giá nước sạch 8.500 / 9.900 / 16.000 / 27.000 đ/m³ |
| Thông tư 44/2021/TT-BTC | Khung giá nước sạch 3.500–18.000 đ/m³ (ngưỡng cảnh báo thu vượt) |

---

## 7. Tương thích giấy phép

| Giấy phép xuất hiện trong dự án | Loại | Tương thích với MIT của dự án |
|---|---|---|
| MIT | Permissive | Có |
| Artistic-2.0 | Permissive | Có (chỉ là công cụ, không liên kết mã) |
| CC0-1.0 | Từ bỏ bản quyền | Có |
| CC BY 3.0 / 4.0 | Tài liệu, yêu cầu ghi nguồn | Có — đã ghi nguồn tại bảng trên |

Dự án **không sử dụng** bất kỳ thành phần nào theo giấy phép copyleft mạnh
(GPL-2.0, GPL-3.0, AGPL-3.0) nên không phát sinh nghĩa vụ mở mã đối với
bên tích hợp lại.

---

## 8. Cách tái lập danh mục này

```bash
# 1. Liệt kê toàn bộ cây phụ thuộc (kỳ vọng: rỗng)
npm ls --all

# 2. Rà soát giấy phép nếu sau này có thêm dependencies
npx --yes license-checker --summary

# 3. Rà soát mọi tài nguyên tải từ Internet trong mã sản phẩm
grep -rniE "https?://|cdn|unpkg|jsdelivr" index.html style.css src/ config/
```

Nếu lệnh (3) trả về kết quả khác các URL trong `<!-- ghi chú -->` và tài liệu,
nghĩa là đã có phụ thuộc ngoài lọt vào sản phẩm — phải bổ sung vào **Bảng A**
và kiểm tra lại mục 7.

---

## 9. Ghi chú bảo trì — cần xử lý trước khi nộp

1. **Lệch số phiên bản.** `package.json` khai `"version": "0.3.0"`, các thẻ
   `<script src="...?v=0.3.0">` trong `index.html` cũng là `0.3.0`, nhưng
   `CHANGELOG.md` đã ghi tới `[0.6.0]`. Ba nơi này phải trùng nhau, nếu không
   ban giám khảo sẽ coi đây là lỗi quản lý phiên bản.
2. **Ngày phát hành còn placeholder.** `CHANGELOG.md` đang để `2026-09-[dd]` ở
   các mục 0.5.0 và 0.6.0 — phải điền ngày thật.
3. Nếu sau này thêm bất kỳ gói npm nào, cập nhật **Bảng A** *trong cùng commit*
   với thay đổi `package.json`.
