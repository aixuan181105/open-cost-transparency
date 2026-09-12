# Điều chỉnh cách tính tiền nước — phân tích, thiết kế, quy trình thực hiện

Tài liệu này đi kèm 6 tệp trong bản giao: `config/water-rates.json`,
`src/water-engine.js`, `src/water-ui.js`, `patch/index-html-patch.html`,
`patch/style-bo-sung.css`, `patch/app-js-hook.js`, `tests/water-engine.test.js`.

---

## 1. Phân tích vấn đề

### 1.1 Bản cũ sai ở đâu

Khối nước trong `index.html` bản 1.0.0 có 3 ô nhập: địa phương, số m³, và
**"Số tiền nước chủ trọ đang thu (đ)"**. Ô thứ ba là chỗ hỏng, vì nó bắt người
dùng tự làm phép nhân trước khi mở phần mềm ra.

Người thuê trọ không giữ trong đầu con số "tổng tiền nước". Họ giữ trong đầu
**cách chủ trọ thu**: "nước 20 nghìn một khối", hoặc "nước 100 nghìn một người".
Bắt họ tự nhân 12 × 20.000 rồi mới nhập vào là:

- đẩy một phép tính sang cho người dùng, trong khi cả phần mềm này tồn tại để
  làm phép tính thay họ;
- tạo thêm một nguồn sai số mà phần mềm không kiểm soát được — nhập lệch một số 0
  là kết luận đối chiếu sai hoàn toàn;
- làm mất thông tin có giá trị nhất: **đơn giá**. Biết chủ trọ thu 20.000đ/m³
  trong khi giá đúng bình quân là 9.206đ/m³ thì kết luận sắc hơn nhiều so với
  biết tổng 240.000đ so với 110.470đ.

### 1.2 Trang này để làm gì

> Trang để người dùng **kiểm tra lại** số tiền mình đóng có đúng hay không,
> không phải để tính toán.

Câu này quyết định toàn bộ thiết kế phần nhập liệu. Hệ quả cụ thể:

| Nguyên tắc | Áp dụng vào bản này |
| --- | --- |
| Chỉ hỏi cái người dùng **đọc được** trên giấy | Chỉ số đồng hồ, số m³, đơn giá — không hỏi tổng tiền |
| Không hỏi cái phần mềm **tự suy ra được** | Số tiền chủ trọ thu = f(cách thu, m³, số người) |
| Không hỏi cái người dùng **phải đi tra** | Biểu giá, thuế suất, tỷ lệ phí thoát nước → nằm trong `config/` |
| Ô nhập nào cũng phải trả lời được ngay khi cầm tờ giấy thu | Không có ô nào cần tính nhẩm |

### 1.3 Bảng đếm ô nhập

| | Bản 1.0.0 | Bản mới |
| --- | --- | --- |
| Nơi ở hiện tại | 1 (chọn) | 1 (chọn) |
| Số nước dùng | 1 (chỉ m³) | 1 (m³) **hoặc** 2 (chỉ số đầu/cuối) |
| Số tiền chủ trọ thu | 1 (**phải tự nhân**) | 1 chọn cách thu + 1 con số **đọc nguyên** |
| Số người | dùng lại của phần điện | dùng lại của phần điện |
| Có định mức hay không | không có | 1 ô tích (mặc định đúng cho đa số) |
| **Số phép tính người dùng phải làm** | **1** | **0** |

Số ô không giảm, nhưng **số phép tính người dùng phải tự làm giảm về 0**, và mỗi
ô đều là con số copy nguyên từ tờ giấy hoặc mặt đồng hồ. Đây mới là thứ cần tối
thiểu hóa, không phải số ô.

### 1.4 Vì sao phải hỏi "có định mức hay không"

