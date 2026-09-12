/* ==================================================================
   PATCH 4 — NỐI PHẦN NƯỚC VÀO BẢNG "TỔNG QUAN"
   ------------------------------------------------------------------
   Thẻ kết quả nước đã tự có ba con số riêng (chủ trọ thu / đúng quy
   định / chênh lệch) nên phần nước chạy độc lập được ngay, không cần
   sửa app.js. Bước này chỉ để bảng "Tổng quan" ở trên cộng cả điện
   lẫn nước.

   Tôi chưa đọc được src/app.js của bạn nên không dán thẳng vào đó
   được. Chọn một trong hai phương án dưới đây.
   ================================================================== */


/* ------------------------------------------------------------------
   PHƯƠNG ÁN A — sửa 3 dòng trong app.js (gọn hơn, nên dùng)
   ------------------------------------------------------------------
   Trong app.js, tìm chỗ đang ghi ba con số của thẻ Tổng quan
   (các id: so-thuc-thu, so-hop-phap, so-chenh-lech).
   Ở bản 0.2.1 đoạn đó trông đại khái như sau:

       var thucThu   = tienChuTroThuDien + tienChuTroThuNuoc;
       var hopPhap   = ketQuaDien.tong   + ketQuaNuoc.tong;

   Thay hai dòng đó bằng:                                              */

var kqNuoc = (window.WaterUI && window.WaterUI.ketQua()) || null;
var batNuoc = document.getElementById('bat-tinh-nuoc');
var coTinhNuoc = !!(batNuoc && batNuoc.checked && kqNuoc);

var thucThu = tienChuTroThuDien + (coTinhNuoc ? kqNuoc.chuTro.tong : 0);
var hopPhap = ketQuaDien.tong + (coTinhNuoc ? kqNuoc.quyDinh.tong : 0);

/*   Rồi thêm dòng này ở cuối app.js để Tổng quan vẽ lại mỗi khi
     người dùng đổi một ô trong khối nước:                             */

document.addEventListener('nuoc:da-tinh', function () {
  veTongQuan();   // ĐỔI TÊN cho khớp hàm vẽ Tổng quan trong app.js của bạn
});
document.addEventListener('nuoc:tat', function () {
  veTongQuan();
});


/* ------------------------------------------------------------------
   PHƯƠNG ÁN B — không sửa app.js một dòng nào
   ------------------------------------------------------------------
   Bỏ hẳn phần nước ra khỏi thẻ Tổng quan, đổi nhãn thẻ đó thành
   "Tổng quan tiền điện" trong index.html. Thẻ Tiền nước đã có ba con
   số đối chiếu riêng nên người dùng vẫn thấy đủ thông tin.

   Đổi ở index.html:
       <h2 class="the__tieu-de">Tổng quan</h2>
   thành:
       <h2 class="the__tieu-de">Tổng quan tiền điện</h2>

   Phương án này an toàn tuyệt đối về mặt hồi quy, nhưng người dùng
   phải tự cộng hai con số nếu muốn biết tổng cả kỳ. Với mục tiêu
   "trang để kiểm tra lại từng khoản", đây là đánh đổi chấp nhận được
   và có thể làm ngay, để dành phương án A cho lúc rảnh tay.
   ------------------------------------------------------------------ */


/* ------------------------------------------------------------------
   PATCH 5 — NÚT "SAO CHÉP BẢN ĐỐI CHIẾU" bao gồm cả phần nước
   ------------------------------------------------------------------
   Trong app.js, tìm hàm xử lý nút #nut-sao-chep và nối thêm:         */

function ghepBanDoiChieu(vanBanDien) {
  var phanNuoc = (window.WaterUI && window.WaterUI.banDoiChieuText()) || '';
  var batNuocEl = document.getElementById('bat-tinh-nuoc');
  if (batNuocEl && batNuocEl.checked && phanNuoc) {
    return vanBanDien + '\n\n' + '='.repeat(46) + '\n\n' + phanNuoc;
  }
  return vanBanDien;
}
