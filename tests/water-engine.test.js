/* ==================================================================
   water-engine.test.js — chạy bằng: node tests/water-engine.test.js
   Không dùng framework, không cài gói nào.
   ================================================================== */
'use strict';

const fs = require('fs');
const path = require('path');
const E = require('../src/water-engine.js');

const cauHinh = JSON.parse(
  fs.readFileSync(path.join(__dirname, '..', 'config', 'water-rates.json'), 'utf8')
);
const hcm = E.chonDiaPhuong(cauHinh, 'hcm');

let dat = 0, truot = 0;
const truotChiTiet = [];

function kiemTra(nhom, ten, dieuKien, chiTiet) {
  if (dieuKien) {
    dat++;
    console.log(`  \u2713 [${nhom}] ${ten}`);
  } else {
    truot++;
    truotChiTiet.push(`[${nhom}] ${ten}${chiTiet ? ' — ' + chiTiet : ''}`);
    console.log(`  \u2717 [${nhom}] ${ten}${chiTiet ? ' — ' + chiTiet : ''}`);
  }
}

function bang(x, y, ten, nhom) {
  kiemTra(nhom, ten, x === y, `nhận ${x}, mong đợi ${y}`);
}

console.log('\n=== LÕI TÍNH TIỀN NƯỚC ===\n');

/* ---------- Nhóm 1: quy đổi chỉ số đồng hồ ---------- */

(() => {
  const nhom = 'chỉ số';
  let r = E.m3TuChiSo(1234, 1246);
  kiemTra(nhom, 'Chỉ số 1234 → 1246 cho 12 m³', r.ok && r.soM3 === 12, JSON.stringify(r));

  r = E.m3TuChiSo(1246, 1234);
  kiemTra(nhom, 'Chỉ số cuối nhỏ hơn đầu thì báo lỗi, không trả số âm', !r.ok && r.soM3 === 0);

  r = E.m3TuChiSo(100.5, 112.8);
  kiemTra(nhom, 'Chấp nhận chỉ số lẻ: 100,5 → 112,8 cho 12,3 m³', r.ok && Math.abs(r.soM3 - 12.3) < 1e-9, String(r.soM3));

  r = E.m3TuChiSo(1234, null);
  kiemTra(nhom, 'Thiếu một chỉ số thì báo thiếu dữ liệu', !r.ok && /chưa nhập/i.test(r.loi));

  r = E.m3TuChiSo(500, 500);
  kiemTra(nhom, 'Hai chỉ số bằng nhau cho 0 m³ và vẫn hợp lệ', r.ok && r.soM3 === 0);
})();

/* ---------- Nhóm 2: lũy tiến theo định mức ---------- */