Đây là phần đối xứng với logic điện đã làm. Bên điện: hợp đồng dưới 12 tháng và
chủ trọ không kê khai số người thì toàn bộ điện bị áp giá bậc 3
(Thông tư 60/2025/TT-BCT). Bên nước cũng có cơ chế tương tự nhưng **dễ hơn cho
người thuê**: theo Quyết định 02/2022/QĐ-UBND TP.HCM sửa đổi Quyết định
25/2019/QĐ-UBND, sinh viên và người lao động thuê nhà để ở, **có hay không có
hợp đồng thuê nhà**, được cấp định mức nước căn cứ giấy xác nhận tạm trú. Quyết
định 23/2026/QĐ-UBND (hiệu lực 01/5/2026) tiếp tục khẳng định người thuê có đăng
ký cư trú được áp đơn giá, định mức nước theo loại hình không kinh doanh.

Nghĩa là: chỉ cần đăng ký tạm trú là được hưởng định mức 4 m³/người/tháng ở giá
bậc 1. Ô tích này vừa để tính đúng, vừa là một lời khuyên hành động — bỏ tích ra
là thấy tiền tăng vọt, người dùng sẽ hiểu ngay tại sao nên đi đăng ký tạm trú.

### 1.5 Một điểm phải trung thực, đừng làm quá

Với **tiền điện**, thu cao hơn giá quy định có chế tài rõ: phạt 20–30 triệu đồng
và buộc nộp lại số lợi bất hợp pháp (khoản 7 Điều 12 Nghị định 134/2013/NĐ-CP,
sửa đổi bởi Nghị định 17/2022/NĐ-CP).

Với **tiền nước, không có điều khoản xử phạt hành chính tương đương**. 

---

## 2. Lựa chọn công cụ

Không thêm công cụ mới nào. Lý do:

- **Vẫn HTML/CSS/JS thuần, zero dependency.** Dự án đã tuyên bố zero-dependency
  trong README, và đó là lợi thế thật khi trình diễn (không sợ mất mạng, không
  có điểm trừ về bundling bằng công cụ nguồn đóng).
- **Không dùng TypeScript.** Sẽ cần bước biên dịch, mà phần mã cần bảo vệ chỉ là
  một lõi tính toán ~400 dòng đã được 75 ca test phủ. Kiểm thử thay được kiểu
  tĩnh ở quy mô này.
- **Không dùng PostgreSQL/MongoDB/FastAPI.** Sản phẩm không lưu dữ liệu người
  dùng, không có tài khoản. 
- **Không cần Python.** Toàn bộ nằm trong trình duyệt.

Đây là câu trả lời nên dùng nếu bị hỏi "sao không dùng framework": *vì bài toán
không cần, và mỗi dependency là một rủi ro triển khai*. Câu trả lời đó mạnh hơn
việc kể tên một loạt công nghệ.

---

## 3. Kiến trúc phần nước

```
config/water-rates.json      Số liệu pháp lý. Sửa khi luật đổi.
        │  (fetch)
        ▼
src/water-ui.js              Dựng ô nhập, đọc DOM, vẽ kết quả.
        │                    KHÔNG chứa công thức.
        ▼
src/water-engine.js          Công thức. Không biết DOM là gì.
        │                    Chạy được trong Node.
        ▼
tests/water-engine.test.js   75 ca, chạy bằng node thuần.
```

Ba tầng này tách hẳn nhau, và đó là thứ đáng nói khi thuyết trình:

- Đổi giá nước 2027 → sửa **1 tệp JSON**, không biên dịch, không sửa mã đã test.
- Thêm Hà Nội, Đà Nẵng → thêm **một phần tử JSON**.
- Đổi giao diện → không chạm vào công thức, test vẫn xanh.

### 3.1 Hợp đồng của lõi tính toán

```js
WaterEngine.tinhVaDoiChieu({
  maDiaPhuong:    'hcm',
  dungChiSo:      true,        // true: dùng chỉ số đồng hồ; false: nhập m³
  chiSoDau:       1234,
  chiSoCuoi:      1246,
  soM3:           0,           // dùng khi dungChiSo = false
  soNguoi:        3,
  coDinhMuc:      true,
  donGiaTuNhap:   0,           // chỉ dùng cho địa phương chưa có biểu giá
  cachChuTroThu:  'theoM3',    // theoM3 | dauNguoi | caPhong | theoHoaDon | tongTien
  thongSoChuTro:  20000
}, cauHinh)
```

