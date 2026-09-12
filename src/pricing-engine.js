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
 * Tính sản lượng tiêu thụ từ chỉ số công tơ đầu kỳ và cuối kỳ.
 * Người thuê trọ thường chỉ nhìn thấy hai con số trên đồng hồ, không
 * tự tính hiệu số. Hàm này giúp họ nhập đúng dữ liệu mình có.
 *
 * @param {number} chiSoDau - chỉ số đầu kỳ (số nhỏ hơn)
 * @param {number} chiSoCuoi - chỉ số cuối kỳ (số lớn hơn)
 * @returns {number} sản lượng tiêu thụ
 */
function tinhSanLuongTuChiSo(chiSoDau, chiSoCuoi) {
  if (
    typeof chiSoDau !== "number" ||
    typeof chiSoCuoi !== "number" ||
    Number.isNaN(chiSoDau) ||
    Number.isNaN(chiSoCuoi)
  ) {
    throw new Error("Chỉ số công tơ đầu kỳ và cuối kỳ phải là số.");
  }
  if (chiSoDau < 0 || chiSoCuoi < 0) {
    throw new Error("Chỉ số công tơ không được âm.");
  }
  if (chiSoCuoi < chiSoDau) {
    throw new Error(
      "Chỉ số cuối kỳ phải lớn hơn hoặc bằng chỉ số đầu kỳ. " +
        "Hãy kiểm tra lại: có thể bạn đã nhập nhầm thứ tự hai ô."
    );
  }
  return chiSoCuoi - chiSoDau;
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
 * Chuẩn hóa thông số biểu thu do người dùng TỰ NHẬP về đúng định dạng mà
 * hàm tính bên dưới cần. Giúp phần tính toán không phải phân biệt dữ liệu
 * đến từ config hay từ người dùng.
 *
 * @param {Object} bt - biểu thu người dùng nhập, tùy phương thức:
 *   { phuongThuc: "BAC_THANG_DINH_MUC", ten, dinhMucM3NguoiThang, bacThang:[{tenBac,nhanDinhMuc,donGia}], phiBaoVeMoiTruong }
 *   { phuongThuc: "GIA_PHANG", ten, donGiaPhang, phiBaoVeMoiTruong }
 *   { phuongThuc: "KHOAN_DAU_NGUOI", ten, khoanMoiNguoiThang }
 */
function chuanHoaBieuThu(bt) {
  if (!bt || !bt.phuongThuc) {
    throw new Error("Thiếu 'phuongThuc' trong biểu thu nước tự nhập.");
  }
  const dp = {
    ma: "TU_NHAP",
    ten: bt.ten || "Chủ trọ thu (tự nhập)",
    canCu: bt.canCu || "Người dùng nhập theo cách chủ trọ đang thu",
    phuongThuc: bt.phuongThuc,
    phiBaoVeMoiTruong: Number(bt.phiBaoVeMoiTruong) || 0,
  };

  if (bt.phuongThuc === "BAC_THANG_DINH_MUC") {
    dp.dinhMucM3NguoiThang = Number(bt.dinhMucM3NguoiThang);
    if (!(dp.dinhMucM3NguoiThang > 0)) {
      throw new Error("Định mức m³/người/tháng phải là số dương.");
    }
    if (!Array.isArray(bt.bacThang) || bt.bacThang.length === 0) {
      throw new Error("Cần ít nhất một bậc giá nước.");
    }
    dp.bacThang = bt.bacThang.map((b, i) => ({
      bac: i + 1,
      tenBac: b.tenBac || `Bậc ${i + 1}`,
      nhanDinhMuc:
        b.nhanDinhMuc === null || b.nhanDinhMuc === undefined || b.nhanDinhMuc === ""
          ? null
          : Number(b.nhanDinhMuc),
      donGia: Number(b.donGia),
    }));
  } else if (bt.phuongThuc === "BAC_THANG_M3") {
    // Bậc thang theo tổng m³ trên đồng hồ, KHÔNG nhân số người (kiểu Hà Nội).
    if (!Array.isArray(bt.bacThang) || bt.bacThang.length === 0) {
      throw new Error("Cần ít nhất một bậc giá nước.");
    }
    dp.bacThang = bt.bacThang.map((b, i) => ({
      bac: i + 1,
      tenBac: b.tenBac || `Bậc ${i + 1}`,
      denM3:
        b.denM3 === null || b.denM3 === undefined || b.denM3 === ""
          ? null
          : Number(b.denM3),
      donGia: Number(b.donGia),
    }));
  } else if (bt.phuongThuc === "GIA_PHANG") {
    dp.donGiaPhang = Number(bt.donGiaPhang);
    if (!(dp.donGiaPhang >= 0)) {
      throw new Error("Đơn giá nước phải là số không âm.");
    }
  } else if (bt.phuongThuc === "KHOAN_DAU_NGUOI") {
    dp.khoanMoiNguoiThang = Number(bt.khoanMoiNguoiThang);
    if (!(dp.khoanMoiNguoiThang >= 0)) {
      throw new Error("Tiền khoán mỗi người phải là số không âm.");
    }
  } else {
    throw new Error(`Phương thức '${bt.phuongThuc}' không hợp lệ.`);
  }
  return dp;
}

/**
 * Tính tiền nước. Hỗ trợ ba phương thức thu:
 *  - BAC_THANG_DINH_MUC: lũy tiến theo định mức m³/người (đúng quy định)
 *  - GIA_PHANG:          một đơn giá duy nhất cho mọi m³
 *  - KHOAN_DAU_NGUOI:    khoán tiền cố định mỗi người mỗi tháng
 *
 * Thông số biểu thu có thể lấy từ HAI nguồn:
 *  (a) input.bieuThu — do người dùng TỰ NHẬP cách chủ trọ đang thu. Ưu tiên
 *      nguồn này, vì mỗi nhà trọ thu một kiểu và giá nước khác nhau theo tỉnh,
 *      để người dùng tự nhập là chính xác và dễ cập nhật nhất.
 *  (b) input.maDiaPhuong — tra từ config/water-rates.json (dùng khi muốn có
 *      sẵn biểu giá tham chiếu của một địa phương).
 *
 * @param {Object} input
 * @param {number} input.soM3
 * @param {number} input.soNguoiThue
 * @param {Object} [input.bieuThu]     - thông số người dùng tự nhập (ưu tiên)
 * @param {string} [input.maDiaPhuong] - hoặc mã địa phương trong config
 * @param {string} [input.ngayTinh]
 * @param {Object} configNuoc          - config/water-rates.json
 * @param {Object} configVat           - config/vat.json
 */
function tinhTienNuoc(input, configNuoc, configVat) {
  const { soM3, soNguoiThue, bieuThu, maDiaPhuong, ngayTinh } = input;

  // Nguồn biểu thu: ưu tiên do người dùng tự nhập; nếu không có thì tra config.
  let dp;
  if (bieuThu) {
    dp = chuanHoaBieuThu(bieuThu);
  } else {
    dp = configNuoc.diaPhuong.find((d) => d.ma === maDiaPhuong);
    if (!dp) {
      throw new Error(
        `Không có thông số biểu thu nước: thiếu cả input.bieuThu (tự nhập) lẫn ` +
          `mã địa phương '${maDiaPhuong}' hợp lệ trong config.`
      );
    }
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
  } else if (dp.phuongThuc === "BAC_THANG_M3") {
    // Bậc thang theo tổng m³ trên đồng hồ (kiểu Hà Nội), ngưỡng tuyệt đối.
    if (typeof soM3 !== "number" || soM3 < 0) {
      throw new Error("Lượng nước (soM3) phải là một số không âm.");
    }
    let bienTruoc = 0;
    const cacBac = dp.bacThang.map((b) => {
      const kq = {
        bac: b.bac,
        tenBac: b.tenBac,
        tuMuc: bienTruoc,
        denMuc: b.denM3,
        donGia: b.donGia,
      };
      if (b.denM3 !== null) bienTruoc = b.denM3;
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
    donGiaBinhQuan:
      dp.phuongThuc !== "KHOAN_DAU_NGUOI" && soM3 > 0
        ? lamTron(tongThanhToan / soM3)
        : null,
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
  tinhSanLuongTuChiSo,
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