(() => {
  const nhom = 'lũy tiến';

  // 3 người, 12 m³ → nằm trọn trong định mức bậc 1 (4 × 3 = 12 m³)
  const a = E.tinhTheoQuyDinh({ soM3: 12, soNguoi: 3, coDinhMuc: true }, hcm);
  bang(a.tienNuoc, 80400, '3 người/12 m³: tiền nước sạch = 80.400đ', nhom);
  bang(a.phuPhi[0].tien, 24120, '3 người/12 m³: dịch vụ thoát nước 30% = 24.120đ', nhom);
  bang(a.vatNuoc, 4020, '3 người/12 m³: GTGT nước sạch 5% = 4.020đ', nhom);
  bang(a.phuPhi[0].tienVat, 1930, '3 người/12 m³: GTGT dịch vụ thoát nước 8% = 1.930đ', nhom);
  bang(a.tong, 110470, '3 người/12 m³: tổng phải trả = 110.470đ', nhom);
  bang(a.dinhMucBac1, 12, 'Định mức bậc 1 của 3 người là 12 m³', nhom);

  // Đúng ranh giới bậc: toàn bộ phải nằm ở bậc 1, bậc 2 và 3 bằng 0
  kiemTra(nhom, 'Đúng ranh giới định mức: bậc 2 và bậc 3 không phát sinh',
    a.bang[1].luong === 0 && a.bang[2].luong === 0);

  // 3 người, 20 m³ → 12 ở bậc 1, 6 ở bậc 2, 2 ở bậc 3
  const b = E.tinhTheoQuyDinh({ soM3: 20, soNguoi: 3, coDinhMuc: true }, hcm);
  bang(b.bang[0].luong, 12, '3 người/20 m³: 12 m³ ở bậc 1', nhom);
  bang(b.bang[1].luong, 6, '3 người/20 m³: 6 m³ ở bậc 2', nhom);
  bang(b.bang[2].luong, 2, '3 người/20 m³: 2 m³ ở bậc 3', nhom);
  bang(b.tienNuoc, 80400 + 77400 + 28800, '3 người/20 m³: tiền nước sạch = 186.600đ', nhom);

  // Bảo toàn sản lượng ở nhiều mốc, kể cả số lẻ
  [0, 0.1, 3.7, 12, 12.000001, 18, 18.5, 37.3, 250].forEach((m3) => {
    const k = E.tinhTheoQuyDinh({ soM3: m3, soNguoi: 3, coDinhMuc: true }, hcm);
    const tong = k.bang.reduce((s, h) => s + h.luong, 0);
    kiemTra(nhom, `Tổng lượng phân bổ bằng đúng đầu vào tại ${m3} m³`,
      Math.abs(tong - m3) < 1e-6, `nhận ${tong}`);
  });

  // Số người nhiều hơn thì tiền không bao giờ cao hơn ở cùng sản lượng
  let truocDo = Infinity;
  for (let n = 1; n <= 8; n++) {
    const k = E.tinhTheoQuyDinh({ soM3: 30, soNguoi: n, coDinhMuc: true }, hcm);
    kiemTra(nhom, `30 m³ với ${n} người không đắt hơn với ${n - 1} người`,
      k.tong <= truocDo + 1, `nhận ${k.tong} so với ${truocDo}`);
    truocDo = k.tong;
  }

  // Lũy tiến phải KHÁC cách nhân đơn giá phẳng bậc cao nhất
  const phang = 20 * 14400;
  kiemTra(nhom, 'Kết quả lũy tiến không trùng với nhân đơn giá phẳng bậc 3',
    b.tienNuoc !== phang, `${b.tienNuoc} vs ${phang}`);

  // Đơn giá bình quân trong định mức phải nằm trong khoảng hợp lý của hóa đơn thật
  const bq = a.donGiaBinhQuan;
  kiemTra(nhom, 'Đơn giá bình quân trong định mức nằm khoảng 9.000–9.500đ/m³',
    bq > 9000 && bq < 9500, `nhận ${Math.round(bq)}`);

  // 0 m³ thì mọi khoản bằng 0
  const c = E.tinhTheoQuyDinh({ soM3: 0, soNguoi: 3, coDinhMuc: true }, hcm);
  bang(c.tong, 0, 'Không dùng nước thì tổng bằng 0', nhom);
})();

/* ---------- Nhóm 3: chưa được cấp định mức ---------- */

(() => {
  const nhom = 'không định mức';

  const co = E.tinhTheoQuyDinh({ soM3: 12, soNguoi: 3, coDinhMuc: true }, hcm);
  const khong = E.tinhTheoQuyDinh({ soM3: 12, soNguoi: 3, coDinhMuc: false }, hcm);

  bang(khong.tienNuoc, 12 * 14400, 'Không định mức: toàn bộ 12 m³ áp đơn giá bậc 3', nhom);
  kiemTra(nhom, 'Không định mức luôn đắt hơn hoặc bằng có định mức',
    khong.tong >= co.tong, `${khong.tong} vs ${co.tong}`);
  kiemTra(nhom, 'Không định mức chỉ có một dòng, không chia bậc', khong.bang.length === 1);
  kiemTra(nhom, 'Không định mức phải kèm cảnh báo cho người dùng', khong.canhBao.length > 0);

  // Số người không được ảnh hưởng khi không có định mức
  const khong5 = E.tinhTheoQuyDinh({ soM3: 12, soNguoi: 5, coDinhMuc: false }, hcm);
  bang(khong5.tong, khong.tong, 'Không định mức: số người không làm thay đổi số tiền', nhom);
})();

/* ---------- Nhóm 4: dữ liệu vào không hợp lệ ---------- */

