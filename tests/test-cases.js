(function(){
/**
 * test-cases.js — ĐỊNH NGHĨA CÁC CA KIỂM THỬ (dùng chung)
 * ==================================================================
 * File này chỉ ĐỊNH NGHĨA test, không tự chạy. Nhờ vậy cùng một bộ test
 * được dùng ở hai nơi:
 *   - Dòng lệnh:  node tests/pricing-engine.test.js
 *   - Trình duyệt: tab "Kiểm thử" trong ứng dụng
 * => Không có nguy cơ hai nơi kiểm thử hai bộ logic khác nhau.
 * ==================================================================
 */

function taoDanhSachTest(Engine, cfg) {
  const { bieuGia, vat, nuoc } = cfg;

  /** So sánh bằng, ném lỗi có thông điệp rõ ràng nếu lệch. */
  function bang(thucTe, mongDoi, moTa) {
    if (thucTe !== mongDoi) {
      throw new Error(
        `${moTa || "Giá trị"}: nhận được ${thucTe}, mong đợi ${mongDoi}`
      );
    }
  }

  function nemLoi(ham, moTa) {
    let daNem = false;
    try {
      ham();
    } catch (e) {
      daNem = true;
    }
    if (!daNem) throw new Error(`${moTa}: đáng lẽ phải báo lỗi nhưng lại không`);
  }

  const donGia = {};
  bieuGia.bieuGia[0].bacThang.forEach((b) => (donGia[b.bac] = b.donGia));
  const NGAY = "2026-09-01";

  return [
    // ---------- Định mức theo số người ----------
    {
      nhom: "Định mức",
      ten: "4 người = 1 định mức",
      chay: () => bang(Engine.tinhDinhMuc(4, 4), 1),
    },
    {
      nhom: "Định mức",
      ten: "2 người = 0,5 định mức (quy đổi 1/4 mỗi người)",
      chay: () => bang(Engine.tinhDinhMuc(2, 4), 0.5),
    },
    {
      nhom: "Định mức",
      ten: "8 người = 2 định mức",
      chay: () => bang(Engine.tinhDinhMuc(8, 4), 2),
    },

    // ---------- Lũy tiến bậc thang ----------
    {
      nhom: "Lũy tiến",
      ten: "30 kWh / 4 người: chỉ rơi vào bậc 1",
      chay: () => {
        const kq = Engine.tinhTienDien(
          { soKwh: 30, soNguoiThue: 4, coKeKhai: true, ngayTinh: NGAY },
          bieuGia,
          vat
        );
        bang(kq.tienTruocThue, 30 * donGia[1], "Tiền trước thuế");
        bang(
          kq.chiTiet.filter((c) => c.suDung).length,
          1,
          "Số bậc thực tế được dùng"
        );
      },
    },
    {
      nhom: "Lũy tiến",
      ten: "120 kWh / 4 người: tràn qua bậc 1-2-3, phải CỘNG DỒN",
      chay: () => {
        const kq = Engine.tinhTienDien(
          { soKwh: 120, soNguoiThue: 4, coKeKhai: true, ngayTinh: NGAY },
          bieuGia,
          vat
        );
        const dung = 50 * donGia[1] + 50 * donGia[2] + 20 * donGia[3];
        bang(kq.tienTruocThue, dung, "Tiền trước thuế");
      },
    },
    {
      nhom: "Lũy tiến",
      ten: "KHÔNG được nhân đơn giá bậc cao nhất cho toàn bộ sản lượng",
      chay: () => {
        const kq = Engine.tinhTienDien(
          { soKwh: 120, soNguoiThue: 4, coKeKhai: true, ngayTinh: NGAY },
          bieuGia,
          vat
        );
        const saiKieuPhang = 120 * donGia[3];
        if (kq.tienTruocThue === saiKieuPhang) {
          throw new Error(
            "Kết quả trùng với cách tính đơn giá phẳng — lõi đang tính sai bản chất lũy tiến"
          );
        }
        if (kq.tienTruocThue >= saiKieuPhang) {
          throw new Error("Tiền lũy tiến phải thấp hơn cách nhân phẳng bậc 3");
        }
      },
    },
    {
      nhom: "Lũy tiến",
      ten: "Tổng sản lượng phân bổ các bậc luôn bằng sản lượng đầu vào",
      chay: () => {
        [0, 1, 49, 50, 51, 200, 401, 1234.5].forEach((kwh) => {
          const kq = Engine.tinhTienDien(
            { soKwh: kwh, soNguoiThue: 3, coKeKhai: true, ngayTinh: NGAY },
            bieuGia,
            vat
          );
          const tong = kq.chiTiet.reduce((s, c) => s + c.sanLuong, 0);
          if (Math.abs(tong - kwh) > 0.01) {
            throw new Error(
              `Với ${kwh} kWh: tổng phân bổ = ${tong}, bị thất thoát/nhân đôi`
            );
          }
        });
      },
    },
    {
      nhom: "Lũy tiến",
      ten: "Định mức lẻ (3 người = 0,75): ngưỡng bậc 1 co lại còn 37,5 kWh",
      chay: () => {
        const kq = Engine.tinhTienDien(
          { soKwh: 40, soNguoiThue: 3, coKeKhai: true, ngayTinh: NGAY },
          bieuGia,
          vat
        );
        bang(kq.chiTiet[0].sanLuong, 37.5, "Sản lượng bậc 1");
        bang(kq.chiTiet[1].sanLuong, 2.5, "Sản lượng bậc 2");
      },
    },
    {
      nhom: "Lũy tiến",
      ten: "Phòng đông người trả ít hơn phòng ít người ở cùng sản lượng",
      chay: () => {
        const it = Engine.tinhTienDien(
          { soKwh: 300, soNguoiThue: 1, coKeKhai: true, ngayTinh: NGAY },
          bieuGia,
          vat
        );
        const nhieu = Engine.tinhTienDien(
          { soKwh: 300, soNguoiThue: 8, coKeKhai: true, ngayTinh: NGAY },
          bieuGia,
          vat
        );
        if (!(nhieu.tongThanhToan < it.tongThanhToan)) {
          throw new Error(
            "Định mức chưa phát huy tác dụng: phòng 8 người không được lợi hơn phòng 1 người"
          );
        }
      },
    },

    // ---------- Trường hợp không kê khai ----------
    {
      nhom: "Không kê khai",
      ten: "Áp một đơn giá cố định bậc 3 cho toàn bộ sản lượng",
      chay: () => {
        const kq = Engine.tinhTienDien(
          { soKwh: 120, coKeKhai: false, ngayTinh: NGAY },
          bieuGia,
          vat
        );
        bang(kq.cheDo, "GIA_CO_DINH_MOT_BAC", "Chế độ tính");
        bang(kq.chiTiet.length, 1, "Số dòng chi tiết");
        bang(kq.tienTruocThue, 120 * donGia[3], "Tiền trước thuế");
      },
    },
    {
      nhom: "Không kê khai",
      ten: "Không kê khai luôn đắt hơn hoặc bằng có kê khai",
      chay: () => {
        const co = Engine.tinhTienDien(
          { soKwh: 185, soNguoiThue: 3, coKeKhai: true, ngayTinh: NGAY },
          bieuGia,
          vat
        );
        const khong = Engine.tinhTienDien(
          { soKwh: 185, soNguoiThue: 3, coKeKhai: false, ngayTinh: NGAY },
          bieuGia,
          vat
        );
        if (khong.tongThanhToan < co.tongThanhToan) {
          throw new Error("Chế tài không kê khai lại rẻ hơn — logic bị ngược");
        }
      },
    },

    // ---------- Thuế theo thời kỳ (config-driven) ----------
    {
      nhom: "Thuế theo kỳ",
      ten: "Kỳ 2026 dùng thuế suất giảm, kỳ 2027 tự nhảy về mức thông thường",
      chay: () => {
        const namNay = Engine.tinhTienDien(
          { soKwh: 100, soNguoiThue: 4, coKeKhai: true, ngayTinh: "2026-06-01" },
          bieuGia,
          vat
        );
        const namSau = Engine.tinhTienDien(
          { soKwh: 100, soNguoiThue: 4, coKeKhai: true, ngayTinh: "2027-06-01" },
          bieuGia,
          vat
        );
        if (!(namSau.thueSuat > namNay.thueSuat)) {
          throw new Error(
            "Thuế suất không thay đổi theo kỳ tính — cấu hình thời kỳ chưa hoạt động"
          );
        }
        bang(
          namNay.tienTruocThue,
          namSau.tienTruocThue,
          "Tiền trước thuế hai kỳ (phải giống nhau)"
        );
      },
    },
    {
      nhom: "Thuế theo kỳ",
      ten: "Tổng thanh toán = tiền trước thuế + thuế",
      chay: () => {
        const kq = Engine.tinhTienDien(
          { soKwh: 185, soNguoiThue: 3, coKeKhai: true, ngayTinh: NGAY },
          bieuGia,
          vat
        );
        bang(
          kq.tongThanhToan,
          kq.tienTruocThue + kq.tienThue,
          "Tổng thanh toán"
        );
      },
    },

    // ---------- Kiểm tra dữ liệu vào ----------
    {
      nhom: "Dữ liệu vào",
      ten: "Sản lượng âm phải bị từ chối",
      chay: () =>
        nemLoi(
          () =>
            Engine.tinhTienDien(
              { soKwh: -5, soNguoiThue: 2, coKeKhai: true, ngayTinh: NGAY },
              bieuGia,
              vat
            ),
          "Sản lượng âm"
        ),
    },
    {
      nhom: "Dữ liệu vào",
      ten: "0 kWh cho kết quả 0 đồng, không lỗi",
      chay: () => {
        const kq = Engine.tinhTienDien(
          { soKwh: 0, soNguoiThue: 2, coKeKhai: true, ngayTinh: NGAY },
          bieuGia,
          vat
        );
        bang(kq.tongThanhToan, 0, "Tổng thanh toán");
      },
    },

    // ---------- Nước ----------
    {
      nhom: "Nước",
      ten: "Trong định mức: tính toàn bộ theo giá bậc 1",
      chay: () => {
        const dp = nuoc.diaPhuong.find((d) => d.ma === "HCM");
        const dinhMuc = dp.dinhMucM3NguoiThang * 3;
        const kq = Engine.tinhTienNuoc(
          { soM3: dinhMuc, soNguoiThue: 3, maDiaPhuong: "HCM", ngayTinh: NGAY },
          nuoc,
          vat
        );
        bang(
          kq.tienTruocThue,
          dinhMuc * dp.bacThang[0].donGia,
          "Tiền nước trước thuế"
        );
      },
    },
    {
      nhom: "Nước",
      ten: "Vượt định mức: phần vượt tính giá bậc cao hơn, có cộng dồn",
      chay: () => {
        const dp = nuoc.diaPhuong.find((d) => d.ma === "HCM");
        const dinhMuc = dp.dinhMucM3NguoiThang * 3; // 12 m³
        const kq = Engine.tinhTienNuoc(
          {
            soM3: dinhMuc + 2,
            soNguoiThue: 3,
            maDiaPhuong: "HCM",
            ngayTinh: NGAY,
          },
          nuoc,
          vat
        );
        const dung =
          dinhMuc * dp.bacThang[0].donGia + 2 * dp.bacThang[1].donGia;
        bang(kq.tienTruocThue, dung, "Tiền nước trước thuế");
      },
    },
    {
      nhom: "Nước",
      ten: "Có cộng phí bảo vệ môi trường và thuế GTGT nước sạch",
      chay: () => {
        const kq = Engine.tinhTienNuoc(
          { soM3: 12, soNguoiThue: 3, maDiaPhuong: "HCM", ngayTinh: NGAY },
          nuoc,
          vat
        );
        bang(
          kq.tongThanhToan,
          kq.tienTruocThue + kq.tienThue + kq.phiMoiTruong,
          "Tổng tiền nước"
        );
        if (kq.phiMoiTruong <= 0) {
          throw new Error("Phí bảo vệ môi trường không được tính");
        }
      },
    },
    {
      nhom: "Nước",
      ten: "Phương thức khoán đầu người không phụ thuộc số m³",
      chay: () => {
        const a = Engine.tinhTienNuoc(
          { soM3: 5, soNguoiThue: 3, maDiaPhuong: "KHOAN", ngayTinh: NGAY },
          nuoc,
          vat
        );
        const b = Engine.tinhTienNuoc(
          { soM3: 50, soNguoiThue: 3, maDiaPhuong: "KHOAN", ngayTinh: NGAY },
          nuoc,
          vat
        );
        bang(a.tongThanhToan, b.tongThanhToan, "Tiền khoán");
      },
    },
    {
      nhom: "Nước",
      ten: "Mã địa phương không tồn tại phải bị báo lỗi rõ ràng",
      chay: () =>
        nemLoi(
          () =>
            Engine.tinhTienNuoc(
              {
                soM3: 10,
                soNguoiThue: 2,
                maDiaPhuong: "KHONG_TON_TAI",
                ngayTinh: NGAY,
              },
              nuoc,
              vat
            ),
          "Mã địa phương sai"
        ),
    },

    // ---------- Đối chiếu mức thu ----------
    {
      nhom: "Đối chiếu",
      ten: "Phát hiện đúng khi chủ trọ thu vượt",
      chay: () => {
        const dc = Engine.doiChieuMucThu(800000, 500000, null);
        bang(dc.mucDo, "THU_VUOT", "Mức độ");
        bang(dc.chenhLech, 300000, "Chênh lệch");
      },
    },
    {
      nhom: "Đối chiếu",
      ten: "Nhận diện đúng khi thu khớp quy định",
      chay: () => {
        const dc = Engine.doiChieuMucThu(500000, 500000, null);
        bang(dc.mucDo, "DUNG_QUY_DINH", "Mức độ");
      },
    },
  ];
}

const api = { taoDanhSachTest };

if (typeof module !== "undefined" && module.exports) {
  module.exports = api;
}
if (typeof window !== "undefined") {
  window.TestCases = api;
}

})();
