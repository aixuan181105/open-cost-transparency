/**
 * app.js — ĐIỀU KHIỂN GIAO DIỆN
 * ==================================================================
 * File này CHỈ làm ba việc: đọc dữ liệu người dùng nhập, gọi lõi tính
 * toán, và vẽ kết quả ra màn hình.
 *
 * KHÔNG có bất kỳ công thức tính tiền, đơn giá hay thuế suất nào ở đây.
 * Mọi phép tính đều đi qua window.PricingEngine (src/pricing-engine.js),
 * mọi số liệu đều đến từ thư mục config/.
 * ==================================================================
 */

(function () {
  "use strict";

  const E = window.PricingEngine;
  const X = window.Explain;

  // Kiểm tra các module phụ thuộc đã nạp đủ chưa. Nếu một file JS tải
  // thiếu (do cache cũ hoặc sai đường dẫn), báo lỗi rõ ràng ngay từ đầu
  // thay vì để ứng dụng chết với thông báo khó hiểu "reading undefined".
  (function kiemTraModule() {
    const thieu = [];
    if (!E) thieu.push("src/pricing-engine.js (window.PricingEngine)");
    if (!X) thieu.push("src/explain.js (window.Explain)");
    if (!window.TestCases) thieu.push("tests/test-cases.js (window.TestCases)");
    if (thieu.length > 0) {
      const tb =
        "Không nạp được các tệp mã nguồn: " +
        thieu.join(", ") +
        ". Nguyên nhân thường gặp: trình duyệt đang dùng bản cũ trong bộ nhớ đệm " +
        "(hãy nhấn Ctrl+Shift+R để tải lại sạch), hoặc tệp bị thiếu/sai đường dẫn " +
        "(mở F12 → tab Network xem tệp nào báo 404).";
      const hop = document.getElementById("hop-canh-bao");
      if (hop) {
        hop.hidden = false;
        hop.className = "hop-canh-bao hop-canh-bao--do";
        document.getElementById("canh-bao-tieu-de").textContent =
          "Lỗi nạp mã nguồn";
        document.getElementById("canh-bao-noi-dung").textContent = tb;
      }
      throw new Error(tb);
    }
  })();

  /** Nơi lưu cấu hình đã nạp từ config/*.json */
  const CAU_HINH = { bieuGia: null, vat: null, nuoc: null, phapLy: null };

  const $ = (id) => document.getElementById(id);

  // ----------------------------------------------------------------
  // NẠP CẤU HÌNH
  // ----------------------------------------------------------------
  async function napCauHinh() {
    try {
      const chong = "?v=0.6.0"; // đổi số này mỗi lần cập nhật config để tránh cache cũ
      const [bieuGia, vat, nuoc, phapLy] = await Promise.all([
        fetch("./config/electricity-tiers.json" + chong).then(kiemTraPhanHoi),
        fetch("./config/vat.json" + chong).then(kiemTraPhanHoi),
        fetch("./config/water-rates.json" + chong).then(kiemTraPhanHoi),
        fetch("./config/legal-references.json" + chong).then(kiemTraPhanHoi),
      ]);
      Object.assign(CAU_HINH, { bieuGia, vat, nuoc, phapLy });
      return true;
    } catch (err) {
      bayLoiNghiemTrong(
        "Không nạp được tệp cấu hình trong thư mục config/. " +
          "Nếu bạn đang mở trực tiếp bằng file:// thì trình duyệt chặn đọc tệp — " +
          "hãy chạy một máy chủ cục bộ (ví dụ: npx serve . hoặc python3 -m http.server). " +
          "Chi tiết: " +
          err.message
      );
      return false;
    }
  }

  function kiemTraPhanHoi(r) {
    if (!r.ok) throw new Error(`${r.url} → HTTP ${r.status}`);
    return r.json();
  }

  function bayLoiNghiemTrong(thongDiep) {
    const hop = $("hop-canh-bao");
    hop.hidden = false;
    hop.className = "hop-canh-bao hop-canh-bao--do";
    $("canh-bao-tieu-de").textContent = "Lỗi cấu hình";
    $("canh-bao-noi-dung").textContent = thongDiep;
  }

  // ----------------------------------------------------------------
  // KHỞI TẠO GIAO DIỆN TỪ CẤU HÌNH
  // ----------------------------------------------------------------
  function dungGiaoDienTuCauHinh() {
    // Ngày mặc định = hôm nay
    $("ngay-tinh").value = new Date().toISOString().slice(0, 10);

    // Tab căn cứ pháp lý
    veBieuGiaGoc();
    veDanhSachVanBan();

    // Chân trang
    const bg = E.chonTheoNgay(CAU_HINH.bieuGia.bieuGia, $("ngay-tinh").value);
    $("chan-trang-cau-hinh").textContent =
      `Biểu giá điện phiên bản ${bg.phienBan}`;
  }

  // Danh sách các bậc giá nước người dùng nhập (cho phương thức bậc thang).
  // Giá trị mặc định minh họa theo hệ số bậc thang của Thông tư 44/2021/TT-BTC
  // (nhóm hộ dân cư: đến 10m³ hệ số 1; trên 10–20m³ hệ số ~1,2; trên 20–30m³
  // hệ số tối đa 1,5), lấy giá bình quân tham chiếu ~8.000đ/m³. Người dùng nên
  // sửa lại theo đúng giá chủ trọ đang thu.
  let CAC_BAC_NUOC = [
    { nhanDinhMuc: 1.0, donGia: 8000 },
    { nhanDinhMuc: 2.0, donGia: 9600 },
    { nhanDinhMuc: null, donGia: 12000 },
  ];

  /** Đọc thông số biểu thu nước từ form theo kiểu người dùng chọn. */
  function docBieuThuNuoc() {
    const kieu = $("kieu-thu-nuoc").value;
    const phi = (Number($("nuoc-phi-moi-truong").value) || 0) / 100;

    if (kieu === "GIA_PHANG") {
      return {
        phuongThuc: "GIA_PHANG",
        ten: "Chủ trọ thu giá cố định mỗi m³",
        donGiaPhang: Number($("nuoc-don-gia-phang").value) || 0,
        phiBaoVeMoiTruong: phi,
      };
    }
    if (kieu === "KHOAN_DAU_NGUOI") {
      return {
        phuongThuc: "KHOAN_DAU_NGUOI",
        ten: "Chủ trọ khoán theo đầu người",
        khoanMoiNguoiThang: Number($("nuoc-khoan").value) || 0,
      };
    }
    // BẬC THANG
    return {
      phuongThuc: "BAC_THANG_DINH_MUC",
      ten: "Bậc thang theo định mức",
      dinhMucM3NguoiThang: Number($("nuoc-dinh-muc").value) || 4,
      bacThang: CAC_BAC_NUOC,
      phiBaoVeMoiTruong: phi,
    };
  }

  function khoiTaoNuocTuNhap() {
    // Điền danh sách địa phương làm chuẩn đối chiếu (từ config, không viết cứng)
    const chon = $("chuan-nuoc");
    CAU_HINH.nuoc.diaPhuong.forEach((dp) => {
      const o = document.createElement("option");
      o.value = dp.ma;
      o.textContent = dp.ten;
      chon.appendChild(o);
    });
    capNhatGhiChuKieuThu();
    veCacBacNuoc();
  }

  function capNhatGhiChuKieuThu() {
    const kieu = $("kieu-thu-nuoc").value;
    const moTa = {
      GIA_PHANG:
        "Chủ trọ thu một đơn giá cho mọi m³. Đây là cách phổ biến nhất ở nhà trọ, thường cao hơn biểu giá nhà nước.",
      BAC_THANG_DINH_MUC:
        "Tính lũy tiến: mỗi người được một định mức m³ giá rẻ, phần vượt tính giá cao hơn. Đúng theo biểu giá địa phương.",
      KHOAN_DAU_NGUOI:
        "Khoán một khoản cố định mỗi người, không căn cứ lượng nước thực dùng.",
    };
    $("ghi-chu-kieu-thu").textContent = moTa[kieu] || "";

    // Hiện đúng nhóm ô nhập theo kiểu thu
    $("nhom-nuoc-phang").hidden = kieu !== "GIA_PHANG";
    $("nhom-nuoc-bac-thang").hidden = kieu !== "BAC_THANG_DINH_MUC";
    $("nhom-nuoc-khoan").hidden = kieu !== "KHOAN_DAU_NGUOI";

    // Khoán thì không cần nhập m³; phí môi trường cũng không áp cho khoán
    $("nhom-so-m3").hidden = kieu === "KHOAN_DAU_NGUOI";
  }

  /** Vẽ danh sách ô nhập các bậc giá nước (phương thức bậc thang). */
  function veCacBacNuoc() {
    const o = $("nuoc-cac-bac");
    o.innerHTML = "";
    CAC_BAC_NUOC.forEach((b, i) => {
      const laBacCuoi = i === CAC_BAC_NUOC.length - 1;
      const dong = document.createElement("div");
      dong.className = "bac-nuoc";
      dong.innerHTML =
        `<span class="bac-nuoc__nhan">Bậc ${i + 1}</span>` +
        (laBacCuoi
          ? `<span class="bac-nuoc__den">phần còn lại</span>`
          : `<input type="number" class="bac-nuoc__nhan-dm" data-i="${i}" min="0.1" step="0.5" value="${b.nhanDinhMuc}" title="Tới mấy lần định mức" />`) +
        `<input type="number" class="bac-nuoc__gia" data-i="${i}" min="0" step="500" value="${b.donGia}" placeholder="đ/m³" />` +
        (CAC_BAC_NUOC.length > 1
          ? `<button type="button" class="bac-nuoc__xoa" data-i="${i}" title="Xóa bậc">×</button>`
          : "");
      o.appendChild(dong);
    });

    // Gắn sự kiện cho các ô vừa tạo
    o.querySelectorAll(".bac-nuoc__nhan-dm").forEach((el) =>
      el.addEventListener("input", (e) => {
        CAC_BAC_NUOC[Number(e.target.dataset.i)].nhanDinhMuc = Number(
          e.target.value
        );
        tinhToan();
      })
    );
    o.querySelectorAll(".bac-nuoc__gia").forEach((el) =>
      el.addEventListener("input", (e) => {
        CAC_BAC_NUOC[Number(e.target.dataset.i)].donGia = Number(e.target.value);
        tinhToan();
      })
    );
    o.querySelectorAll(".bac-nuoc__xoa").forEach((el) =>
      el.addEventListener("click", (e) => {
        CAC_BAC_NUOC.splice(Number(e.target.dataset.i), 1);
        veCacBacNuoc();
        tinhToan();
      })
    );
  }

  function veBieuGiaGoc() {
    const bg = E.chonTheoNgay(CAU_HINH.bieuGia.bieuGia, $("ngay-tinh").value);
    $("mo-ta-bieu-gia").textContent = `${bg.canCu}. ${bg.ghiChu || ""}`;

    const tbody = $("bang-bieu-gia-goc");
    tbody.innerHTML = "";
    bg.bacThang.forEach((b) => {
      const tr = document.createElement("tr");
      tr.innerHTML =
        `<td>${b.bac}</td>` +
        `<td>${b.tenBac}</td>` +
        `<td class="phai">${X.dinhDangTien(b.donGia)}</td>`;
      tbody.appendChild(tr);
    });
  }

  function veDanhSachVanBan() {
    const ul = $("danh-sach-van-ban");
    ul.innerHTML = "";
    CAU_HINH.phapLy.vanBanThamChieu.forEach((v) => {
      const li = document.createElement("li");
      li.innerHTML =
        `<strong>${v.soHieu}</strong>` +
        `<span class="ngay">${v.ngay}</span>` +
        `<div>${v.noiDung}</div>`;
      ul.appendChild(li);
    });
  }

  function veKhungGiaNuoc() {
    const kg = CAU_HINH.phapLy.khungGiaNuoc;
    if (!kg) return;
    $("mo-ta-khung-nuoc").textContent = `${kg.canCu}. ${kg.ghiChu}`;
    const tbody = $("bang-khung-nuoc");
    tbody.innerHTML = "";
    kg.khung.forEach((k) => {
      const tr = document.createElement("tr");
      tr.innerHTML =
        `<td>${k.khuVuc}</td>` +
        `<td class="phai">${k.toiThieu.toLocaleString("vi-VN")}</td>` +
        `<td class="phai">${k.toiDa.toLocaleString("vi-VN")}</td>`;
      tbody.appendChild(tr);
    });
    $("canh-bao-khung-nuoc").textContent = kg.ghiChuCanhBao;
  }

  // ----------------------------------------------------------------
  // TÍNH TOÁN VÀ HIỂN THỊ
  // ----------------------------------------------------------------
  let ketQuaCuoi = null; // để dùng cho nút sao chép

  function tinhToan() {
    if (!CAU_HINH.bieuGia) return;

    const ngayTinh = $("ngay-tinh").value || undefined;
    const coKeKhai =
      document.querySelector('input[name="keKhai"]:checked').value === "co";
    const soNguoiThue = Number($("so-nguoi").value) || 1;
    const thucThuDien = Number($("tien-chu-tro-thu-dien").value) || 0;
    const batNuoc = $("bat-tinh-nuoc").checked;

    // Chỉ số đồng hồ (nếu người dùng chọn) đã được lớp hợp nhất quy đổi
    // về #so-kwh. Lõi điện luôn chỉ nhận đúng một sản lượng đầu vào.
    const soKwh = Number($("so-kwh").value) || 0;

    try {
      // --- Điện ---
      const kqDien = E.tinhTienDien(
        { soKwh, soNguoiThue, coKeKhai, ngayTinh },
        CAU_HINH.bieuGia,
        CAU_HINH.vat
      );
      veKetQuaDien(kqDien);

      // --- Nước (tùy chọn) ---
      let kqNuoc = null;
      if (batNuoc) {
        const soM3Nuoc = Number($("so-m3").value) || 0;
        kqNuoc = E.tinhTienNuoc(
          {
            soM3: soM3Nuoc,
            soNguoiThue,
            bieuThu: docBieuThuNuoc(),
            ngayTinh,
          },
          CAU_HINH.nuoc,
          CAU_HINH.vat
        );
        veKetQuaNuoc(kqNuoc);
        veSoSanhChuanNuoc(kqNuoc, soM3Nuoc, soNguoiThue, ngayTinh);
      }
      $("the-nuoc").hidden = !batNuoc;

      // --- Đối chiếu ---
      const thucThuNuoc = batNuoc
        ? Number($("tien-chu-tro-thu-nuoc").value) || 0
        : 0;
      const tongThucThu = thucThuDien + thucThuNuoc;
      const tongHopPhap =
        kqDien.tongThanhToan + (kqNuoc ? kqNuoc.tongThanhToan : 0);

      const doiChieu =
        tongThucThu > 0
          ? E.doiChieuMucThu(tongThucThu, tongHopPhap, CAU_HINH.phapLy)
          : null;

      veTongQuan(kqDien, kqNuoc, doiChieu, tongThucThu, tongHopPhap);

      ketQuaCuoi = { kqDien, kqNuoc, doiChieu };
      xoaLoi();
    } catch (err) {
      bayLoiNghiemTrong(err.message);
      console.error(err);
    }
  }

  function xoaLoi() {
    const hop = $("hop-canh-bao");
    if ($("canh-bao-tieu-de").textContent === "Lỗi cấu hình") {
      hop.hidden = true;
    }
  }

  function veTongQuan(kqDien, kqNuoc, doiChieu, thucThu, hopPhap) {
    $("so-hop-phap").textContent = X.dinhDangTien(hopPhap);
    $("so-thuc-thu").textContent =
      thucThu > 0 ? X.dinhDangTien(thucThu) : "chưa nhập";

    const oChenh = $("so-chenh-lech");
    if (!doiChieu) {
      oChenh.textContent = "—";
      oChenh.className = "o-so__gia-tri";
      $("hop-canh-bao").hidden = true;
    } else {
      const dau = doiChieu.chenhLech > 0 ? "+" : "";
      oChenh.textContent = dau + X.dinhDangTien(doiChieu.chenhLech);
      oChenh.className =
        "o-so__gia-tri " +
        (doiChieu.mucDo === "THU_VUOT"
          ? "o-so__gia-tri--do"
          : "o-so__gia-tri--xanh");

      const dg = X.dienGiaiDoiChieu(doiChieu);
      const hop = $("hop-canh-bao");
      hop.hidden = false;
      hop.className =
        "hop-canh-bao " +
        (doiChieu.mucDo === "THU_VUOT"
          ? "hop-canh-bao--do"
          : "hop-canh-bao--xanh");
      $("canh-bao-tieu-de").textContent = dg.tieuDe;
      $("canh-bao-noi-dung").innerHTML = dg.noiDung;
    }

    // Dải thông tin phụ
    const muc = [];
    muc.push(`Điện: <strong>${X.dinhDangTien(kqDien.tongThanhToan)}</strong>`);
    if (kqNuoc) {
      muc.push(`Nước: <strong>${X.dinhDangTien(kqNuoc.tongThanhToan)}</strong>`);
    }
    muc.push(
      `Bình quân điện: <strong>${X.dinhDangTien(kqDien.donGiaBinhQuan)}/kWh</strong>`
    );
    if (kqDien.dinhMuc !== null) {
      muc.push(`Định mức: <strong>${X.dinhDangSo(kqDien.dinhMuc)}</strong>`);
    }
    $("dai-chi-tiet").innerHTML = muc.join("");
  }

  function veKetQuaDien(kq) {
    $("nhan-che-do-dien").textContent =
      kq.cheDo === "LUY_TIEN_THEO_DINH_MUC"
        ? "Lũy tiến theo định mức"
        : "Giá cố định bậc 3";
    $("nhan-che-do-dien").className =
      "nhan " +
      (kq.cheDo === "LUY_TIEN_THEO_DINH_MUC"
        ? "nhan--an-toan"
        : "nhan--canh-bao");

    veDienGiai($("dien-giai-dien"), X.dienGiaiDien(kq));
    veBangBac($("bang-dien"), $("bang-dien-chan"), kq, "kWh");
    $("can-cu-dien").textContent = `Căn cứ: ${kq.canCuBieuGia}`;
  }

  /**
   * So sánh tiền nước chủ trọ thu (kiểu người dùng nhập) với tiền nước
   * tính theo BIỂU GIÁ CHÍNH THỨC của tỉnh được chọn làm chuẩn. Đây là
   * phần "minh bạch" thật: đối chiếu với nguồn độc lập (quyết định của
   * UBND tỉnh), không phải với chính giá chủ trọ.
   */
  function veSoSanhChuanNuoc(kqChuTro, soM3, soNguoiThue, ngayTinh) {
    const maChuan = $("chuan-nuoc").value;
    const hop = $("so-sanh-chuan-nuoc");

    // Không chọn chuẩn, hoặc đang ở kiểu khoán (không so theo m³ được)
    if (!maChuan || kqChuTro.phuongThuc === "KHOAN_DAU_NGUOI") {
      hop.hidden = true;
      return;
    }

    let kqChuan;
    try {
      kqChuan = E.tinhTienNuoc(
        { soM3, soNguoiThue, maDiaPhuong: maChuan, ngayTinh },
        CAU_HINH.nuoc,
        CAU_HINH.vat
      );
    } catch (e) {
      hop.hidden = true;
      return;
    }

    hop.hidden = false;
    $("so-sanh-chuan-tieu-de").textContent =
      "Đối chiếu với biểu giá chính thức: " + kqChuan.tenDiaPhuong;
    $("so-sanh-chu-tro").textContent = X.dinhDangTien(kqChuTro.tongThanhToan);
    $("so-sanh-chuan-nhan").textContent = `Theo ${kqChuan.tenDiaPhuong} (đúng quy định):`;
    $("so-sanh-chuan-gia").textContent = X.dinhDangTien(kqChuan.tongThanhToan);

    const chenh = kqChuTro.tongThanhToan - kqChuan.tongThanhToan;
    const kl = $("so-sanh-ket-luan");
    if (chenh > 0) {
      hop.className = "hop-so-sanh hop-so-sanh--do";
      kl.innerHTML =
        `Chủ trọ đang thu cao hơn biểu giá ${kqChuan.tenDiaPhuong} ` +
        `<strong>${X.dinhDangTien(chenh)}</strong> cho ${X.dinhDangSo(soM3)} m³. ` +
        `Bạn nên đối chiếu lại với chủ trọ.`;
    } else if (chenh < 0) {
      hop.className = "hop-so-sanh hop-so-sanh--xanh";
      kl.innerHTML =
        `Mức chủ trọ thu thấp hơn biểu giá ${kqChuan.tenDiaPhuong} ` +
        `${X.dinhDangTien(Math.abs(chenh))}.`;
    } else {
      hop.className = "hop-so-sanh hop-so-sanh--xanh";
      kl.textContent = `Mức chủ trọ thu khớp với biểu giá ${kqChuan.tenDiaPhuong}.`;
    }
  }

  function veKetQuaNuoc(kq) {
    const ten = {
      BAC_THANG_DINH_MUC: "Lũy tiến theo định mức",
      GIA_PHANG: "Giá phẳng",
      KHOAN_DAU_NGUOI: "Khoán đầu người",
    };
    $("nhan-che-do-nuoc").textContent = ten[kq.phuongThuc] || kq.phuongThuc;
    $("nhan-che-do-nuoc").className =
      "nhan " +
      (kq.phuongThuc === "BAC_THANG_DINH_MUC"
        ? "nhan--an-toan"
        : "nhan--canh-bao");

    veDienGiai($("dien-giai-nuoc"), X.dienGiaiNuoc(kq));
    veBangBac($("bang-nuoc"), $("bang-nuoc-chan"), kq, "m³");

    // Đối chiếu đơn giá bình quân với khung giá nhà nước (Thông tư 44/2021)
    let canCu = `${kq.tenDiaPhuong} — ${kq.canCu}`;
    const tran = CAU_HINH.phapLy.khungGiaNuoc
      ? CAU_HINH.phapLy.khungGiaNuoc.tranCaoNhat
      : null;
    if (tran && kq.donGiaBinhQuan && kq.donGiaBinhQuan > tran) {
      canCu +=
        ` ⚠️ Đơn giá bình quân ${X.dinhDangTien(kq.donGiaBinhQuan)}/m³ VƯỢT mức ` +
        `trần cao nhất toàn quốc (${X.dinhDangTien(tran)}/m³ theo Thông tư ` +
        `44/2021/TT-BTC) — gần như chắc chắn cao hơn giá nhà nước cho phép.`;
    } else if (kq.donGiaBinhQuan) {
      canCu += ` Đơn giá bình quân: ${X.dinhDangTien(kq.donGiaBinhQuan)}/m³.`;
    }
    $("can-cu-nuoc").textContent = canCu;
  }

  function veDienGiai(oChua, cacBuoc) {
    oChua.innerHTML = "";
    cacBuoc.forEach((b) => {
      const li = document.createElement("li");
      li.innerHTML =
        `<span class="buoc__tieu-de">${b.tieuDe}</span>` + b.noiDung;
      oChua.appendChild(li);
    });
  }

  /** Vẽ bảng phân bổ theo bậc, dùng chung cho điện và nước. */
  function veBangBac(tbody, tfoot, kq, donVi) {
    tbody.innerHTML = "";
    kq.chiTiet.forEach((c) => {
      const tr = document.createElement("tr");
      tr.className = c.suDung ? "dang-dung" : "khong-dung";
      const khung =
        c.denMuc === null
          ? `trên ${X.dinhDangSo(c.tuMuc)}`
          : `${X.dinhDangSo(c.tuMuc)} – ${X.dinhDangSo(c.denMuc)}`;
      tr.innerHTML =
        `<td>${c.bac}</td>` +
        `<td>${khung} <span class="ghi-chu-nho">${c.tenBac}</span></td>` +
        `<td class="phai">${c.donGia.toLocaleString("vi-VN")}</td>` +
        `<td class="phai">${X.dinhDangSo(c.sanLuong)}</td>` +
        `<td class="phai">${c.thanhTien.toLocaleString("vi-VN")}</td>`;
      tbody.appendChild(tr);
    });

    const dong = [];
    dong.push(
      `<tr><td colspan="4">Cộng trước thuế</td><td class="phai">${kq.tienTruocThue.toLocaleString(
        "vi-VN"
      )}</td></tr>`
    );
    if (kq.phiMoiTruong) {
      dong.push(
        `<tr><td colspan="4">Phí bảo vệ môi trường (${X.phanTram(
          kq.tyLePhiMoiTruong
        )})</td><td class="phai">${kq.phiMoiTruong.toLocaleString(
          "vi-VN"
        )}</td></tr>`
      );
    }
    dong.push(
      `<tr><td colspan="4">Thuế GTGT (${X.phanTram(
        kq.thueSuat
      )})</td><td class="phai">${kq.tienThue.toLocaleString("vi-VN")}</td></tr>`
    );
    dong.push(
      `<tr><td colspan="4">TỔNG PHẢI TRẢ</td><td class="phai">${kq.tongThanhToan.toLocaleString(
        "vi-VN"
      )}</td></tr>`
    );
    tfoot.innerHTML = dong.join("");
  }

  // ----------------------------------------------------------------
  // XUẤT BẢN ĐỐI CHIẾU DẠNG VĂN BẢN
  // ----------------------------------------------------------------
  function taoVanBanDoiChieu() {
    if (!ketQuaCuoi) return "";
    const { kqDien, kqNuoc, doiChieu } = ketQuaCuoi;
    const d = [];

    d.push("BẢN ĐỐI CHIẾU CHI PHÍ ĐIỆN NƯỚC NHÀ TRỌ");
    d.push(`Kỳ tính: ${$("ngay-tinh").value}`);
    d.push("");
    d.push(`TIỀN ĐIỆN — ${kqDien.soKwh} kWh, ${kqDien.soNguoiThue || "?"} người`);
    if (kqDien.dinhMuc !== null) {
      d.push(`Định mức áp dụng: ${kqDien.dinhMuc}`);
    }
    kqDien.chiTiet
      .filter((c) => c.suDung)
      .forEach((c) => {
        d.push(
          `  Bậc ${c.bac}: ${c.sanLuong} kWh × ${c.donGia.toLocaleString(
            "vi-VN"
          )} = ${c.thanhTien.toLocaleString("vi-VN")} đ`
        );
      });
    d.push(`  Trước thuế: ${kqDien.tienTruocThue.toLocaleString("vi-VN")} đ`);
    d.push(`  Thuế GTGT: ${kqDien.tienThue.toLocaleString("vi-VN")} đ`);
    d.push(`  Tổng: ${kqDien.tongThanhToan.toLocaleString("vi-VN")} đ`);
    d.push(`  Căn cứ: ${kqDien.canCuBieuGia}`);

    if (kqNuoc) {
      d.push("");
      d.push(`TIỀN NƯỚC — ${kqNuoc.tenDiaPhuong}, ${kqNuoc.soM3} m³`);
      d.push(`  Tổng: ${kqNuoc.tongThanhToan.toLocaleString("vi-VN")} đ`);
    }

    if (doiChieu) {
      d.push("");
      d.push("ĐỐI CHIẾU");
      d.push(`  Chủ trọ thu: ${doiChieu.soTienThucThu.toLocaleString("vi-VN")} đ`);
      d.push(`  Theo quy định: ${doiChieu.soTienHopPhap.toLocaleString("vi-VN")} đ`);
      d.push(`  Chênh lệch: ${doiChieu.chenhLech.toLocaleString("vi-VN")} đ`);
    }

    d.push("");
    d.push("Tạo bởi công cụ nguồn mở minh bạch chi phí điện nước nhà trọ.");
    d.push("Đây là bản tham khảo, không thay thế hóa đơn chính thức.");
    return d.join("\n");
  }

  // ----------------------------------------------------------------
  // TAB VÀ KIỂM THỬ
  // ----------------------------------------------------------------
  function chuyenTab(ten) {
    document.querySelectorAll(".tab").forEach((t) => {
      t.classList.toggle("tab--dang-chon", t.dataset.tab === ten);
    });
    ["tinh-toan", "quy-dinh", "kiem-thu"].forEach((t) => {
      $("tab-" + t).hidden = t !== ten;
    });
  }

  function chayKiemThu() {
    const o = $("ket-qua-test");
    o.innerHTML = "";

    const danhSach = window.TestCases.taoDanhSachTest(E, {
      bieuGia: CAU_HINH.bieuGia,
      vat: CAU_HINH.vat,
      nuoc: CAU_HINH.nuoc,
    });

    let pass = 0;
    danhSach.forEach((t) => {
      let loi = null;
      try {
        t.chay();
        pass++;
      } catch (err) {
        loi = err.message;
      }

      const div = document.createElement("div");
      div.className = "dong-test " + (loi ? "dong-test--fail" : "dong-test--pass");
      div.innerHTML =
        `<span class="dong-test__ky-hieu">${loi ? "✕" : "✓"}</span>` +
        `<div><div><strong>${t.nhom}</strong> — ${t.ten}</div>` +
        (loi ? `<div class="dong-test__chi-tiet">${loi}</div>` : "") +
        `</div>`;
      o.appendChild(div);
    });

    const tomTat = document.createElement("div");
    tomTat.className = "tom-tat-test";
    tomTat.textContent = `${pass}/${danhSach.length} ca kiểm thử PASS`;
    o.appendChild(tomTat);
  }

  // ----------------------------------------------------------------
  // GẮN SỰ KIỆN
  // ----------------------------------------------------------------
  function ganSuKien() {
    $("bieu-mau").addEventListener("submit", (e) => {
      e.preventDefault();
      tinhToan();
    });

    // Các ô điện gốc. Phần nhập liệu thân thiện (đọc chỉ số, cách chủ
    // trọ thu) được src/hop-nhat.js đồng bộ vào hai ô này trước khi gọi lại.
    ["so-kwh", "so-nguoi", "tien-chu-tro-thu-dien"].forEach((id) =>
      $(id).addEventListener("input", tinhToan)
    );
    document
      .querySelectorAll('input[name="keKhai"]')
      .forEach((r) => r.addEventListener("change", tinhToan));

    $("ngay-tinh").addEventListener("change", () => {
      veBieuGiaGoc();
      tinhToan();
    });

    $("nut-tinh-tu-don-gia").addEventListener("click", () => {
      const donGia = prompt(
        "Chủ trọ thu bao nhiêu đồng mỗi kWh?\n(Ví dụ mức phổ biến: 4000)",
        "4000"
      );
      if (donGia === null) return;
      const g = Number(donGia);
      if (!Number.isFinite(g) || g < 0) {
        alert("Đơn giá không hợp lệ.");
        return;
      }
      $("tien-chu-tro-thu-dien").value = Math.round(
        g * (Number($("so-kwh").value) || 0)
      );
      tinhToan();
    });

    $("nut-dat-lai").addEventListener("click", () => {
      setTimeout(() => {
        $("ngay-tinh").value = new Date().toISOString().slice(0, 10);
        tinhToan();
      }, 0);
    });

    $("nut-in").addEventListener("click", () => window.print());

    $("nut-sao-chep").addEventListener("click", async () => {
      const vb = taoVanBanDoiChieu();
      if (!vb) return;
      try {
        await navigator.clipboard.writeText(vb);
        $("nut-sao-chep").textContent = "Đã sao chép";
        setTimeout(
          () => ($("nut-sao-chep").textContent = "Sao chép bản đối chiếu"),
          1800
        );
      } catch {
        // Trình duyệt chặn clipboard: mở cửa sổ để người dùng tự chọn và copy
        const w = window.open("", "_blank");
        w.document.write("<pre>" + vb.replace(/</g, "&lt;") + "</pre>");
      }
    });

    document.querySelectorAll(".tab").forEach((t) => {
      t.addEventListener("click", () => chuyenTab(t.dataset.tab));
    });

    $("nut-chay-test").addEventListener("click", chayKiemThu);
  }

  // ----------------------------------------------------------------
  // KHỞI ĐỘNG
  // ----------------------------------------------------------------
  (async function khoiDong() {
    ganSuKien();
    const ok = await napCauHinh();
    if (!ok) return;
    dungGiaoDienTuCauHinh();
    tinhToan();
  })();
})();
