/* ==================================================================
   hop-nhat.js — TẦNG HỢP NHẤT ĐIỆN + NƯỚC TRÊN CÙNG MỘT TRANG
   ------------------------------------------------------------------
   File này KHÔNG chứa công thức tính tiền. Nó làm 4 việc:

     A. Dựng các ô chọn từ config/water-rates.json.
     B. Chuyển đổi ô nhập thân thiện → ô nhập gốc mà app.js đang đọc:
          chỉ số đồng hồ điện  → #so-kwh
          cách chủ trọ thu điện → #tien-chu-tro-thu-dien
        rồi phát sự kiện input để app.js chạy y như trước.
     C. Tính và vẽ toàn bộ phần nước (gọi src/water-engine.js).
     D. Cộng phần nước vào bảng Tổng quan mà app.js vừa ghi ra.

   app.js và pricing-engine.js vẫn chỉ xử lý phần điện. Mọi id cũ được
   giữ nguyên trong DOM, checkbox #bat-tinh-nuoc cũ luôn để trống nên
   nhánh nước cũ không chạy — bảng Tổng quan do app.js ghi ra luôn là
   số của riêng phần điện, và file này cộng thêm phần nước vào đó.
   ================================================================== */
(function () {
  'use strict';

  var DUONG_DAN_CAU_HINH = 'config/water-rates.json?v=2.0.0';

  var cauHinh = null;
  var kqNuoc = null;

  /* Số của RIÊNG phần điện, đọc lại từ bảng Tổng quan sau khi app.js ghi */
  var goc = { thucThu: null, hopPhap: null };

  /* ---------------- Tiện ích DOM ---------------- */

  function $(id) { return document.getElementById(id); }

  function hien(el, co) { if (el) el.hidden = !co; }

  function dat(id, chuoi) {
    var el = $(id);
    if (el) el.textContent = chuoi;
  }

  function so(id, macDinh) {
    var el = $(id);
    if (!el || el.value === '') return macDinh === undefined ? 0 : macDinh;
    var n = parseFloat(el.value);
    return isFinite(n) ? n : (macDinh === undefined ? 0 : macDinh);
  }

  function radio(ten) {
    var ds = document.querySelectorAll('input[name="' + ten + '"]');
    for (var i = 0; i < ds.length; i++) if (ds[i].checked) return ds[i].value;
    return null;
  }

  /** Ghi giá trị vào ô gốc của app.js rồi báo cho app.js biết đã đổi. */
  function ghiVaoOGoc(id, giaTri) {
    var el = $(id);
    if (!el) return;
    var moi = String(Math.round(giaTri));
    if (el.value === moi) return;
    el.value = moi;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  /** Đọc số tiền đã định dạng ("110.470đ") ngược về số. */
  function docTien(id) {
    var el = $(id);
    if (!el) return null;
    var t = (el.textContent || '').replace(/[^\d-]/g, '');
    if (t === '' || t === '-') return null;
    var n = parseInt(t, 10);
    return isFinite(n) ? n : null;
  }

  function tien(x) {
    return Math.round(x).toLocaleString('vi-VN') + 'đ';
  }

  function soLe(x) {
    return (Math.round(x * 100) / 100).toLocaleString('vi-VN');
  }

  /* ==================================================================
     A. DỰNG CÁC Ô CHỌN TỪ CẤU HÌNH
     ================================================================== */

  function dungOChon() {
    var oDp = $('nuoc-dia-phuong');
    if (oDp) {
      oDp.innerHTML = '';
      cauHinh.diaPhuong.forEach(function (dp) {
        var o = document.createElement('option');
        o.value = dp.ma;
        o.textContent = dp.ten;
        if (dp.ma === cauHinh.diaPhuongMacDinh) o.selected = true;
        oDp.appendChild(o);
      });
    }

    var oNuoc = $('cach-chu-tro-thu-nuoc');
    if (oNuoc) {
      oNuoc.innerHTML = '';
      cauHinh.cachChuTroThu.forEach(function (c) {
        var o = document.createElement('option');
        o.value = c.ma;
        o.textContent = c.ten;
        oNuoc.appendChild(o);
      });
    }

    var oDien = $('cach-chu-tro-thu-dien');
    if (oDien) {
      oDien.innerHTML = '';
      (cauHinh.cachChuTroThuDien || []).forEach(function (c) {
        var o = document.createElement('option');
        o.value = c.ma;
        o.textContent = c.ten;
        oDien.appendChild(o);
      });
    }
  }

  function timCach(ds, ma) {
    for (var i = 0; i < (ds || []).length; i++) if (ds[i].ma === ma) return ds[i];
    return (ds || [])[0] || null;
  }

  /** Hiện/ẩn ô thông số và đổi nhãn theo cách thu đang chọn. */
  function dongBoOThongSo(dsCach, idSelect, idKhoi, idNhan, idDonVi, idInput, idGhiChu, tenDonViSanLuong) {
    var cach = timCach(dsCach, $(idSelect) ? $(idSelect).value : null);
    if (!cach) return null;

    if (cach.khongCanThongSo) {
      hien($(idKhoi), false);
      dat(idGhiChu, 'Chủ trọ chia lại đúng số tiền trên hóa đơn — chênh lệch bằng 0.');
    } else {
      hien($(idKhoi), true);
      dat(idNhan, cach.nhanThongSo);
      dat(idDonVi, cach.donVi || '');
      var inp = $(idInput);
      if (inp) {
        inp.step = cach.buocNhap || 1000;
        if (inp.dataset.maCach !== cach.ma) {
          inp.value = cach.giaTriGoiY != null ? cach.giaTriGoiY : '';
          inp.dataset.maCach = cach.ma;
        }
      }
      dat(idGhiChu, cach.canSanLuong === false
        ? 'Cách thu này không phụ thuộc ' + tenDonViSanLuong +
          ', nhưng vẫn cần con số đó để biết mức đúng theo quy định.'
        : 'Lấy đúng con số ghi trên giấy thu hoặc bảng thông báo của nhà trọ.');
    }
    return cach;
  }

  /* ==================================================================
     B. CHUYỂN ĐỔI Ô NHẬP PHẦN ĐIỆN
     ================================================================== */

  function dongBoDien() {
    var dungChiSo = radio('cachNhapDien') === 'chiSo';
    hien($('o-nhap-kwh'), !dungChiSo);
    hien($('o-nhap-chi-so-dien'), dungChiSo);

    /* Chỉ số đồng hồ → #so-kwh */
    if (dungChiSo) {
      var dau = $('chi-so-dien-dau');
      var cuoi = $('chi-so-dien-cuoi');
      var coDu = dau && cuoi && dau.value !== '' && cuoi.value !== '';
      if (!coDu) {
        dat('ghi-chu-kwh', 'Nhập chỉ số đầu kỳ và cuối kỳ ghi trên đồng hồ điện.');
      } else {
        var kwh = so('chi-so-dien-cuoi') - so('chi-so-dien-dau');
        if (kwh < 0) {
          dat('ghi-chu-kwh', 'Chỉ số cuối kỳ nhỏ hơn chỉ số đầu kỳ. Hãy kiểm tra lại hai con số.');
        } else {
          dat('ghi-chu-kwh', 'Đã dùng ' + soLe(kwh) + ' kWh trong kỳ (chỉ số cuối trừ chỉ số đầu).');
          ghiVaoOGoc('so-kwh', kwh);
        }
      }
    } else {
      dat('ghi-chu-kwh', 'Lấy ở dòng “điện năng tiêu thụ” trên hóa đơn, hoặc chuyển sang đọc chỉ số đồng hồ.');
    }

    /* Cách chủ trọ thu → #tien-chu-tro-thu-dien */
    var cach = dongBoOThongSo(
      cauHinh.cachChuTroThuDien, 'cach-chu-tro-thu-dien', 'o-thong-so-dien',
      'nhan-thong-so-dien', 'don-vi-dien', 'thong-so-chu-tro-dien',
      'ghi-chu-chu-tro-dien', 'số kWh'
    );
    if (!cach) return;

    var kWh = so('so-kwh', 0);
    var soNguoi = Math.max(1, Math.floor(so('so-nguoi', 1)));
    var thongSo = so('thong-so-chu-tro-dien', 0);
    var tongDien = 0;

    switch (cach.ma) {
      case 'theoKwh':  tongDien = kWh * thongSo; break;
      case 'dauNguoi': tongDien = soNguoi * thongSo; break;
      case 'caPhong':  tongDien = thongSo; break;
      default:         tongDien = thongSo; break;
    }
    ghiVaoOGoc('tien-chu-tro-thu-dien', tongDien);
  }

  /* ==================================================================
     C. PHẦN NƯỚC
     ================================================================== */

  function dongBoNuoc() {
    var E = window.WaterEngine;
    var dp = E.chonDiaPhuong(cauHinh, $('nuoc-dia-phuong') ? $('nuoc-dia-phuong').value : null);
    var dungChiSo = radio('cachNhapNuoc') === 'chiSo';

    dat('nuoc-ghi-chu-dia-phuong', dp ? (dp.ghiChuNguoiDung || '') : '');
    hien($('nhom-don-gia-tu-nhap'), dp && dp.phuongThuc === 'nguoiDungNhapDonGia');
    hien($('nhom-dinh-muc-nuoc'), dp && dp.phuongThuc === 'luyTienTheoDinhMuc');
    hien($('o-nhap-m3'), !dungChiSo);
    hien($('o-nhap-chi-so-nuoc'), dungChiSo);

    dongBoOThongSo(
      cauHinh.cachChuTroThu, 'cach-chu-tro-thu-nuoc', 'o-thong-so-nuoc',
      'nhan-thong-so-nuoc', 'don-vi-nuoc', 'thong-so-chu-tro-nuoc',
      'ghi-chu-chu-tro-nuoc', 'số m³'
    );
  }

  function docDauVaoNuoc() {
    var coChiSo = $('chi-so-nuoc-dau') && $('chi-so-nuoc-cuoi') &&
                  $('chi-so-nuoc-dau').value !== '' && $('chi-so-nuoc-cuoi').value !== '';
    return {
      maDiaPhuong: $('nuoc-dia-phuong') ? $('nuoc-dia-phuong').value : null,
      dungChiSo: radio('cachNhapNuoc') === 'chiSo',
      soM3: so('so-m3', 0),
      chiSoDau: coChiSo ? so('chi-so-nuoc-dau', NaN) : NaN,
      chiSoCuoi: coChiSo ? so('chi-so-nuoc-cuoi', NaN) : NaN,
      soNguoi: so('so-nguoi', 1),
      coDinhMuc: $('co-dinh-muc-nuoc') ? $('co-dinh-muc-nuoc').checked : true,
      donGiaTuNhap: so('don-gia-tu-nhap', 0),
      cachChuTroThu: $('cach-chu-tro-thu-nuoc') ? $('cach-chu-tro-thu-nuoc').value : 'theoM3',
      thongSoChuTro: so('thong-so-chu-tro-nuoc', 0)
    };
  }

  function veNuoc(kq) {
    var E = window.WaterEngine;

    var nhan = $('nhan-che-do-nuoc');
    if (nhan) {
      nhan.textContent = kq.quyDinh.coDinhMuc ? 'Có định mức nhân khẩu' : 'Chưa có định mức';
      nhan.className = 'nhan ' + (kq.quyDinh.coDinhMuc ? 'nhan--an-toan' : 'nhan--canh-bao');
    }

    dat('nuoc-chu-tro', tien(kq.chuTro.tong));
    dat('nuoc-quy-dinh', tien(kq.quyDinh.tong));

    var oChenh = $('nuoc-chenh-lech');
    if (oChenh) {
      var c = kq.doiChieu.chenhLech;
      oChenh.textContent = (c > 0 ? '+' : '') + tien(c);
      oChenh.className = 'o-so__gia-tri ' +
        (kq.doiChieu.mucDo === 'cao-hon' ? 'o-so__gia-tri--do'
          : kq.doiChieu.mucDo === 'phu-hop' ? 'o-so__gia-tri--xanh' : '');
    }

    var hop = $('hop-canh-bao-nuoc');
    if (hop) {
      hien(hop, true);
      hop.className = 'hop-canh-bao ' +
        (kq.loiChiSo || kq.doiChieu.mucDo === 'cao-hon' ? 'hop-canh-bao--do'
          : kq.doiChieu.mucDo === 'phu-hop' ? 'hop-canh-bao--xanh' : '');
      dat('canh-bao-nuoc-tieu-de', kq.loiChiSo ? 'Chỉ số đồng hồ chưa hợp lệ' : kq.doiChieu.tieuDe);

      var noiDung = kq.loiChiSo || kq.doiChieu.noiDung;
      if (!kq.loiChiSo && kq.doiChieu.mucDo === 'cao-hon' && cauHinh.canCuKhiThuSai) {
        noiDung += ' ' + cauHinh.canCuKhiThuSai.nuoc;
      }
      if (!kq.loiChiSo && kq.quyDinh.canhBao && kq.quyDinh.canhBao.length) {
        noiDung += ' ' + kq.quyDinh.canhBao.join(' ');
      }
      dat('canh-bao-nuoc-noi-dung', noiDung);
    }

    var ol = $('dien-giai-nuoc');
    if (ol) {
      ol.innerHTML = '';
      kq.dienGiai.forEach(function (d) {
        var li = document.createElement('li');
        li.textContent = d;
        ol.appendChild(li);
      });
    }

    var tbody = $('bang-nuoc');
    if (tbody) {
      tbody.innerHTML = '';
      kq.quyDinh.bang.forEach(function (h) {
        var tr = document.createElement('tr');
        if (!h.apDung) tr.className = 'hang-khong-ap-dung';
        tr.innerHTML =
          '<td>' + h.ten + '</td>' +
          '<td>' + h.khung + '</td>' +
          '<td class="phai">' + h.donGia.toLocaleString('vi-VN') + '</td>' +
          '<td class="phai">' + E.dinhDangSo(h.luong) + '</td>' +
          '<td class="phai">' + h.thanhTien.toLocaleString('vi-VN') + '</td>';
        tbody.appendChild(tr);
      });
    }

    var tfoot = $('bang-nuoc-chan');
    if (tfoot) {
      var hang = [['Tiền nước sạch', kq.quyDinh.tienNuoc]];
      kq.quyDinh.phuPhi.forEach(function (pp) {
        hang.push([pp.ten + ' (' + Math.round(pp.tyLe * 100) + '%)', pp.tien]);
        if (pp.tienVat > 0) {
          hang.push(['Thuế GTGT ' + Math.round(pp.tyLeVat * 100) + '% của khoản trên', pp.tienVat]);
        }
      });
      if (kq.quyDinh.vatNuoc > 0) {
        hang.push(['Thuế GTGT nước sạch (' + Math.round(kq.quyDinh.tyLeVatNuoc * 100) + '%)', kq.quyDinh.vatNuoc]);
      }
      tfoot.innerHTML =
        hang.map(function (h) {
          return '<tr><td colspan="4">' + h[0] + '</td><td class="phai">' +
                 h[1].toLocaleString('vi-VN') + '</td></tr>';
        }).join('') +
        '<tr class="hang-tong"><td colspan="4">Tổng phải trả theo quy định</td><td class="phai">' +
        kq.quyDinh.tong.toLocaleString('vi-VN') + '</td></tr>' +
        '<tr><td colspan="4">Chủ trọ đang thu (' + kq.chuTro.congThuc + ')</td><td class="phai">' +
        kq.chuTro.tong.toLocaleString('vi-VN') + '</td></tr>';
    }

    dat('can-cu-nuoc', 'Căn cứ: ' + (kq.quyDinh.canCu || []).join(' · '));

    /* Ô cũ vẫn được điền để không có phần tử nào mang dữ liệu lệch */
    var oCu = $('tien-chu-tro-thu-nuoc');
    if (oCu) oCu.value = String(kq.chuTro.tong);
  }

  /* ==================================================================
     D. GỘP VÀO BẢNG TỔNG QUAN
     ------------------------------------------------------------------
     app.js ghi vào #so-thuc-thu / #so-hop-phap con số của RIÊNG phần
     điện (vì nhánh nước cũ đã bị vô hiệu hóa). Ta đọc lại hai con số
     đó làm gốc, rồi cộng phần nước.
     ================================================================== */

  function ghiNhoGocDien() {
    var a = docTien('so-thuc-thu');
    var b = docTien('so-hop-phap');
    if (a !== null) goc.thucThu = a;
    if (b !== null) goc.hopPhap = b;
  }

  function veTongQuan() {
    var batNuoc = $('nuoc-bat');
    var coNuoc = !!(batNuoc && batNuoc.checked && kqNuoc && !kqNuoc.loiChiSo);

    dat('nhan-pham-vi-tong-quan', coNuoc ? 'Điện + nước' : 'Điện');

    if (goc.thucThu === null || goc.hopPhap === null) return;

    var thucThu = goc.thucThu + (coNuoc ? kqNuoc.chuTro.tong : 0);
    var hopPhap = goc.hopPhap + (coNuoc ? kqNuoc.quyDinh.tong : 0);
    var chenh = thucThu - hopPhap;

    dat('so-thuc-thu', tien(thucThu));
    dat('so-hop-phap', tien(hopPhap));

    var oChenh = $('so-chenh-lech');
    if (oChenh) {
      oChenh.textContent = (chenh > 0 ? '+' : '') + tien(chenh);
      oChenh.className = 'o-so__gia-tri ' +
        (chenh > Math.max(2000, hopPhap * 0.02) ? 'o-so__gia-tri--do'
          : Math.abs(chenh) <= Math.max(2000, hopPhap * 0.02) ? 'o-so__gia-tri--xanh' : '');
    }

    var chiTiet = $('dai-chi-tiet-nuoc');
    if (chiTiet) {
      chiTiet.innerHTML = coNuoc
        ? '<span>Trong đó tiền nước: chủ trọ thu ' + tien(kqNuoc.chuTro.tong) +
          ' / đúng quy định ' + tien(kqNuoc.quyDinh.tong) + '</span>'
        : '';
    }
  }

  /* ==================================================================
     CHU TRÌNH TÍNH LẠI
     ================================================================== */

  function tinhLai() {
    if (!cauHinh || !window.WaterEngine) return;

    dongBoDien();
    // Ở lần đầu, app.js có thể vừa hoàn tất tính điện nhưng lớp nước chưa
    // từng lưu số gốc. Chỉ đọc khi chưa có số gốc để không vô tình lấy tổng
    // điện + nước rồi cộng nước thêm lần nữa ở các lần tính sau.
    if (goc.thucThu === null || goc.hopPhap === null) ghiNhoGocDien();
    dongBoNuoc();

    var batNuoc = $('nuoc-bat');
    var bat = !!(batNuoc && batNuoc.checked);
    hien($('khoi-nuoc'), bat);
    hien($('the-nuoc'), bat);

    if (bat) {
      kqNuoc = window.WaterEngine.tinhVaDoiChieu(docDauVaoNuoc(), cauHinh);

      if (radio('cachNhapNuoc') === 'chiSo') {
        dat('ghi-chu-m3', kqNuoc.loiChiSo
          ? kqNuoc.loiChiSo
          : 'Đã dùng ' + soLe(kqNuoc.soM3) + ' m³ trong kỳ (chỉ số cuối trừ chỉ số đầu).');
      } else {
        dat('ghi-chu-m3', 'Lấy ở dòng “số m³ tiêu thụ” trên hóa đơn, hoặc chuyển sang đọc chỉ số đồng hồ.');
      }

      veNuoc(kqNuoc);
    } else {
      kqNuoc = null;
    }

    veTongQuan();
  }

  /* ---------- Bản đối chiếu dạng văn bản, nối vào nút Sao chép ---------- */

  function banDoiChieuNuoc() {
    if (!kqNuoc) return '';
    var d = ['ĐỐI CHIẾU TIỀN NƯỚC — ' + (kqNuoc.diaPhuong ? kqNuoc.diaPhuong.ten : ''), ''];
    kqNuoc.dienGiai.forEach(function (b, i) { d.push((i + 1) + '. ' + b); });
    d.push('', 'Kết luận: ' + kqNuoc.doiChieu.tieuDe, kqNuoc.doiChieu.noiDung, '');
    d.push('Căn cứ: ' + (kqNuoc.quyDinh.canCu || []).join('; '));
    return d.join('\n');
  }

  /* ==================================================================
     GẮN SỰ KIỆN
     ================================================================== */

  function ganSuKien() {
    [
      'chi-so-dien-dau', 'chi-so-dien-cuoi',
      'cach-chu-tro-thu-dien', 'thong-so-chu-tro-dien',
      'nuoc-dia-phuong', 'so-m3', 'chi-so-nuoc-dau', 'chi-so-nuoc-cuoi',
      'co-dinh-muc-nuoc', 'don-gia-tu-nhap',
      'cach-chu-tro-thu-nuoc', 'thong-so-chu-tro-nuoc'
    ].forEach(function (id) {
      var el = $(id);
      if (!el) return;
      el.addEventListener('input', tinhLai);
      el.addEventListener('change', tinhLai);
    });

    // app.js lắng nghe các trường này trước lớp hợp nhất. Lưu số điện mới
    // ngay sau khi app.js vẽ lại, rồi mới cộng tiền nước để tổng không bị
    // dùng kết quả điện của lần tính trước.
    ['so-nguoi', 'so-kwh'].forEach(function (id) {
      var el = $(id);
      if (!el) return;
      var dongBoDienMoi = function () {
        ghiNhoGocDien();
        tinhLai();
      };
      el.addEventListener('input', dongBoDienMoi);
      el.addEventListener('change', dongBoDienMoi);
    });

    var ngayTinh = $('ngay-tinh');
    if (ngayTinh) ngayTinh.addEventListener('change', function () {
      ghiNhoGocDien();
      tinhLai();
    });

    document.querySelectorAll('input[name="keKhai"]').forEach(function (el) {
      el.addEventListener('change', function () {
        ghiNhoGocDien();
        tinhLai();
      });
    });

    ['cachNhapDien', 'cachNhapNuoc'].forEach(function (ten) {
      document.querySelectorAll('input[name="' + ten + '"]').forEach(function (r) {
        r.addEventListener('change', tinhLai);
      });
    });

    var bat = $('nuoc-bat');
    if (bat) bat.addEventListener('change', tinhLai);

    // app.js đã đăng ký listener trước lớp này và vẽ lại phần điện đồng bộ
    // khi ô gốc thay đổi. Sau đó lưu lại hai số điện mới và ghép phần nước.
    // Nhờ vậy đổi đơn giá/khoán điện không làm Tổng quan dùng số của lần cũ.
    var dienGoc = $('tien-chu-tro-thu-dien');
    if (dienGoc) dienGoc.addEventListener('input', function () {
      ghiNhoGocDien();
      veTongQuan();
    });

    /* Sau khi app.js xử lý xong submit, đọc lại số gốc của phần điện rồi gộp */
    var form = $('bieu-mau');
    if (form) {
      form.addEventListener('submit', function () {
        setTimeout(function () {
          ghiNhoGocDien();
          tinhLai();
        }, 0);
      });
      form.addEventListener('reset', function () {
        setTimeout(function () {
          goc.thucThu = null;
          goc.hopPhap = null;
          kqNuoc = null;
          tinhLai();
        }, 0);
      });
    }

    /* Nối phần nước vào nút Sao chép, không sửa app.js */
    var nut = $('nut-sao-chep');
    if (nut) {
      nut.addEventListener('click', function () {
        var bat2 = $('nuoc-bat');
        if (!bat2 || !bat2.checked || !kqNuoc) return;
        setTimeout(function () {
          if (!navigator.clipboard || !navigator.clipboard.readText) return;
          navigator.clipboard.readText().then(function (dangCo) {
            var themVao = banDoiChieuNuoc();
            if (dangCo && dangCo.indexOf('ĐỐI CHIẾU TIỀN NƯỚC') === -1) {
              navigator.clipboard.writeText(
                dangCo + '\n\n' + new Array(47).join('=') + '\n\n' + themVao
              );
            }
          }).catch(function () { /* trình duyệt không cho đọc clipboard: bỏ qua */ });
        }, 120);
      });
    }
  }

  /* ==================================================================
     KHỞI ĐỘNG
     ================================================================== */

  function baoLoiCauHinh() {
    var hop = $('hop-canh-bao-nuoc');
    if (!hop) return;
    hien($('the-nuoc'), true);
    hien(hop, true);
    hop.className = 'hop-canh-bao hop-canh-bao--do';
    dat('canh-bao-nuoc-tieu-de', 'Không đọc được cấu hình biểu giá nước');
    dat('canh-bao-nuoc-noi-dung',
      'Hãy chạy ứng dụng qua máy chủ tĩnh (npx serve . -l 3000) thay vì mở trực tiếp index.html.');
  }

  function khoiDong() {
    if (!window.WaterEngine) {
      console.error('[hop-nhat] Chưa nạp được src/water-engine.js — kiểm tra thứ tự thẻ script.');
      return;
    }

    /* Chốt: nhánh tính nước cũ trong app.js không bao giờ được bật */
    var batCu = $('bat-tinh-nuoc');
    if (batCu) batCu.checked = false;

    fetch(DUONG_DAN_CAU_HINH)
      .then(function (r) {
        if (!r.ok) throw new Error('HTTP ' + r.status);
        return r.json();
      })
      .then(function (json) {
        cauHinh = json;
        dungOChon();
        ganSuKien();
        tinhLai();
        // app.js và lớp nước cùng nạp cấu hình bất đồng bộ. Đọc lại sau một
        // lượt event loop để bảo đảm số điện đầu tiên đã được app.js hiển thị.
        setTimeout(function () {
          ghiNhoGocDien();
          veTongQuan();
        }, 0);
        dat('nguon-cau-hinh-nuoc',
          'Biểu giá nước: cấu hình ' + cauHinh.phienBanCauHinh + ', cập nhật ' + cauHinh.capNhatNgay);
        veBieuGiaNuocTabQuyDinh();
      })
      .catch(function (e) {
        console.error('[hop-nhat] Lỗi nạp cấu hình:', e);
        baoLoiCauHinh();
      });
  }

  /* Sinh bảng biểu giá nước ở tab Căn cứ pháp lý, từ chính cấu hình */
  function veBieuGiaNuocTabQuyDinh() {
    var dp = window.WaterEngine.chonDiaPhuong(cauHinh, cauHinh.diaPhuongMacDinh);
    if (!dp || dp.phuongThuc !== 'luyTienTheoDinhMuc') return;

    var tbody = $('bang-bieu-gia-nuoc-goc');
    if (tbody) {
      tbody.innerHTML = '';
      var truoc = 0;
      dp.bac.forEach(function (b) {
        var tr = document.createElement('tr');
        var khung = (b.denM3MoiNguoi == null)
          ? 'Trên ' + truoc + ' m³'
          : truoc + ' – ' + b.denM3MoiNguoi + ' m³';
        tr.innerHTML = '<td>' + b.ten + '</td><td>' + khung + '</td>' +
                       '<td class="phai">' + b.donGia.toLocaleString('vi-VN') + '</td>';
        tbody.appendChild(tr);
        if (b.denM3MoiNguoi != null) truoc = b.denM3MoiNguoi;
      });
    }

    dat('mo-ta-bieu-gia-nuoc', dp.ten + ' — hiệu lực từ ' + dp.hieuLucTu +
      '. Đơn giá chưa gồm thuế GTGT ' + Math.round(dp.vatNuocSach * 100) + '% và ' +
      (dp.phuPhi || []).map(function (p) {
        return p.ten.toLowerCase() + ' (' + Math.round(p.tyLeTrenTienNuoc * 100) + '%)';
      }).join(', ') + '.');

    dat('can-cu-nuoc-tab', 'Căn cứ: ' + (dp.canCu || []).join(' · '));
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', khoiDong);
  } else {
    khoiDong();
  }

  window.HopNhat = {
    tinhLai: tinhLai,
    ketQuaNuoc: function () { return kqNuoc; },
    banDoiChieuNuoc: banDoiChieuNuoc
  };
})();