(() => {
  const nhom = 'đầu vào xấu';

  const a = E.tinhTheoQuyDinh({ soM3: -5, soNguoi: 3, coDinhMuc: true }, hcm);
  bang(a.tong, 0, 'Số m³ âm được quy về 0, không trả tiền âm', nhom);

  const b = E.tinhTheoQuyDinh({ soM3: 12, soNguoi: 0, coDinhMuc: true }, hcm);
  bang(b.soNguoi, 1, 'Số người bằng 0 được quy về 1', nhom);

  const c = E.tinhTheoQuyDinh({ soM3: 12, soNguoi: 3.7, coDinhMuc: true }, hcm);
  bang(c.soNguoi, 3, 'Số người lẻ bị lấy phần nguyên', nhom);

  const d = E.tinhTheoQuyDinh({ soM3: 'abc', soNguoi: 3, coDinhMuc: true }, hcm);
  bang(d.tong, 0, 'Chuỗi không phải số được coi là 0', nhom);

  const e = E.tinhTheoQuyDinh({ soM3: 12, soNguoi: 3, coDinhMuc: true }, null);
  kiemTra(nhom, 'Thiếu cấu hình địa phương thì trả lỗi rõ ràng, không văng ngoại lệ', !!e.loi);
})();

/* ---------- Nhóm 5: mức thu của chủ trọ ---------- */

(() => {
  const nhom = 'chủ trọ';
  const qd = E.tinhTheoQuyDinh({ soM3: 12, soNguoi: 3, coDinhMuc: true }, hcm);

  const m3 = E.tinhTheoChuTro({ cach: 'theoM3', thongSo: 20000, soM3: 12, soNguoi: 3 }, qd);
  bang(m3.tong, 240000, 'Thu 20.000đ/m³ cho 12 m³ = 240.000đ', nhom);

  const dn = E.tinhTheoChuTro({ cach: 'dauNguoi', thongSo: 100000, soM3: 12, soNguoi: 3 }, qd);
  bang(dn.tong, 300000, 'Khoán 100.000đ/người cho 3 người = 300.000đ', nhom);

  const cp = E.tinhTheoChuTro({ cach: 'caPhong', thongSo: 200000, soM3: 12, soNguoi: 3 }, qd);
  bang(cp.tong, 200000, 'Khoán cả phòng 200.000đ thì không phụ thuộc m³', nhom);

  const hd = E.tinhTheoChuTro({ cach: 'theoHoaDon', thongSo: 0, soM3: 12, soNguoi: 3 }, qd);
  bang(hd.tong, qd.tong, 'Chia theo hóa đơn thì bằng đúng mức quy định', nhom);

  const tt = E.tinhTheoChuTro({ cach: 'tongTien', thongSo: 240000, soM3: 12, soNguoi: 3 }, qd);
  bang(tt.tong, 240000, 'Nhập thẳng tổng tiền thì lấy đúng con số đó', nhom);

  kiemTra(nhom, 'Có tính được đơn giá bình quân của chủ trọ để so sánh',
    Math.abs(m3.donGiaBinhQuan - 20000) < 1e-9);
})();

/* ---------- Nhóm 6: đối chiếu ---------- */

(() => {
  const nhom = 'đối chiếu';
  const qd = E.tinhTheoQuyDinh({ soM3: 12, soNguoi: 3, coDinhMuc: true }, hcm);

  const cao = E.doiChieu(240000, qd.tong, cauHinh);
  bang(cao.mucDo, 'cao-hon', 'Thu 240.000đ so với 110.470đ bị kết luận là cao hơn', nhom);
  bang(cao.chenhLech, 240000 - qd.tong, 'Chênh lệch tính đúng bằng hiệu hai số', nhom);
  kiemTra(nhom, 'Có nêu số lần cao hơn để người dùng dễ hiểu', cao.tyLe > 2 && cao.tyLe < 2.2);

  const dung = E.doiChieu(qd.tong, qd.tong, cauHinh);
  bang(dung.mucDo, 'phu-hop', 'Thu đúng bằng quy định thì kết luận phù hợp', nhom);

  const lechNho = E.doiChieu(qd.tong + 1500, qd.tong, cauHinh);
  bang(lechNho.mucDo, 'phu-hop', 'Lệch 1.500đ do làm tròn vẫn coi là phù hợp', nhom);

  const thap = E.doiChieu(60000, qd.tong, cauHinh);
  bang(thap.mucDo, 'thap-hon', 'Thu thấp hơn quy định được nêu riêng, không gọi là sai', nhom);

  const thieu = E.doiChieu(240000, 0, cauHinh);
  bang(thieu.mucDo, 'thieu-du-lieu', 'Chưa có m³ thì báo thiếu dữ liệu thay vì chia cho 0', nhom);
})();

