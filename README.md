# Walking Through Concerts

Website cá nhân để lưu lịch concert, nhập chi phí và theo dõi ngân sách.

## Chức năng

- Thêm, sửa và xóa concert.
- Thêm, sửa và xóa các khoản chi.
- Xuất toàn bộ chi phí của từng concert ra file Excel (.xlsx), kèm thông tin concert, ngân sách và tổng dự tính/thực tế. Mở “Xem chi phí” của concert rồi chọn “Xuất Excel”.
- Tự động cập nhật tổng tiền, ngân sách và phân bổ chi phí.
- Tìm kiếm, lọc lịch trình và lưu dữ liệu trong trình duyệt.
- Giao diện responsive cho desktop, tablet và điện thoại.

## Chạy trên máy

```bash
npm install
npm run dev
```

Dữ liệu được lưu bằng `localStorage`, vì vậy mỗi trình duyệt và thiết bị có bộ dữ liệu riêng.
