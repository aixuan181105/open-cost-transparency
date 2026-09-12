(function(){
/**
 * explain.js — SINH DIỄN GIẢI
 * ==================================================================
 * Chuyển kết quả tính toán (thuần số) thành các câu tiếng Việt để người
 * thuê trọ không rành kỹ thuật tự đối chiếu được với hóa đơn.
 *
 * Tách riêng khỏi pricing-engine.js vì đây là việc TRÌNH BÀY, không phải
 * việc TÍNH TOÁN. Nhờ vậy có thể đổi cách diễn giải (rút gọn, đổi ngôn
 * ngữ, xuất PDF) mà không chạm vào lõi đã kiểm thử.
 * ==================================================================
 */

function dinhDangTien(so) {
  return Math.round(so).toLocaleString("vi-VN") + " đ";
}

function dinhDangSo(so) {
  return (Math.round(so * 100) / 100).toLocaleString("vi-VN");
}

function phanTram(tyLe) {
  return (tyLe * 100).toLocaleString("vi-VN") + "%";
}

/**
 * Diễn giải các bước tính tiền điện.
 * @returns {Array<{buoc:number, tieuDe:string, noiDung:string}>}
 */
function dienGiaiDien(kq) {
  const buoc = [];
  let i = 1;

  buoc.push({
    buoc: i++,
    tieuDe: "Sản lượng tiêu thụ trong kỳ",
    noiDung: `Công tơ ghi nhận <strong>${dinhDangSo(kq.soKwh)} kWh</strong>.`,
  });

  if (kq.cheDo === "GIA_CO_DINH_MOT_BAC") {
    buoc.push({
      buoc: i++,
      tieuDe: "Không kê khai đủ số người thuê",
      noiDung:
        `Vì chủ nhà không kê khai đầy đủ số người sử dụng điện, toàn bộ ` +
        `${dinhDangSo(kq.soKwh)} kWh bị áp <strong>một đơn giá cố định</strong> ` +
        `của bậc ${kq.chiTiet[0].bac} (${dinhDangTien(kq.chiTiet[0].donGia)}/kWh), ` +
        `<strong>không</strong> được hưởng biểu giá lũy tiến. ` +
        `Nếu chủ nhà kê khai đủ, số tiền sẽ thấp hơn.`,
    });
  } else {
    buoc.push({
      buoc: i++,
      tieuDe: "Xác định định mức hộ dùng điện",
      noiDung:
        `Phòng có <strong>${kq.soNguoiThue ?? "?"} người</strong>. ` +
        `Cứ 4 người được tính là 1 định mức, nên định mức của phòng là ` +
        `${kq.soNguoiThue} ÷ 4 = <strong>${dinhDangSo(kq.dinhMuc)} định mức</strong>.`,
    });
    buoc.push({
      buoc: i++,
      tieuDe: "Nhân rộng ngưỡng của từng bậc",
      noiDung:
        `Ngưỡng sản lượng của mỗi bậc được nhân với ${dinhDangSo(kq.dinhMuc)}. ` +
        `Nhờ vậy phòng nhiều người được hưởng nhiều kWh ở các bậc giá thấp hơn, ` +
        `thay vì bị đẩy nhanh lên bậc giá cao như một hộ độc thân.`,
    });
    buoc.push({
      buoc: i++,
      tieuDe: "Tính cộng dồn theo từng bậc",
      noiDung:
        `Sản lượng được lấp dần từ bậc thấp lên bậc cao, <strong>mỗi phần tính ` +
        `theo đơn giá của chính bậc đó</strong> rồi cộng lại. Đây là điểm khác ` +
        `biệt cốt lõi so với cách nhân một đơn giá duy nhất cho toàn bộ sản lượng ` +
        `(xem bảng chi tiết bên dưới).`,
    });
  }

  buoc.push({
    buoc: i++,
    tieuDe: "Tiền điện trước thuế",
    noiDung: `Cộng tất cả các bậc: <strong>${dinhDangTien(kq.tienTruocThue)}</strong>.`,
  });

  buoc.push({
    buoc: i++,
    tieuDe: `Thuế GTGT (${phanTram(kq.thueSuat)})`,
    noiDung:
      `${dinhDangTien(kq.tienTruocThue)} × ${phanTram(kq.thueSuat)} = ` +
      `<strong>${dinhDangTien(kq.tienThue)}</strong>. ` +
      `<span class="ghi-chu-nho">Căn cứ: ${kq.canCuThue}</span>`,
  });

  buoc.push({
    buoc: i++,
    tieuDe: "Tổng tiền điện phải trả",
    noiDung:
      `<strong>${dinhDangTien(kq.tongThanhToan)}</strong>, tương đương ` +
      `<strong>${dinhDangTien(kq.donGiaBinhQuan)}/kWh</strong> tính bình quân (đã gồm thuế).`,
  });

  return buoc;
}

/** Diễn giải các bước tính tiền nước. */
function dienGiaiNuoc(kq) {
  const buoc = [];
  let i = 1;

  if (kq.phuongThuc === "BAC_THANG_DINH_MUC") {
    buoc.push({
      buoc: i++,
      tieuDe: "Định mức nước của phòng",
      noiDung:
        `${kq.tenDiaPhuong}: định mức ${kq.dinhMucM3NguoiThang} m³/người/tháng × ` +
        `${kq.soNguoiThue} người = <strong>${dinhDangSo(kq.dinhMucTong)} m³</strong> ` +
        `được hưởng giá trong định mức.`,
    });
    buoc.push({
      buoc: i++,
      tieuDe: "Phân bổ lượng nước theo bậc",
      noiDung:
        `Đã dùng <strong>${dinhDangSo(kq.soM3)} m³</strong>, được phân bổ lũy tiến ` +
        `qua các bậc (xem bảng chi tiết).`,
    });
  } else if (kq.phuongThuc === "GIA_PHANG") {
    buoc.push({
      buoc: i++,
      tieuDe: "Thu theo giá phẳng",
      noiDung:
        `${dinhDangSo(kq.soM3)} m³ × ${dinhDangTien(kq.chiTiet[0].donGia)}/m³. ` +
        `Cách thu này <strong>không căn cứ biểu giá địa phương</strong> và thường ` +
        `cao hơn giá quy định.`,
    });
  } else {
    buoc.push({
      buoc: i++,
      tieuDe: "Khoán theo đầu người",
      noiDung:
        `Chủ trọ khoán cố định theo số người, <strong>không căn cứ lượng nước thực dùng</strong>. ` +
        `Người dùng ít nước vẫn phải trả bằng người dùng nhiều.`,
    });
  }

  buoc.push({
    buoc: i++,
    tieuDe: "Tiền nước trước thuế và phí",
    noiDung: `<strong>${dinhDangTien(kq.tienTruocThue)}</strong>.`,
  });

  if (kq.tyLePhiMoiTruong > 0) {
    buoc.push({
      buoc: i++,
      tieuDe: `Phí bảo vệ môi trường (${phanTram(kq.tyLePhiMoiTruong)})`,
      noiDung:
        `Áp dụng với nước thải sinh hoạt: <strong>${dinhDangTien(kq.phiMoiTruong)}</strong>.`,
    });
  }

  buoc.push({
    buoc: i++,
    tieuDe: `Thuế GTGT nước sạch (${phanTram(kq.thueSuat)})`,
    noiDung: `<strong>${dinhDangTien(kq.tienThue)}</strong>.`,
  });

  buoc.push({
    buoc: i++,
    tieuDe: "Tổng tiền nước phải trả",
    noiDung: `<strong>${dinhDangTien(kq.tongThanhToan)}</strong>.`,
  });

  return buoc;
}

/** Diễn giải kết quả đối chiếu mức thu của chủ trọ. */
function dienGiaiDoiChieu(dc) {
  if (dc.mucDo === "THU_VUOT") {
    let noiDung =
      `Chủ trọ thu <strong>${dinhDangTien(dc.soTienThucThu)}</strong>, trong khi ` +
      `theo quy định chỉ là <strong>${dinhDangTien(dc.soTienHopPhap)}</strong>. ` +
      `Bạn đang trả thừa <strong>${dinhDangTien(dc.chenhLech)}</strong> ` +
      `(cao hơn ${phanTram(dc.tyLeVuot)}).`;
    if (dc.canCuXuPhat) {
      noiDung +=
        ` <span class="ghi-chu-nho">Theo ${dc.canCuXuPhat.canCu}, hành vi thu tiền điện ` +
        `cao hơn giá quy định có thể bị xử phạt từ ` +
        `${dinhDangTien(dc.canCuXuPhat.mucPhatTu)} đến ${dinhDangTien(dc.canCuXuPhat.mucPhatDen)}, ` +
        `kèm nghĩa vụ hoàn trả.</span>`;
    }
    return { mucDo: dc.mucDo, tieuDe: "Mức thu vượt quá quy định", noiDung };
  }

  if (dc.mucDo === "THU_THAP_HON") {
    return {
      mucDo: dc.mucDo,
      tieuDe: "Mức thu thấp hơn quy định",
      noiDung:
        `Chủ trọ thu <strong>${dinhDangTien(dc.soTienThucThu)}</strong>, thấp hơn ` +
        `mức theo quy định (${dinhDangTien(dc.soTienHopPhap)}) ` +
        `${dinhDangTien(Math.abs(dc.chenhLech))}.`,
    };
  }

  return {
    mucDo: dc.mucDo,
    tieuDe: "Mức thu khớp với quy định",
    noiDung: `Số tiền chủ trọ thu đúng bằng mức tính theo quy định hiện hành.`,
  };
}

/**
 * Sinh nội dung PHÂN TÍCH cách tính bậc thang (hiển thị khi người dùng
 * bấm mở). Giải thích cặn kẽ nguyên lý lũy tiến, so sánh với cách tính
 * sai (nhân đơn giá phẳng), và minh họa bằng chính con số của người dùng.
 * @returns {string} HTML
 */
function phanTichBacThang(kq) {
  if (kq.cheDo === "GIA_CO_DINH_MOT_BAC") {
    return (
      "<h4>Trường hợp của bạn: giá cố định một bậc</h4>" +
      "<p>Vì không kê khai đủ số người thuê, toàn bộ sản lượng bị áp một " +
      "đơn giá duy nhất (bậc 3), không được chia bậc lũy tiến. Đây là lý do " +
      "cách tính này thường đắt hơn: bạn không được hưởng phần điện giá rẻ ở " +
      "các bậc thấp.</p>" +
      "<h4>Nếu kê khai đủ số người</h4>" +
      "<p>Sản lượng sẽ được chia bậc như phần giải thích dưới đây, và số tiền " +
      "gần như luôn thấp hơn.</p>" +
      phanNguyenLyChung()
    );
  }

  // Dựng minh họa từ chính các bậc thực tế người dùng đang dùng
  const bacDung = kq.chiTiet.filter((c) => c.suDung);
  let minhHoa = "<h4>Áp dụng với số liệu của bạn</h4>";
  minhHoa +=
    `<p>Bạn dùng <strong>${dinhDangSo(kq.soKwh)} kWh</strong>` +
    (kq.dinhMuc !== null
      ? `, định mức <strong>${dinhDangSo(kq.dinhMuc)}</strong> (từ ${
          kq.soNguoiThue
        } người).`
      : ".") +
    " Sản lượng được lấp dần từ bậc thấp lên:</p>";
  minhHoa += '<div class="cong-thuc">';
  minhHoa += bacDung
    .map(
      (c) =>
        `Bậc ${c.bac}: ${dinhDangSo(c.sanLuong)} kWh × ${dinhDangTien(
          c.donGia
        )} = ${dinhDangTien(c.thanhTien)}`
    )
    .join("<br>");
  minhHoa += `<br>─────────<br>Cộng lại = <strong>${dinhDangTien(
    kq.tienTruocThue
  )}</strong> (chưa thuế)`;
  minhHoa += "</div>";

  // So sánh với cách tính sai
  const donGiaCaoNhat = bacDung.length
    ? bacDung[bacDung.length - 1].donGia
    : 0;
  const cachSai = kq.soKwh * donGiaCaoNhat;
  let soSanh = "";
  if (cachSai > kq.tienTruocThue) {
    soSanh =
      '<div class="so-sanh-sai">' +
      `<strong>So với cách tính SAI thường gặp:</strong> nếu lấy đơn giá bậc ` +
      `cao nhất (${dinhDangTien(donGiaCaoNhat)}) nhân cho toàn bộ ` +
      `${dinhDangSo(kq.soKwh)} kWh, số tiền sẽ là ${dinhDangTien(cachSai)} — ` +
      `cao hơn <strong>${dinhDangTien(
        cachSai - kq.tienTruocThue
      )}</strong>. Cách tính lũy tiến đúng giúp bạn không bị tính oan.` +
      "</div>";
  }

  return phanNguyenLyChung() + minhHoa + soSanh;
}

function phanNguyenLyChung() {
  return (
    "<h4>Nguyên lý biểu giá bậc thang lũy tiến</h4>" +
    "<p>Giá điện sinh hoạt chia thành nhiều bậc. Mỗi bậc chỉ áp dụng cho " +
    "phần sản lượng nằm trong khoảng của bậc đó, <strong>không</strong> áp cho " +
    "toàn bộ. Càng dùng nhiều, phần vượt lên bậc trên mới chịu giá cao hơn — " +
    "nhằm khuyến khích tiết kiệm điện.</p>" +
    "<h4>Định mức theo số người thuê</h4>" +
    "<p>Nhà trọ nhiều người được nhân rộng ngưỡng mỗi bậc (4 người = 1 định " +
    "mức). Nhờ vậy phòng đông người được hưởng nhiều kWh giá rẻ hơn, thay vì " +
    "bị đẩy nhanh lên bậc giá cao như một hộ độc thân.</p>"
  );
}

const api = {
  dinhDangTien,
  dinhDangSo,
  phanTram,
  dienGiaiDien,
  dienGiaiNuoc,
  dienGiaiDoiChieu,
  phanTichBacThang,
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = api;
}
if (typeof window !== "undefined") {
  window.Explain = api;
}

})();
