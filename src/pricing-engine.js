(function(){
/**
 * pricing-engine.js — LÕI NGHIỆP VỤ
 * ==================================================================
 * Tính tiền điện và tiền nước cho người thuê trọ theo bộ quy tắc được
 * quy định, từ dữ liệu cấu hình truyền vào.
 *
 * BA NGUYÊN TẮC THIẾT KẾ (dùng để trả lời phần hỏi đáp):
 *
 * 1. KHÔNG hard-code bất kỳ đơn giá, ngưỡng bậc hay thuế suất nào ở
 *    file này. Tất cả đến từ config/*.json truyền vào qua tham số.
 *    => Quy định đổi thì sửa JSON, không sửa code đã kiểm thử.
 *
 * 2. KHÔNG đụng tới DOM/giao diện ở file này. Hàm nhận số, trả về số.
 *    => Chạy được trong Node.js để viết test, không cần trình duyệt.
 *
 * 3. Tính lũy tiến bằng RANH GIỚI LIÊN TỤC (0→50→100→200...) chứ không
 *    bằng khoảng rời rạc [51,100]. Cách này không bị lệch một đơn vị
 *    (off-by-one) khi nhân với định mức không nguyên, ví dụ 3 người =
 *    0,75 định mức. Đây là lỗi phổ biến nhất của bài toán bậc thang.
 * ==================================================================
 */

// ------------------------------------------------------------------
// TIỆN ÍCH CHUNG
// ------------------------------------------------------------------

function lamTron(so) {
  return Math.round(so);
}

/**
 * Chọn phần tử có hiệu lực tại một thời điểm, từ một mảng các phiên bản
 * có 'hieuLucTu' / 'hieuLucDen'. Dùng cho cả biểu giá điện và thuế GTGT.
 * Nhờ hàm này, đổi ngày tính tiền sang 2027 là thuế GTGT tự nhảy về mức
 * thông thường mà không phải sửa dòng code nào.
 */
function chonTheoNgay(danhSachPhienBan, ngayTinh) {
  const ngay = ngayTinh || new Date().toISOString().slice(0, 10);
  const hopLe = danhSachPhienBan.filter((p) => {
    const sauNgayBatDau = !p.hieuLucTu || ngay >= p.hieuLucTu;
    const truocNgayKetThuc = !p.hieuLucDen || ngay <= p.hieuLucDen;
    return sauNgayBatDau && truocNgayKetThuc;
  });

  if (hopLe.length === 0) {
    throw new Error(
      `Không tìm thấy phiên bản cấu hình nào có hiệu lực vào ngày ${ngay}. ` +
        `Hãy cập nhật file cấu hình trong thư mục config/.`
    );
  }
  // Nếu nhiều phiên bản cùng khớp, lấy phiên bản mới nhất.
  return hopLe.sort((a, b) =>
    (a.hieuLucTu || "").localeCompare(b.hieuLucTu || "")
  )[hopLe.length - 1];
}

/**
 * THUẬT TOÁN LŨY TIẾN DÙNG CHUNG cho điện và nước.
 * Nhận vào mảng bậc đã có ranh giới tuyệt đối, phân bổ sản lượng lần lượt
 * từ bậc thấp lên bậc cao, mỗi phần tính theo đơn giá của chính bậc đó,
 * rồi cộng dồn.
 *
 * @param {number} sanLuong - tổng lượng tiêu thụ (kWh hoặc m³)
 * @param {Array} cacBac - [{ bac, tenBac, tuMuc, denMuc|null, donGia }]
 * @returns {{tongTien:number, chiTiet:Array}}
 */
function tinhLuyTien(sanLuong, cacBac) {
  let conLai = sanLuong;
  let tongTien = 0;
  const chiTiet = [];

  for (const b of cacBac) {
    const doRong = b.denMuc === null ? Infinity : b.denMuc - b.tuMuc;
    const luongTrongBac = Math.min(Math.max(conLai, 0), doRong);
    const thanhTien = luongTrongBac * b.donGia;

    chiTiet.push({
      bac: b.bac,
      tenBac: b.tenBac,
      tuMuc: lamTronMuc(b.tuMuc),
      denMuc: b.denMuc === null ? null : lamTronMuc(b.denMuc),
      donGia: b.donGia,
      sanLuong: lamTronMuc(luongTrongBac),
      thanhTien: lamTron(thanhTien),
      suDung: luongTrongBac > 0,
    });

    tongTien += thanhTien;
    conLai -= luongTrongBac;
    if (conLai <= 0) {
      // Vẫn giữ các bậc còn lại trong bảng (suDung = false) để người dùng
      // thấy rõ mình KHÔNG bị tính vào các bậc giá cao.
      continue;
    }
  }

  return { tongTien: lamTron(tongTien), chiTiet };
}

function lamTronMuc(so) {
  return Math.round(so * 100) / 100;
}

// ------------------------------------------------------------------
// PHẦN ĐIỆN
// ------------------------------------------------------------------

/**
 * Định mức hộ dùng điện theo số người thuê thực tế.
 * Cứ `donViDinhMuc` người (mặc định 4) = 1 định mức; ít hơn thì quy đổi
 * theo tỷ lệ 1/4 định mức mỗi người.
 */
function tinhDinhMuc(soNguoiThue, donViDinhMuc = 4) {
  if (!soNguoiThue || soNguoiThue <= 0) return 1;
  return soNguoiThue / donViDinhMuc;
}

/**
 * Nhân ranh giới của từng bậc theo định mức đã tính, tạo ra bảng bậc
 * thang riêng cho phòng trọ đó.
 */
function apDungDinhMuc(bacThangGoc, dinhMuc) {
  let bienTruoc = 0;
  return bacThangGoc.map((b) => {
    const bienSau = b.denKwh === null ? null : b.denKwh * dinhMuc;
    const ketQua = {
      bac: b.bac,
      tenBac: b.tenBac || `Bậc ${b.bac}`,
      tuMuc: bienTruoc,
      denMuc: bienSau,
      donGia: b.donGia,
      denKwhGoc: b.denKwh,
    };
    if (bienSau !== null) bienTruoc = bienSau;
    return ketQua;
  });
}

/**
 * Tính tiền điện phải trả.
 *
 * @param {Object} input
 * @param {number} input.soKwh        - sản lượng tiêu thụ trong kỳ
 * @param {number} input.soNguoiThue  - số người thuê thực tế
 * @param {boolean} input.coKeKhai    - chủ nhà có kê khai đủ số người?
 * @param {string} [input.ngayTinh]   - ngày tính (YYYY-MM-DD), mặc định hôm nay
 * @param {Object} configBieuGia      - config/electricity-tiers.json
 * @param {Object} configVat          - config/vat.json
 */
function tinhTienDien(input, configBieuGia, configVat) {
  const { soKwh, soNguoiThue, coKeKhai, ngayTinh } = input;

  if (typeof soKwh !== "number" || Number.isNaN(soKwh) || soKwh < 0) {
    throw new Error("Sản lượng điện (soKwh) phải là một số không âm.");
  }

  const bieuGia = chonTheoNgay(configBieuGia.bieuGia, ngayTinh);
  const thue = chonTheoNgay(configVat.dienSinhHoat, ngayTinh);

  let ketQuaTinh;
  let dinhMuc = null;
  let cheDo;

  if (coKeKhai === false) {
    // Chế tài: áp một đơn giá cố định cho toàn bộ sản lượng, KHÔNG lũy tiến.
    const bacApDung = bieuGia.bacThang.find(
      (b) => b.bac === configBieuGia.khongKeKhai.apDungBac
    );
    if (!bacApDung) {
      throw new Error(
        `Cấu hình yêu cầu áp bậc ${configBieuGia.khongKeKhai.apDungBac} nhưng biểu giá không có bậc này.`
      );
    }
    cheDo = "GIA_CO_DINH_MOT_BAC";
    ketQuaTinh = {
      tongTien: lamTron(soKwh * bacApDung.donGia),
      chiTiet: [
        {
          bac: bacApDung.bac,
          tenBac: `${bacApDung.tenBac} — áp cố định cho toàn bộ sản lượng`,
          tuMuc: 0,
          denMuc: null,
          donGia: bacApDung.donGia,
          sanLuong: soKwh,
          thanhTien: lamTron(soKwh * bacApDung.donGia),
          suDung: soKwh > 0,
        },
      ],
    };
  } else {
    cheDo = "LUY_TIEN_THEO_DINH_MUC";
    dinhMuc = tinhDinhMuc(soNguoiThue, configBieuGia.donViDinhMuc);
    const cacBac = apDungDinhMuc(bieuGia.bacThang, dinhMuc);
    ketQuaTinh = tinhLuyTien(soKwh, cacBac);
  }

  const tienTruocThue = ketQuaTinh.tongTien;
  const tienThue = lamTron(tienTruocThue * thue.thueSuat);
  const tongThanhToan = tienTruocThue + tienThue;

  return {
    loai: "DIEN",
    cheDo,
    soKwh,
    soNguoiThue: soNguoiThue || null,
    coKeKhai: coKeKhai !== false,
    dinhMuc,
    canCuBieuGia: bieuGia.canCu,
    phienBanBieuGia: bieuGia.phienBan,
    canCuThue: thue.canCu,
    thueSuat: thue.thueSuat,
    tienTruocThue,
    tienThue,
    tongThanhToan,
    donGiaBinhQuan: soKwh > 0 ? lamTron(tongThanhToan / soKwh) : 0,
    chiTiet: ketQuaTinh.chiTiet,
  };
}

// ------------------------------------------------------------------
// PHẦN NƯỚC
// ------------------------------------------------------------------

/**
 * Tính tiền nước. Hỗ trợ ba phương thức thu khai báo trong config:
 *  - BAC_THANG_DINH_MUC: lũy tiến theo định mức m³/người (đúng quy định)
 *  - GIA_PHANG:          một đơn giá duy nhất cho mọi m³
 *  - KHOAN_DAU_NGUOI:    khoán tiền cố định mỗi người mỗi tháng
 *
 * @param {Object} input
 * @param {number} input.soM3
 * @param {number} input.soNguoiThue
 * @param {string} input.maDiaPhuong  - khớp với 'ma' trong water-rates.json
 * @param {string} [input.ngayTinh]
 * @param {Object} configNuoc         - config/water-rates.json
 * @param {Object} configVat          - config/vat.json
 */
function tinhTienNuoc(input, configNuoc, configVat) {
  const { soM3, soNguoiThue, maDiaPhuong, ngayTinh } = input;

  const dp = configNuoc.diaPhuong.find((d) => d.ma === maDiaPhuong);
  if (!dp) {
    throw new Error(
      `Không tìm thấy địa phương có mã '${maDiaPhuong}' trong config/water-rates.json. ` +
        `Hãy thêm một phần tử mới vào mảng 'diaPhuong'.`
    );
  }

  const thue = chonTheoNgay(configVat.nuocSachSinhHoat, ngayTinh);
  const soNguoi = soNguoiThue && soNguoiThue > 0 ? soNguoiThue : 1;

  let tienTruocThue = 0;
  let chiTiet = [];
  let dinhMucTong = null;

  if (dp.phuongThuc === "BAC_THANG_DINH_MUC") {
    if (typeof soM3 !== "number" || soM3 < 0) {
      throw new Error("Lượng nước (soM3) phải là một số không âm.");
    }
    dinhMucTong = soNguoi * dp.dinhMucM3NguoiThang;

    let bienTruoc = 0;
    const cacBac = dp.bacThang.map((b) => {
      const bienSau =
        b.nhanDinhMuc === null ? null : b.nhanDinhMuc * dinhMucTong;
      const kq = {
        bac: b.bac,
        tenBac: b.tenBac,
        tuMuc: bienTruoc,
        denMuc: bienSau,
        donGia: b.donGia,
      };
      if (bienSau !== null) bienTruoc = bienSau;
      return kq;
    });

    const kq = tinhLuyTien(soM3, cacBac);
    tienTruocThue = kq.tongTien;
    chiTiet = kq.chiTiet;
  } else if (dp.phuongThuc === "GIA_PHANG") {
    tienTruocThue = lamTron(soM3 * dp.donGiaPhang);
    chiTiet = [
      {
        bac: 1,
        tenBac: "Giá phẳng (không theo biểu giá địa phương)",
        tuMuc: 0,
        denMuc: null,
        donGia: dp.donGiaPhang,
        sanLuong: soM3,
        thanhTien: tienTruocThue,
        suDung: soM3 > 0,
      },
    ];
  } else if (dp.phuongThuc === "KHOAN_DAU_NGUOI") {
    tienTruocThue = lamTron(soNguoi * dp.khoanMoiNguoiThang);
    chiTiet = [
      {
        bac: 1,
        tenBac: `Khoán ${soNguoi} người × ${dp.khoanMoiNguoiThang.toLocaleString(
          "vi-VN"
        )} đ/người`,
        tuMuc: 0,
        denMuc: null,
        donGia: dp.khoanMoiNguoiThang,
        sanLuong: soNguoi,
        thanhTien: tienTruocThue,
        suDung: true,
      },
    ];
  } else {
    throw new Error(
      `Phương thức '${dp.phuongThuc}' chưa được hỗ trợ. Xem '_schema' trong config/water-rates.json.`
    );
  }

  const phiMoiTruong = lamTron(tienTruocThue * (dp.phiBaoVeMoiTruong || 0));
  const tienThue = lamTron(tienTruocThue * thue.thueSuat);
  const tongThanhToan = tienTruocThue + tienThue + phiMoiTruong;

  return {
    loai: "NUOC",
    phuongThuc: dp.phuongThuc,
    tenDiaPhuong: dp.ten,
    canCu: dp.canCu,
    soM3: soM3 || 0,
    soNguoiThue: soNguoi,
    dinhMucM3NguoiThang: dp.dinhMucM3NguoiThang || null,
    dinhMucTong,
    tienTruocThue,
    tyLePhiMoiTruong: dp.phiBaoVeMoiTruong || 0,
    phiMoiTruong,
    thueSuat: thue.thueSuat,
    tienThue,
    tongThanhToan,
    chiTiet,
  };
}

// ------------------------------------------------------------------
// ĐỐI CHIẾU MỨC THU THỰC TẾ CỦA CHỦ TRỌ
// ------------------------------------------------------------------

/**
 * So sánh số tiền chủ trọ đang thu với số tiền đúng theo quy định.
 *
 * @param {number} soTienThucThu   - số tiền chủ trọ thu của người thuê
 * @param {number} soTienHopPhap   - kết quả tính theo quy định (đã gồm thuế)
 * @param {Object} configPhapLy    - config/legal-references.json
 */
function doiChieuMucThu(soTienThucThu, soTienHopPhap, configPhapLy) {
  const chenhLech = lamTron(soTienThucThu - soTienHopPhap);
  const tyLeVuot =
    soTienHopPhap > 0 ? chenhLech / soTienHopPhap : 0;

  let mucDo = "DUNG_QUY_DINH";
  if (chenhLech > 0) mucDo = "THU_VUOT";
  else if (chenhLech < 0) mucDo = "THU_THAP_HON";

  return {
    soTienThucThu: lamTron(soTienThucThu),
    soTienHopPhap: lamTron(soTienHopPhap),
    chenhLech,
    tyLeVuot,
    mucDo,
    canCuXuPhat:
      mucDo === "THU_VUOT" && configPhapLy
        ? configPhapLy.xuPhatThuVuotGia
        : null,
  };
}

// ------------------------------------------------------------------
// XUẤT MODULE (dùng được cả trong Node.js và trên trình duyệt)
// ------------------------------------------------------------------

const api = {
  chonTheoNgay,
  tinhLuyTien,
  tinhDinhMuc,
  apDungDinhMuc,
  tinhTienDien,
  tinhTienNuoc,
  doiChieuMucThu,
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = api;
}
if (typeof window !== "undefined") {
  window.PricingEngine = api;
}

})();
