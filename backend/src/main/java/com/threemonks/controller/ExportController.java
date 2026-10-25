package com.threemonks.controller;

import com.threemonks.entity.*;
import com.threemonks.repository.*;
import lombok.RequiredArgsConstructor;
import org.apache.poi.ss.usermodel.*;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

@RestController
@RequestMapping("/api/admin/export")
@PreAuthorize("hasRole('SUPER_ADMIN')")
@RequiredArgsConstructor
public class ExportController {

    private final OrderRepository orderRepository;
    private final PurchaseRepository purchaseRepository;

    @GetMapping("/orders")
    public ResponseEntity<byte[]> exportOrders(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {

        LocalDateTime start = (from != null ? from : LocalDate.now().withDayOfMonth(1)).atStartOfDay();
        LocalDateTime end = (to != null ? to : LocalDate.now()).atTime(LocalTime.MAX);

        List<Order> orders = orderRepository.findByOrderDateBetween(start, end);

        try (XSSFWorkbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("Orders");

            CellStyle headerStyle = workbook.createCellStyle();
            Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerStyle.setFont(headerFont);

            Row header = sheet.createRow(0);
            String[] columns = { "Order #", "Shop", "Created By", "Products", "Qty", "Total Amount (₹)", "Payment Mode",
                    "Status", "Customer", "Phone", "Date" };
            for (int i = 0; i < columns.length; i++) {
                Cell cell = header.createCell(i);
                cell.setCellValue(columns[i]);
                cell.setCellStyle(headerStyle);
            }

            // Amount format
            CellStyle amountStyle = workbook.createCellStyle();
            DataFormat dataFormat = workbook.createDataFormat();
            amountStyle.setDataFormat(dataFormat.getFormat("#,##0.00"));

            int rowNum = 1;
            for (Order order : orders) {
                Row row = sheet.createRow(rowNum++);
                row.createCell(0).setCellValue(order.getOrderNumber());
                row.createCell(1).setCellValue(order.getShop().getName());
                row.createCell(2).setCellValue(order.getCreatedBy().getFullName());

                String items = order.getItems().stream()
                        .map(item -> item.getProduct().getName() + " x" + item.getQuantity())
                        .reduce((a, b) -> a + ", " + b).orElse("");
                row.createCell(3).setCellValue(items);

                int totalQty = order.getItems().stream()
                        .mapToInt(OrderItem::getQuantity).sum();
                row.createCell(4).setCellValue(totalQty);

                Cell amountCell = row.createCell(5);
                amountCell.setCellValue(order.getTotalAmount().doubleValue());
                amountCell.setCellStyle(amountStyle);

                row.createCell(6).setCellValue(order.getPaymentMode().name());
                row.createCell(7).setCellValue(order.getStatus().name());
                row.createCell(8).setCellValue(order.getCustomerName() != null ? order.getCustomerName() : "");
                row.createCell(9).setCellValue(order.getCustomerPhone() != null ? order.getCustomerPhone() : "");
                row.createCell(10).setCellValue(
                        order.getOrderDate() != null ? order.getOrderDate().toString().replace("T", " ") : "");
            }

            for (int i = 0; i < columns.length; i++) {
                sheet.autoSizeColumn(i);
            }

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            workbook.write(out);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_OCTET_STREAM);
            headers.setContentDisposition(ContentDisposition.builder("attachment")
                    .filename("orders_" + start.toLocalDate() + "_to_" + end.toLocalDate() + ".xlsx").build());

            return new ResponseEntity<>(out.toByteArray(), headers, HttpStatus.OK);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }

    @GetMapping("/purchases")
    public ResponseEntity<byte[]> exportPurchases(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {

        LocalDate start = from != null ? from : LocalDate.now().withDayOfMonth(1);
        LocalDate end = to != null ? to : LocalDate.now();

        List<Purchase> purchases = purchaseRepository.findByPurchaseDateBetween(start, end);

        try (XSSFWorkbook workbook = new XSSFWorkbook()) {
            Sheet sheet = workbook.createSheet("Purchases");

            CellStyle headerStyle = workbook.createCellStyle();
            Font headerFont = workbook.createFont();
            headerFont.setBold(true);
            headerStyle.setFont(headerFont);

            Row header = sheet.createRow(0);
            String[] columns = { "Shop", "Raw Material", "Quantity", "Total Cost (₹)", "GST %", "GST Amount (₹)",
                    "Vendor", "Invoice #", "Purchased By", "Date" };
            for (int i = 0; i < columns.length; i++) {
                Cell cell = header.createCell(i);
                cell.setCellValue(columns[i]);
                cell.setCellStyle(headerStyle);
            }

            CellStyle amountStyle = workbook.createCellStyle();
            DataFormat dataFormat = workbook.createDataFormat();
            amountStyle.setDataFormat(dataFormat.getFormat("#,##0.00"));

            int rowNum = 1;
            for (Purchase p : purchases) {
                Row row = sheet.createRow(rowNum++);
                row.createCell(0).setCellValue(p.getShop().getName());
                row.createCell(1).setCellValue(p.getRawMaterial().getName());

                Cell qtyCell = row.createCell(2);
                qtyCell.setCellValue(p.getQuantity().doubleValue());
                qtyCell.setCellStyle(amountStyle);

                Cell costCell = row.createCell(3);
                costCell.setCellValue(p.getTotalCost().doubleValue());
                costCell.setCellStyle(amountStyle);

                row.createCell(4).setCellValue(p.getGstPercentage() != null ? p.getGstPercentage().doubleValue() : 0);

                Cell gstCell = row.createCell(5);
                gstCell.setCellValue(p.getGstAmount() != null ? p.getGstAmount().doubleValue() : 0);
                gstCell.setCellStyle(amountStyle);

                row.createCell(6).setCellValue(p.getVendorName() != null ? p.getVendorName() : "");
                row.createCell(7).setCellValue(p.getInvoiceNumber() != null ? p.getInvoiceNumber() : "");
                row.createCell(8).setCellValue(p.getPurchasedBy() != null ? p.getPurchasedBy().getFullName() : "");
                row.createCell(9).setCellValue(p.getPurchaseDate() != null ? p.getPurchaseDate().toString() : "");
            }

            for (int i = 0; i < columns.length; i++) {
                sheet.autoSizeColumn(i);
            }

            ByteArrayOutputStream out = new ByteArrayOutputStream();
            workbook.write(out);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.APPLICATION_OCTET_STREAM);
            headers.setContentDisposition(ContentDisposition.builder("attachment")
                    .filename("purchases_" + start + "_to_" + end + ".xlsx").build());

            return new ResponseEntity<>(out.toByteArray(), headers, HttpStatus.OK);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }
}