trả về `{ soM3, loiChiSo, quyDinh, chuTro, doiChieu, dienGiai }`.

Điểm mấu chốt: **`chuTro.tong` do phần mềm tính ra**, người dùng không nhập.

### 3.2 Năm cách chủ trọ thu tiền nước

| Mã | Người dùng nhập | Phần mềm tính |
| --- | --- | --- |
| `theoM3` | đơn giá đ/m³ | m³ × đơn giá |
| `dauNguoi` | đ/người/tháng | số người × đơn giá |
| `caPhong` | đ/tháng | lấy nguyên |
| `theoHoaDon` | *không nhập gì* | bằng đúng mức quy định → chênh lệch 0 |
| `tongTien` | tổng tiền trên giấy thu | lấy nguyên (đường lùi cho người chỉ biết tổng) |

Bốn cách đầu là thực tế ở nhà trọ Việt Nam. Cách thứ năm giữ lại để không chặn
người dùng nào cả, nhưng để ở cuối danh sách vì nó là cách kém thông tin nhất.

### 3.3 Công thức tính đúng theo quy định (TP.HCM)

```
Bậc 1:  đến  4 m³ × số người         × 6.700 đ/m³
Bậc 2:  đến  6 m³ × số người         × 12.900 đ/m³
Bậc 3:  phần còn lại                 × 14.400 đ/m³
        ─────────────────────────────────────────
        = tiền nước sạch
        + dịch vụ thoát nước   30% × tiền nước sạch
        + GTGT dịch vụ đó       8% × khoản trên
        + GTGT nước sạch        5% × tiền nước sạch
        ─────────────────────────────────────────
        = tổng phải trả
```

Ví dụ chốt để dùng trong README và khi demo — 3 người, 12 m³:

```
1. Lượng nước dùng trong kỳ: 12 m³, phòng có 3 người.
2. Định mức giá thấp nhất: 4 m³/người/tháng × 3 người = 12 m³ ở đơn giá bậc 1.
3. Tiền nước sạch: 12 m³ × 6.700đ = 80.400đ.
4. Dịch vụ thoát nước và xử lý nước thải: 30% × 80.400đ = 24.120đ, GTGT 8% = 1.930đ.
5. Thuế GTGT nước sạch: 5% × 80.400đ = 4.020đ.
6. Tổng phải trả theo quy định: 110.470đ — tương đương 9.206đ/m³.
7. Chủ trọ đang thu: 12 m³ × 20.000đ/m³ = 240.000đ — tương đương 20.000đ/m³.
8. Đối chiếu: chủ trọ đang thu cao hơn quy định 129.530đ (khoảng 2,17 lần).
```

Con số 9.206đ/m³ này là thứ đáng chiếu lên màn hình khi thuyết trình. Nó khớp
với hóa đơn SAWACO thật, nên người biết việc sẽ tin ngay.

---

## 4. Quy trình thực hiện — làm theo đúng thứ tự

Mỗi bước đều kết thúc bằng một trạng thái chạy được. Không bước nào để dự án ở
trạng thái vỡ.

### Bước 0 — Tạo nhánh, đừng làm trên `main`

```bash
cd open-cost-transparency
git checkout main && git pull
git checkout -b feat/doi-chieu-tien-nuoc
```

### Bước 1 — Thay cấu hình

```bash
cp /duong/dan/tai-ve/config/water-rates.json config/water-rates.json
```

Schema mới khác hẳn bản cũ. Nếu `app.js` hiện đang đọc `water-rates.json` theo
schema cũ, phần nước cũ sẽ hỏng — đó là lý do bước 3 gỡ nó ra.

### Bước 2 — Thêm lõi và tầng giao diện

