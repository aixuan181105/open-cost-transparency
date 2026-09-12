/* ==================================================================
   water-engine.js — LÕI TÍNH TIỀN NƯỚC VÀ ĐỐI CHIẾU
   ------------------------------------------------------------------
   Nguyên tắc: file này KHÔNG biết gì về DOM, không đọc file, không
   fetch. Nó chỉ nhận dữ liệu thuần và trả về kết quả + diễn giải.
   Nhờ vậy chạy được cả trong trình duyệt và trong Node.js (để test).

   Toàn bộ con số pháp lý nằm ở config/water-rates.json, không nằm ở đây.
   ================================================================== */
(function () {
  'use strict';

  var PHIEN_BAN = '2.0.0';

  /* ---------- Tiện ích ---------- */

  function laSo(x) {
    return typeof x === 'number' && isFinite(x);
  }

  function veSo(x, macDinh) {
    var n = typeof x === 'string' ? parseFloat(x.replace(/[^\d.-]/g, '')) : x;
    return laSo(n) ? n : (macDinh === undefined ? 0 : macDinh);
  }

  function lamTron(x) {
    return Math.round(x);
  }

  function dinhDangTien(x) {
    return lamTron(x).toLocaleString('vi-VN') + 'đ';
  }

  function dinhDangSo(x) {
    return (Math.round(x * 100) / 100).toLocaleString('vi-VN');
  }

  /* ---------- Chọn địa phương / cách thu ---------- */

  function chonDiaPhuong(cauHinh, ma) {
    var ds = (cauHinh && cauHinh.diaPhuong) || [];
    for (var i = 0; i < ds.length; i++) {
      if (ds[i].ma === ma) return ds[i];
    }
    for (var j = 0; j < ds.length; j++) {
      if (ds[j].ma === cauHinh.diaPhuongMacDinh) return ds[j];
    }
    return ds[0] || null;
  }

  function chonCachThu(cauHinh, ma) {
    var ds = (cauHinh && cauHinh.cachChuTroThu) || [];
    for (var i = 0; i < ds.length; i++) {
      if (ds[i].ma === ma) return ds[i];
    }
    return ds[0] || null;
  }

  /* ---------- Quy đổi chỉ số đồng hồ sang m³ ---------- */

  /**
   * @returns {{ok:boolean, soM3:number, loi:string|null}}
   */
  function m3TuChiSo(chiSoDau, chiSoCuoi) {
    var dau = veSo(chiSoDau, NaN);
    var cuoi = veSo(chiSoCuoi, NaN);

    if (!laSo(dau) || !laSo(cuoi)) {
      return { ok: false, soM3: 0, loi: 'Chưa nhập đủ chỉ số đầu kỳ và cuối kỳ.' };
    }
    if (dau < 0 || cuoi < 0) {
      return { ok: false, soM3: 0, loi: 'Chỉ số đồng hồ không thể là số âm.' };
    }
    if (cuoi < dau) {
      return {
        ok: false,
        soM3: 0,
        loi: 'Chỉ số cuối kỳ (' + dinhDangSo(cuoi) + ') nhỏ hơn chỉ số đầu kỳ (' +
             dinhDangSo(dau) + '). Hãy kiểm tra lại hai con số, hoặc đồng hồ đã bị thay/quay vòng.'
      };
    }
    return { ok: true, soM3: Math.round((cuoi - dau) * 1000) / 1000, loi: null };
  }

  /* ==================================================================
     1) TÍNH SỐ TIỀN ĐÚNG THEO QUY ĐỊNH CỦA NHÀ NƯỚC
     ================================================================== */

  /**
   * @param {{soM3:number, soNguoi:number, coDinhMuc:boolean, donGiaTuNhap:number=}} dauVao
   * @param {object} dp  một phần tử trong config.diaPhuong
   */
  function tinhTheoQuyDinh(dauVao, dp) {
    var soM3 = Math.max(0, veSo(dauVao.soM3, 0));
    var soNguoi = Math.max(1, Math.floor(veSo(dauVao.soNguoi, 1)));
    var coDinhMuc = dauVao.coDinhMuc !== false;

    var bang = [];
    var canhBao = [];

    if (!dp) {
      return { loi: 'Chưa nạp được cấu hình biểu giá nước.' };
    }

    /* --- Trường hợp địa phương chưa có biểu giá: người dùng tự nhập đơn giá --- */
    if (dp.phuongThuc === 'nguoiDungNhapDonGia') {
      var dgTuNhap = Math.max(0, veSo(dauVao.donGiaTuNhap, 0));
      bang.push({
        ten: 'Đơn giá trên hóa đơn',
        khung: 'Toàn bộ sản lượng',
        donGia: dgTuNhap,
        luong: soM3,
        thanhTien: lamTron(soM3 * dgTuNhap),
        apDung: soM3 > 0
      });
      canhBao.push('Địa phương này chưa có biểu giá bậc thang trong cấu hình, nên kết quả chỉ chính xác bằng đơn giá bạn nhập.');
    }

    /* --- Trường hợp chưa được cấp định mức: áp một đơn giá bậc cao --- */
    else if (!coDinhMuc) {
      var qd = dp.khiChuaCoDinhMuc || {};
      var chiSoBac = Math.max(1, veSo(qd.bacApDung, dp.bac.length)) - 1;
      var bacAp = dp.bac[Math.min(chiSoBac, dp.bac.length - 1)];
      bang.push({
        ten: bacAp.ten + ' (áp cho toàn bộ sản lượng)',
        khung: 'Không được chia bậc',
        donGia: bacAp.donGia,
        luong: soM3,
        thanhTien: lamTron(soM3 * bacAp.donGia),
        apDung: soM3 > 0
      });
      canhBao.push('Thuê bao chưa được cấp định mức nhân khẩu nên toàn bộ sản lượng bị áp đơn giá ' +
                   bacAp.ten.toLowerCase() + '. Đăng ký tạm trú và xin cấp định mức sẽ hạ được con số này.');
    }

    /* --- Trường hợp chuẩn: lũy tiến theo định mức nhân khẩu --- */
    else {
      var conLai = soM3;
      var tranTruoc = 0;
      for (var i = 0; i < dp.bac.length; i++) {
        var b = dp.bac[i];
        var tran = (b.denM3MoiNguoi === null || b.denM3MoiNguoi === undefined)
          ? Infinity
          : b.denM3MoiNguoi * soNguoi;
        var doRong = tran - tranTruoc;
        var luong = Math.max(0, Math.min(conLai, doRong));

        bang.push({
          ten: b.ten,
          khung: tran === Infinity
            ? 'Trên ' + dinhDangSo(tranTruoc) + ' m³'
            : dinhDangSo(tranTruoc) + ' – ' + dinhDangSo(tran) + ' m³',
          donGia: b.donGia,
          luong: Math.round(luong * 1000) / 1000,
          thanhTien: lamTron(luong * b.donGia),
          apDung: luong > 0
        });

        conLai -= luong;
        tranTruoc = tran;
      }
    }

    /* --- Cộng dồn, phụ phí, thuế --- */
    var tienNuoc = 0;
    for (var k = 0; k < bang.length; k++) tienNuoc += bang[k].thanhTien;

    var dsPhuPhi = [];
    var tongPhuPhi = 0;
    var dsPhu = dp.phuPhi || [];
    for (var p = 0; p < dsPhu.length; p++) {
      var pp = dsPhu[p];
      var tien = lamTron(tienNuoc * veSo(pp.tyLeTrenTienNuoc, 0));
      var thue = lamTron(tien * veSo(pp.vat, 0));
      dsPhuPhi.push({
        ma: pp.ma,
        ten: pp.ten,
        tyLe: veSo(pp.tyLeTrenTienNuoc, 0),
        tien: tien,
        tyLeVat: veSo(pp.vat, 0),
        tienVat: thue,
        canCu: pp.canCu || ''
      });
      tongPhuPhi += tien + thue;
    }

    var tyLeVatNuoc = veSo(dp.vatNuocSach, 0);
    var vatNuoc = lamTron(tienNuoc * tyLeVatNuoc);
    var tong = tienNuoc + vatNuoc + tongPhuPhi;

    return {
      loi: null,
      soM3: soM3,
      soNguoi: soNguoi,
      coDinhMuc: coDinhMuc,
      dinhMucBac1: (dp.bac && dp.bac[0] && dp.bac[0].denM3MoiNguoi) ? dp.bac[0].denM3MoiNguoi * soNguoi : null,
      bang: bang,
      tienNuoc: tienNuoc,
      tyLeVatNuoc: tyLeVatNuoc,
      vatNuoc: vatNuoc,
      phuPhi: dsPhuPhi,
      tong: tong,
      donGiaBinhQuan: soM3 > 0 ? tong / soM3 : 0,
      canhBao: canhBao,
      canCu: dp.canCu || []
    };
  }

  /* ==================================================================
     2) TÍNH SỐ TIỀN CHỦ TRỌ ĐANG THU — từ CÁCH THU, không bắt người
        dùng tự nhân chia
     ================================================================== */

  /**
   * @param {{cach:string, thongSo:number, soM3:number, soNguoi:number}} dauVao
   * @param {object} ketQuaQuyDinh kết quả của tinhTheoQuyDinh (dùng cho cách "theoHoaDon")
   */
  function tinhTheoChuTro(dauVao, ketQuaQuyDinh) {
    var cach = dauVao.cach || 'theoM3';
    var thongSo = Math.max(0, veSo(dauVao.thongSo, 0));
    var soM3 = Math.max(0, veSo(dauVao.soM3, 0));
    var soNguoi = Math.max(1, Math.floor(veSo(dauVao.soNguoi, 1)));

    var tong = 0;
    var congThuc = '';

    switch (cach) {
      case 'theoM3':
        tong = lamTron(soM3 * thongSo);
        congThuc = dinhDangSo(soM3) + ' m³ × ' + dinhDangTien(thongSo) + '/m³';
        break;

      case 'dauNguoi':
        tong = lamTron(soNguoi * thongSo);
        congThuc = soNguoi + ' người × ' + dinhDangTien(thongSo) + '/người';
        break;

      case 'caPhong':
        tong = lamTron(thongSo);
        congThuc = 'khoán ' + dinhDangTien(thongSo) + ' cho cả phòng';
        break;

      case 'theoHoaDon':
        tong = ketQuaQuyDinh && !ketQuaQuyDinh.loi ? ketQuaQuyDinh.tong : 0;
        congThuc = 'chia lại đúng theo hóa đơn nước';
        break;

      case 'tongTien':
      default:
        tong = lamTron(thongSo);
        congThuc = 'tổng tiền ghi trên giấy thu';
        break;
    }

    return {
      cach: cach,
      tong: tong,
      congThuc: congThuc,
      donGiaBinhQuan: soM3 > 0 ? tong / soM3 : 0
    };
  }

  /* ==================================================================
     3) ĐỐI CHIẾU
     ================================================================== */

  function doiChieu(tongChuTro, tongQuyDinh, cauHinh) {
    var nguong = (cauHinh && cauHinh.nguongCoiLaPhuHop) || { tyLe: 0.02, soTienToiThieu: 2000 };
    var chenh = tongChuTro - tongQuyDinh;
    var nguongLech = Math.max(veSo(nguong.soTienToiThieu, 2000), tongQuyDinh * veSo(nguong.tyLe, 0.02));
    var tyLe = tongQuyDinh > 0 ? tongChuTro / tongQuyDinh : null;

    var mucDo, tieuDe, noiDung;

    if (tongQuyDinh <= 0) {
      mucDo = 'thieu-du-lieu';
      tieuDe = 'Chưa đủ dữ liệu để đối chiếu';
      noiDung = 'Hãy nhập số m³ nước đã dùng trong kỳ (hoặc chỉ số đồng hồ đầu – cuối).';
    } else if (Math.abs(chenh) <= nguongLech) {
      mucDo = 'phu-hop';
      tieuDe = 'Mức thu phù hợp quy định';
      noiDung = 'Số tiền chủ trọ thu lệch không đáng kể so với mức đúng theo quy định (' +
                dinhDangTien(Math.abs(chenh)) + '), nằm trong khoảng sai số do làm tròn.';
    } else if (chenh > 0) {
      mucDo = 'cao-hon';
      tieuDe = 'Chủ trọ đang thu cao hơn quy định ' + dinhDangTien(chenh);
      noiDung = 'Mức thu bằng khoảng ' + (Math.round(tyLe * 100) / 100).toLocaleString('vi-VN') +
                ' lần số tiền đúng theo quy định. Phần thu thêm trong kỳ này là ' + dinhDangTien(chenh) + '.';
    } else {
      mucDo = 'thap-hon';
      tieuDe = 'Chủ trọ đang thu thấp hơn quy định ' + dinhDangTien(-chenh);
      noiDung = 'Trường hợp này chủ trọ đang bù một phần chi phí, không phải là thu sai. ' +
                'Cũng có thể bạn nhập thiếu số m³ hoặc thiếu số người.';
    }

    return {
      tongChuTro: tongChuTro,
      tongQuyDinh: tongQuyDinh,
      chenhLech: chenh,
      tyLe: tyLe,
      nguongLech: lamTron(nguongLech),
      mucDo: mucDo,
      tieuDe: tieuDe,
      noiDung: noiDung
    };
  }

  /* ==================================================================
     4) DIỄN GIẢI TỪNG BƯỚC
     ================================================================== */

  function dienGiai(kqQuyDinh, kqChuTro, kqDoiChieu, dp) {
    var buoc = [];

    if (!kqQuyDinh || kqQuyDinh.loi) return buoc;

    buoc.push('Lượng nước dùng trong kỳ: ' + dinhDangSo(kqQuyDinh.soM3) + ' m³, phòng có ' +
              kqQuyDinh.soNguoi + ' người.');

    if (kqQuyDinh.coDinhMuc && kqQuyDinh.dinhMucBac1) {
      buoc.push('Định mức giá thấp nhất: ' + dp.bac[0].denM3MoiNguoi + ' m³/người/tháng × ' +
                kqQuyDinh.soNguoi + ' người = ' + dinhDangSo(kqQuyDinh.dinhMucBac1) +
                ' m³ được hưởng đơn giá bậc 1.');
    } else if (!kqQuyDinh.coDinhMuc) {
      buoc.push('Chưa được cấp định mức nhân khẩu nên không được chia bậc: toàn bộ sản lượng bị áp một đơn giá cao.');
    }

    var doanBac = [];
    for (var i = 0; i < kqQuyDinh.bang.length; i++) {
      var h = kqQuyDinh.bang[i];
      if (h.luong > 0) {
        doanBac.push(dinhDangSo(h.luong) + ' m³ × ' + dinhDangTien(h.donGia) + ' = ' + dinhDangTien(h.thanhTien));
      }
    }
    if (doanBac.length === 1) {
      buoc.push('Tiền nước sạch: ' + doanBac[0] + '.');
    } else if (doanBac.length > 1) {
      buoc.push('Tiền nước sạch: ' + doanBac.join('; ') + '. Cộng lại là ' +
                dinhDangTien(kqQuyDinh.tienNuoc) + '.');
    }

    for (var p = 0; p < kqQuyDinh.phuPhi.length; p++) {
      var pp = kqQuyDinh.phuPhi[p];
      buoc.push(pp.ten + ': ' + Math.round(pp.tyLe * 100) + '% × ' + dinhDangTien(kqQuyDinh.tienNuoc) +
                ' = ' + dinhDangTien(pp.tien) +
                (pp.tienVat > 0 ? ', thuế GTGT ' + Math.round(pp.tyLeVat * 100) + '% = ' + dinhDangTien(pp.tienVat) : '') + '.');
    }

    if (kqQuyDinh.vatNuoc > 0) {
      buoc.push('Thuế GTGT nước sạch: ' + Math.round(kqQuyDinh.tyLeVatNuoc * 100) + '% × ' +
                dinhDangTien(kqQuyDinh.tienNuoc) + ' = ' + dinhDangTien(kqQuyDinh.vatNuoc) + '.');
    }

    buoc.push('Tổng phải trả theo quy định: ' + dinhDangTien(kqQuyDinh.tong) +
              (kqQuyDinh.soM3 > 0 ? ' — tương đương ' + dinhDangTien(kqQuyDinh.donGiaBinhQuan) + '/m³.' : '.'));

    if (kqChuTro) {
      buoc.push('Chủ trọ đang thu: ' + kqChuTro.congThuc + ' = ' + dinhDangTien(kqChuTro.tong) +
                (kqQuyDinh.soM3 > 0 && kqChuTro.cach !== 'theoHoaDon'
                  ? ' — tương đương ' + dinhDangTien(kqChuTro.donGiaBinhQuan) + '/m³.'
                  : '.'));
    }

    if (kqDoiChieu) {
      buoc.push('Đối chiếu: ' + kqDoiChieu.tieuDe + '.');
    }

    return buoc;
  }

  /* ==================================================================
     5) HÀM GỌI MỘT LẦN — dùng cho giao diện và cho test
     ================================================================== */

  /**
   * @param {{
   *   maDiaPhuong:string,
   *   soM3:number=, chiSoDau:number=, chiSoCuoi:number=, dungChiSo:boolean=,
   *   soNguoi:number, coDinhMuc:boolean,
   *   donGiaTuNhap:number=,
   *   cachChuTroThu:string, thongSoChuTro:number
   * }} dauVao
   */
  function tinhVaDoiChieu(dauVao, cauHinh) {
    var dp = chonDiaPhuong(cauHinh, dauVao.maDiaPhuong);

    var soM3 = veSo(dauVao.soM3, 0);
    var loiChiSo = null;
    if (dauVao.dungChiSo) {
      var r = m3TuChiSo(dauVao.chiSoDau, dauVao.chiSoCuoi);
      soM3 = r.soM3;
      loiChiSo = r.loi;
    }

    var kqQuyDinh = tinhTheoQuyDinh({
      soM3: soM3,
      soNguoi: dauVao.soNguoi,
      coDinhMuc: dauVao.coDinhMuc,
      donGiaTuNhap: dauVao.donGiaTuNhap
    }, dp);

    var kqChuTro = tinhTheoChuTro({
      cach: dauVao.cachChuTroThu,
      thongSo: dauVao.thongSoChuTro,
      soM3: soM3,
      soNguoi: dauVao.soNguoi
    }, kqQuyDinh);

    var kqDoiChieu = doiChieu(kqChuTro.tong, kqQuyDinh.tong, cauHinh);

    return {
      diaPhuong: dp,
      soM3: soM3,
      loiChiSo: loiChiSo,
      quyDinh: kqQuyDinh,
      chuTro: kqChuTro,
      doiChieu: kqDoiChieu,
      dienGiai: dienGiai(kqQuyDinh, kqChuTro, kqDoiChieu, dp)
    };
  }

  /* ---------- Xuất API ---------- */

  var api = {
    PHIEN_BAN: PHIEN_BAN,
    chonDiaPhuong: chonDiaPhuong,
    chonCachThu: chonCachThu,
    m3TuChiSo: m3TuChiSo,
    tinhTheoQuyDinh: tinhTheoQuyDinh,
    tinhTheoChuTro: tinhTheoChuTro,
    doiChieu: doiChieu,
    dienGiai: dienGiai,
    tinhVaDoiChieu: tinhVaDoiChieu,
    dinhDangTien: dinhDangTien,
    dinhDangSo: dinhDangSo
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (typeof window !== 'undefined') window.WaterEngine = api;
})();
