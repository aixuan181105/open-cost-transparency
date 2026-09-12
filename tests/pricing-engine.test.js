/**
 * pricing-engine.test.js — CHẠY KIỂM THỬ BẰNG DÒNG LỆNH
 * ==================================================================
 * Chạy:  node tests/pricing-engine.test.js
 * hoặc:  npm test
 *
 * Không cần cài thêm thư viện nào. Các ca kiểm thử được định nghĩa ở
 * tests/test-cases.js và dùng chung với tab "Kiểm thử" trên giao diện.
 * MIT License
 * Copyright (c) 2026 aixuan181105
 * ==================================================================
 */
const path = require("path");

const Engine = require(path.join(__dirname, "..", "src", "pricing-engine.js"));
const { taoDanhSachTest } = require(path.join(__dirname, "test-cases.js"));

const cfg = {
  bieuGia: require(path.join(__dirname, "..", "config", "electricity-tiers.json")),
  vat: require(path.join(__dirname, "..", "config", "vat.json")),
  nuoc: require(path.join(__dirname, "..", "config", "water-rates.json")),
};

const danhSach = taoDanhSachTest(Engine, cfg);

let pass = 0;
const thatBai = [];
let nhomHienTai = "";

for (const t of danhSach) {
  if (t.nhom !== nhomHienTai) {
    nhomHienTai = t.nhom;
    console.log(`\n── ${nhomHienTai} ──`);
  }
  try {
    t.chay();
    pass++;
    console.log(`  ✅ ${t.ten}`);
  } catch (err) {
    thatBai.push({ ten: t.ten, loi: err.message });
    console.log(`  ❌ ${t.ten}`);
    console.log(`     ${err.message}`);
  }
}

console.log(`\n${"=".repeat(58)}`);
console.log(`Kết quả: ${pass}/${danhSach.length} ca kiểm thử PASS`);

if (thatBai.length > 0) {
  console.log(`\n${thatBai.length} ca THẤT BẠI:`);
  thatBai.forEach((t) => console.log(`  - ${t.ten}: ${t.loi}`));
  process.exit(1);
}
console.log("Toàn bộ kiểm thử thành công.");