/* ---------- Nhóm 7: chạy trọn luồng như giao diện ---------- */

(() => {
  const nhom = 'trọn luồng';

  const kq = E.tinhVaDoiChieu({
    maDiaPhuong: 'hcm',
    dungChiSo: true,
    chiSoDau: 1234,
    chiSoCuoi: 1246,
    soNguoi: 3,
    coDinhMuc: true,
    cachChuTroThu: 'theoM3',
    thongSoChuTro: 20000
  }, cauHinh);

  bang(kq.soM3, 12, 'Nhập chỉ số đồng hồ cho ra 12 m³', nhom);
  bang(kq.quyDinh.tong, 110470, 'Mức đúng theo quy định = 110.470đ', nhom);
  bang(kq.chuTro.tong, 240000, 'Mức chủ trọ thu = 240.000đ', nhom);
  bang(kq.doiChieu.mucDo, 'cao-hon', 'Kết luận: thu cao hơn quy định', nhom);
  kiemTra(nhom, 'Sinh được diễn giải từng bước cho người dùng đọc', kq.dienGiai.length >= 5);
  kiemTra(nhom, 'Diễn giải không để lẫn chuỗi undefined hay NaN',
    !kq.dienGiai.join(' ').match(/undefined|NaN/));

  const loi = E.tinhVaDoiChieu({
    maDiaPhuong: 'hcm', dungChiSo: true, chiSoDau: 1246, chiSoCuoi: 1234,
    soNguoi: 3, coDinhMuc: true, cachChuTroThu: 'theoM3', thongSoChuTro: 20000
  }, cauHinh);
  kiemTra(nhom, 'Chỉ số ngược thì trả lỗi để giao diện hiển thị', !!loi.loiChiSo);

  const tuNhap = E.tinhVaDoiChieu({
    maDiaPhuong: 'tu-nhap', soM3: 12, soNguoi: 3, coDinhMuc: true,
    donGiaTuNhap: 8000, cachChuTroThu: 'theoM3', thongSoChuTro: 20000
  }, cauHinh);
  bang(tuNhap.quyDinh.tienNuoc, 96000, 'Địa phương tự nhập: 12 m³ × 8.000đ = 96.000đ', nhom);
  kiemTra(nhom, 'Địa phương tự nhập có cảnh báo về độ chính xác', tuNhap.quyDinh.canhBao.length > 0);
})();

/* ---------- Nhóm 8: cấu hình phải hợp lệ ---------- */

(() => {
  const nhom = 'cấu hình';
  kiemTra(nhom, 'Có ít nhất một địa phương', cauHinh.diaPhuong.length > 0);
  kiemTra(nhom, 'Địa phương mặc định tồn tại trong danh sách',
    !!E.chonDiaPhuong(cauHinh, cauHinh.diaPhuongMacDinh));

  cauHinh.diaPhuong.forEach((dp) => {
    if (dp.phuongThuc !== 'luyTienTheoDinhMuc') return;
    let truoc = 0, tangDan = true, coBacCuoiMo = false;
    dp.bac.forEach((b, i) => {
      if (b.denM3MoiNguoi === null) coBacCuoiMo = (i === dp.bac.length - 1);
      else { if (b.denM3MoiNguoi <= truoc) tangDan = false; truoc = b.denM3MoiNguoi; }
    });
    kiemTra(nhom, `${dp.ma}: ngưỡng các bậc tăng dần`, tangDan);
    kiemTra(nhom, `${dp.ma}: bậc cuối để mở (không có trần)`, coBacCuoiMo);
    kiemTra(nhom, `${dp.ma}: mọi đơn giá đều dương`, dp.bac.every((b) => b.donGia > 0));
    kiemTra(nhom, `${dp.ma}: có dẫn căn cứ pháp lý`, Array.isArray(dp.canCu) && dp.canCu.length > 0);
  });

  kiemTra(nhom, 'Mọi cách thu đều có mã và tên', cauHinh.cachChuTroThu.every((c) => c.ma && c.ten));
})();

/* ---------- Tổng kết ---------- */

console.log('\n------------------------------------------');
console.log(`Đạt: ${dat} · Trượt: ${truot} · Tổng: ${dat + truot}`);
if (truot > 0) {
  console.log('\nCác ca trượt:');
  truotChiTiet.forEach((t) => console.log('  - ' + t));
}
console.log('------------------------------------------\n');

process.exit(truot > 0 ? 1 : 0);