```bash
cp /duong/dan/tai-ve/src/water-engine.js  src/
cp /duong/dan/tai-ve/src/water-ui.js      src/
cp /duong/dan/tai-ve/tests/water-engine.test.js tests/
```

Chạy test ngay, **trước khi** chạm vào HTML:

```bash
node tests/water-engine.test.js
# Đạt: 75 · Trượt: 0 · Tổng: 75
```

Nếu bước này đã xanh, mọi lỗi phát sinh sau đó là lỗi giao diện, không phải lỗi
công thức. Biết trước điều đó tiết kiệm rất nhiều thời gian gỡ lỗi.

### Bước 3 — Sửa `index.html`

Mở `patch/index-html-patch.html`, làm đúng 3 việc:

1. **PATCH 1** — thay toàn bộ khối `<div id="khoi-nuoc" class="khoi-phu" hidden>`
   (dòng 107–121 bản hiện tại) bằng khối mới.
2. **PATCH 2** — thay toàn bộ thẻ `<div class="the" id="the-nuoc" hidden>`
   (dòng 188–212) bằng thẻ mới.
3. **PATCH 3** — thay khối `<script>` ở cuối tệp. `water-engine.js` **phải** nạp
   trước `water-ui.js`.

Kiểm tra lại: khối cũ có ô `#tien-chu-tro-thu-nuoc`. Ô đó **đã bị xóa**. Grep
toàn dự án để không còn chỗ nào tham chiếu tới nó:

```bash
grep -rn "tien-chu-tro-thu-nuoc" --include=*.js --include=*.html .
```

Còn dòng nào trong `app.js` thì xóa hoặc thay theo `patch/app-js-hook.js`.

### Bước 4 — Thêm CSS

```bash
cat /duong/dan/tai-ve/patch/style-bo-sung.css >> style.css
```

### Bước 5 — Chạy thử trong trình duyệt

```bash
npx --yes serve . -l 3000
```

Mở `http://localhost:3000`, bật "Tính thêm tiền nước", rồi **mở Console (F12)**.
Console phải trắng. Nếu có lỗi, đọc mục 5 bên dưới.

Kịch bản nghiệm thu thủ công:

| Thao tác | Kết quả phải thấy |
| --- | --- |
| Mặc định (3 người, 12 m³, 20.000đ/m³) | Quy định 110.470đ · Chủ trọ 240.000đ · Chênh +129.530đ, hộp đỏ |
| Đổi sang "Tôi đọc chỉ số đồng hồ", nhập 1234 → 1246 | Ghi chú hiện "Đã dùng 12 m³", kết quả không đổi |
| Nhập chỉ số ngược 1246 → 1234 | Hộp đỏ "Chỉ số đồng hồ chưa hợp lệ", không ra số âm |
| Đổi cách thu sang "Chia lại đúng theo hóa đơn nước" | Ô nhập số tiền biến mất, chênh lệch về 0, hộp xanh |
| Đổi sang "Khoán theo đầu người", 100.000đ | Chủ trọ 300.000đ (3 người), nhãn ô nhập đổi theo |
| Bỏ tích "Đã được cấp định mức nước" | Quy định nhảy lên 237.427đ, nhãn đổi thành "Chưa có định mức" |
| Đổi số người ở phần điện từ 3 → 5 | Phần nước tự tính lại, không cần bấm gì |
| Sửa m³ | Kết quả cập nhật ngay khi đang gõ |

Cột cuối là thứ nên diễn lại đúng thứ tự đó khi demo trước ban giám khảo.

### Bước 6 — Nối vào bảng Tổng quan

Theo `patch/app-js-hook.js`. Nếu còn ít thời gian, chọn **phương án B** (đổi nhãn
thẻ thành "Tổng quan tiền điện", không sửa `app.js` dòng nào) — an toàn tuyệt đối
và vẫn đủ thông tin cho người dùng.

### Bước 7 — Cập nhật tài liệu

`CHANGELOG.md`, thêm vào đầu:

```markdown
## [1.0.0] - 2026-09-12

### Thay đổi
- Phần tiền nước: bỏ ô "Số tiền nước chủ trọ đang thu". Người dùng chọn cách chủ
  trọ thu (theo m³ / đầu người / khoán phòng / theo hóa đơn) và nhập một con số
  đọc nguyên trên giấy thu; phần mềm tự tính mức thu. Người dùng không còn phải
  tự làm phép tính nào trước khi nhập.
- Nhập lượng nước bằng số m³ hoặc bằng chỉ số đồng hồ đầu kỳ – cuối kỳ.
- Thẻ Tiền nước có bảng đối chiếu riêng: mức thu của chủ trọ, mức đúng theo quy
  định, chênh lệch, kèm diễn giải từng bước.
- Tách schema `config/water-rates.json` sang phiên bản 2.0.0: bậc theo định mức
  nhân khẩu, phụ phí và thuế khai báo tách rời, có ngày hiệu lực và căn cứ.

### Thêm mới
- `src/water-engine.js`: lõi tính nước không phụ thuộc DOM, chạy được trong Node.
- `src/water-ui.js`: tầng giao diện, tính lại tức thời khi người dùng gõ.
- `tests/water-engine.test.js`: 75 ca kiểm thử cho phần nước.
- Xử lý trường hợp chưa được cấp định mức nước: áp đơn giá bậc cao cho toàn bộ
  sản lượng, kèm gợi ý đăng ký tạm trú để được cấp định mức.

### Sửa lỗi
- Không còn khả năng ra số tiền âm khi chỉ số cuối kỳ nhỏ hơn chỉ số đầu kỳ.
```

`package.json`, cho `npm test` chạy cả hai bộ:

```json
"scripts": {
  "test": "node tests/pricing-engine.test.js && node tests/water-engine.test.js"
}
```
### Bước 8 — Commit theo Conventional Commits

```bash
git add -A
git commit -m "feat(nuoc): doi chieu muc thu theo cach tinh cua chu tro

Bo o nhap tong tien nuoc. Nguoi dung chon cach chu tro thu va nhap mot
con so doc nguyen tren giay thu; phan mem tu tinh muc thu va doi chieu
voi muc dung theo quy dinh. Ho tro nhap m3 hoac chi so dong ho dau/cuoi.

Them src/water-engine.js (lo tinh, khong phu thuoc DOM), src/water-ui.js
va 75 ca kiem thu."
git push -u origin feat/doi-chieu-tien-nuoc
```

Mở Pull Request, tự review một lượt trước khi merge. Việc tự mở PR và tự review
cũng là thứ ban giám khảo nhìn vào lịch sử Git để đánh giá quy trình làm việc.

---

## 5. Ba lỗi gần như chắc chắn sẽ gặp

**"Không đọc được cấu hình biểu giá nước"**
Bạn mở `index.html` bằng cách nhấp đúp. Trình duyệt chặn `fetch()` qua `file://`.
Chạy `npx serve . -l 3000`. README đã cảnh báo điều này ở mục cài đặt.

**Sửa JSON xong mà giao diện không đổi**
Bộ nhớ đệm của trình duyệt. Đổi `?v=2.0.0` trong `DUONG_DAN_CAU_HINH` ở
`water-ui.js` thành `?v=2.0.1`, hoặc Ctrl+Shift+R.

**`Cannot read properties of null`**
Một `id` trong HTML không khớp với `id` mà `water-ui.js` gọi. Danh sách id bắt
buộc: `dia-phuong`, `so-m3`, `chi-so-dau`, `chi-so-cuoi`, `so-nguoi`,
`co-dinh-muc-nuoc`, `cach-chu-tro-thu`, `thong-so-chu-tro`, `the-nuoc`,
`nuoc-chu-tro`, `nuoc-quy-dinh`, `nuoc-chenh-lech`, `dien-giai-nuoc`,
`bang-nuoc`, `bang-nuoc-chan`. Dán lại PATCH 1 và PATCH 2 cho đủ.

