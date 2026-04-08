package com.yisus.store_backend.order.service;

import com.lowagie.text.*;
import com.lowagie.text.pdf.*;
import com.yisus.store_backend.order.dto.OrderDTO;
import com.yisus.store_backend.order.dto.OrderItemDTO;
import com.yisus.store_backend.order.dto.PaymentDTO;
import com.yisus.store_backend.order.dto.ShippingAddressDTO;
import com.yisus.store_backend.storeconfig.model.StoreConfig;
import com.yisus.store_backend.storeconfig.service.StoreConfigService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.math.BigDecimal;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.time.ZoneId;
import java.time.ZonedDateTime;
import java.time.format.DateTimeFormatter;

@Service
@RequiredArgsConstructor
@Slf4j
public class SaleReceiptService {

    /** 88 mm en puntos: 88 × 72 / 25.4 ≈ 249.45 pt */
    private static final float PAGE_WIDTH = 88f * 72f / 25.4f;
    private static final float MARGIN_H   = 8f;
    private static final float MARGIN_V   = 10f;

    /** Logo arriba del recibo: ancho/alto máx. en pt (ticket 88 mm; mantiene proporción). */
    private static final float LOGO_MAX_W_PT = 200f;
    private static final float LOGO_MAX_H_PT   = 72f;

    private static final DateTimeFormatter FMT_EMISION = DateTimeFormatter.ofPattern("dd/MM/yyyy HH:mm");
    private static final DateTimeFormatter FMT_IMP_FECHA = DateTimeFormatter.ofPattern("dd/MM/yyyy");
    private static final DateTimeFormatter FMT_IMP_HORA  = DateTimeFormatter.ofPattern("HH:mm:ss");

    /** Zona horaria para fecha/hora de impresión del recibo (Perú). */
    private static final ZoneId ZONE_IMPRESION = ZoneId.of("America/Lima");

    private final StoreConfigService storeConfigService;

    public byte[] generateReceipt(OrderDTO order) {
        StoreConfig cfg = storeConfigService.getRawConfig();
        ZonedDateTime impresoEn = ZonedDateTime.now(ZONE_IMPRESION);

        int itemCount    = order.getOrderItems() != null ? order.getOrderItems().size() : 0;
        int paymentCount = order.getPayments()   != null ? order.getPayments().size()   : 0;

        int addressLines = 0;
        if (cfg.getStoreAddress() != null && !cfg.getStoreAddress().isBlank()) {
            for (String line : cfg.getStoreAddress().split("[,\n]")) {
                if (!line.trim().isEmpty()) {
                    addressLines++;
                }
            }
        }
        ShippingAddressDTO shipForHeight = order.getShippingAddress();
        int buyerLines = 1;
        if (shipForHeight != null) {
            buyerLines = 0;
            if (shipForHeight.getFullName() != null && !shipForHeight.getFullName().isBlank()) {
                buyerLines++;
            }
            if (shipForHeight.getPhone() != null && !shipForHeight.getPhone().isBlank()) {
                buyerLines++;
            }
            if (shipForHeight.getAddress() != null && !shipForHeight.getAddress().isBlank()) {
                buyerLines++;
            }
            if (shipForHeight.getCity() != null && !shipForHeight.getCity().isBlank()) {
                buyerLines++;
            }
            if (buyerLines == 0) {
                buyerLines = 1;
            }
        }
        Image logoImage = tryLoadStoreLogo(cfg.getLogoUrl());
        float logoExtra = logoImage != null ? LOGO_MAX_H_PT + 18f : 0f;

        // Una sola página: altura ≥ contenido. Incluye colchón para spacers del pie (líneas + “Gracias…”) sin segunda página.
        float pageHeight = 380f + addressLines * 10f + buyerLines * 11f
                + (itemCount * 34f) + Math.max(paymentCount, 1) * 24f + 145f + logoExtra;

        try (ByteArrayOutputStream baos = new ByteArrayOutputStream()) {
            Rectangle pageSize = new Rectangle(PAGE_WIDTH, pageHeight);
            Document  document = new Document(pageSize, MARGIN_H, MARGIN_H, MARGIN_V, MARGIN_V);
            PdfWriter.getInstance(document, baos);
            document.open();

            float cw = PAGE_WIDTH - (2 * MARGIN_H);

            Font fStoreLegal = FontFactory.getFont(FontFactory.HELVETICA_BOLD,   8f);
            Font fDocType    = FontFactory.getFont(FontFactory.HELVETICA_BOLD,   7.5f);
            Font fDocNum     = FontFactory.getFont(FontFactory.HELVETICA_BOLD,   9.5f);
            Font fBold       = FontFactory.getFont(FontFactory.HELVETICA_BOLD,    7f);
            Font fNormal     = FontFactory.getFont(FontFactory.HELVETICA,        6.8f);
            Font fSmall      = FontFactory.getFont(FontFactory.HELVETICA,        6.3f);
            Font fItalic     = FontFactory.getFont(FontFactory.HELVETICA_OBLIQUE, 6.3f);
            Font fTotal      = FontFactory.getFont(FontFactory.HELVETICA_BOLD,   8.5f);

            // ── Cabecera: logo (si existe) + nombre de la empresa ───────────
            String storeName = (cfg.getStoreName() != null && !cfg.getStoreName().isBlank())
                    ? cfg.getStoreName().trim()
                    : "Mi tienda";
            if (logoImage != null) {
                logoImage.scaleToFit(LOGO_MAX_W_PT, LOGO_MAX_H_PT);
                logoImage.setAlignment(Element.ALIGN_CENTER);
                document.add(logoImage);
                addSpacer(document, fSmall);
            }
            addCentered(document, storeName, fStoreLegal, 2f);

            if (cfg.getStoreAddress() != null && !cfg.getStoreAddress().isBlank()) {
                for (String line : cfg.getStoreAddress().split("[,\n]")) {
                    String trimmed = line.trim();
                    if (!trimmed.isEmpty()) {
                        addCentered(document, trimmed, fSmall, 1f);
                    }
                }
            }

            if (cfg.getStoreRuc() != null && !cfg.getStoreRuc().isBlank()) {
                addCentered(document, "RUC: " + cfg.getStoreRuc().trim(), fNormal, 4f);
            }

            addLine(document, cw);
            addSpacer(document, fSmall);

            addCentered(document, "NOTA DE VENTA", fDocType, 2f);
            addCentered(document, String.format("Nº %06d", order.getId()), fDocNum, 3f);

            if (order.getCreatedAt() != null) {
                addCentered(document, "Fecha de emisión: " + order.getCreatedAt().format(FMT_EMISION), fSmall, 3f);
            }

            ShippingAddressDTO ship = order.getShippingAddress();
            if (ship != null) {
                String dest = buildDestinoLine(ship);
                if (dest != null) {
                    Paragraph d = new Paragraph("Destino: " + dest, fSmall);
                    d.setAlignment(Element.ALIGN_LEFT);
                    d.setSpacingAfter(2f);
                    document.add(d);
                }
            }

            addLine(document, cw);
            addSpacer(document, fSmall);

            // ── Cliente ───────────────────────────────────────────────────────
            document.add(new Paragraph("CLIENTE / DATOS DEL COMPRADOR", fBold));
            addSpacer(document, fSmall);
            if (ship != null) {
                if (ship.getFullName() != null && !ship.getFullName().isBlank()) {
                    document.add(new Paragraph("Nombre: " + ship.getFullName().trim(), fNormal));
                }
                if (ship.getPhone() != null && !ship.getPhone().isBlank()) {
                    document.add(new Paragraph("Tel.: " + ship.getPhone().trim(), fNormal));
                }
                if (ship.getAddress() != null && !ship.getAddress().isBlank()) {
                    document.add(new Paragraph("Dirección: " + ship.getAddress().trim(), fNormal));
                }
                if (ship.getCity() != null && !ship.getCity().isBlank()) {
                    document.add(new Paragraph("Ciudad: " + ship.getCity().trim(), fNormal));
                }
            } else {
                document.add(new Paragraph("Nombre: —", fNormal));
            }

            addSpacer(document, fSmall);
            addLine(document, cw);
            addSpacer(document, fSmall);

            // ── Ítems: CANT | DESCRIPCIÓN | TOTAL ────────────────────────────
            PdfPTable itemTable = new PdfPTable(new float[]{0.85f, 3.5f, 1.15f});
            itemTable.setTotalWidth(cw);
            itemTable.setLockedWidth(true);

            addCell(itemTable, "CANT",      fBold, Element.ALIGN_CENTER, new Color(235, 235, 235), 2f);
            addCell(itemTable, "DESCRIPCIÓN", fBold, Element.ALIGN_CENTER, new Color(235, 235, 235), 2f);
            addCell(itemTable, "TOTAL",     fBold, Element.ALIGN_CENTER, new Color(235, 235, 235), 2f);

            if (order.getOrderItems() != null) {
                for (OrderItemDTO item : order.getOrderItems()) {
                    String desc = item.getProductName() != null ? item.getProductName() : "—";
                    if (item.getColorName() != null && !item.getColorName().isBlank()) {
                        desc += " - " + item.getColorName();
                    }
                    if (item.getSizeName() != null && !item.getSizeName().isBlank()) {
                        desc += " T:" + item.getSizeName();
                    }

                    addCell(itemTable, String.valueOf(item.getQuantity()), fNormal, Element.ALIGN_CENTER, null, 2f);
                    addCell(itemTable, desc, fNormal, Element.ALIGN_LEFT, null, 2f);
                    addCell(itemTable, amountPlain(item.getTotalPrice()), fNormal, Element.ALIGN_RIGHT, null, 2f);
                }
            }
            document.add(itemTable);

            addSpacer(document, fSmall);
            addLine(document, cw);
            addSpacer(document, fSmall);

            // ── Total documento ─────────────────────────────────────────────
            Paragraph totalP = new Paragraph();
            totalP.setAlignment(Element.ALIGN_RIGHT);
            totalP.add(new Chunk("TOTAL (S/): ", fBold));
            totalP.add(new Chunk(totalStr(order.getTotal()), fTotal));
            totalP.setSpacingAfter(6f);
            document.add(totalP);

            // ── Pagos (híbridos: una fila por método) ───────────────────────
            document.add(new Paragraph("FORMAS DE PAGO", fBold));
            addSpacer(document, fSmall);

            PdfPTable payTable = new PdfPTable(new float[]{2.2f, 1.3f});
            payTable.setTotalWidth(cw);
            payTable.setLockedWidth(true);

            addCell(payTable, "TIPO",  fBold, Element.ALIGN_CENTER, new Color(235, 235, 235), 2f);
            addCell(payTable, "MONTO", fBold, Element.ALIGN_CENTER, new Color(235, 235, 235), 2f);

            if (order.getPayments() != null && !order.getPayments().isEmpty()) {
                for (PaymentDTO payment : order.getPayments()) {
                    addCell(payTable, translateMethod(payment.getMethod().name()), fNormal, Element.ALIGN_LEFT, null, 2f);
                    addCell(payTable, currency(payment.getAmount()), fNormal, Element.ALIGN_RIGHT, null, 2f);
                }
            } else {
                addCell(payTable, "—", fNormal, Element.ALIGN_LEFT, null, 2f);
                addCell(payTable, "—", fNormal, Element.ALIGN_RIGHT, null, 2f);
            }
            document.add(payTable);

            addSpacer(document, fSmall);
            addLine(document, cw);
            addSpacer(document, fSmall);

            // Usu. reg. | fechas: Phrase en ambas (Paragraph desalineaba la 1ª línea) + paddingTop fino en izquierda
            String registrar = (order.getUserName() != null && !order.getUserName().isBlank())
                    ? order.getUserName().trim()
                    : "—";
            String fecHor = "Fec. imp.: " + impresoEn.format(FMT_IMP_FECHA)
                    + "\nHor. imp.: " + impresoEn.format(FMT_IMP_HORA);

            PdfPTable metaBlock = new PdfPTable(new float[]{1.15f, 1f});
            metaBlock.setTotalWidth(cw);
            metaBlock.setLockedWidth(true);
            metaBlock.setSpacingBefore(0f);
            metaBlock.setSpacingAfter(0f);

            Phrase leftPh = new Phrase("Usu. reg.: " + registrar, fSmall);
            PdfPCell userCell = new PdfPCell(leftPh);
            userCell.setBorder(Rectangle.NO_BORDER);
            userCell.setPaddingTop(2.35f);
            userCell.setPaddingBottom(1.5f);
            userCell.setPaddingLeft(0f);
            userCell.setPaddingRight(4f);
            userCell.setHorizontalAlignment(Element.ALIGN_LEFT);
            userCell.setVerticalAlignment(Element.ALIGN_TOP);
            metaBlock.addCell(userCell);

            Phrase rightPh = new Phrase(fecHor, fSmall);
            PdfPCell fechaHoraCell = new PdfPCell(rightPh);
            fechaHoraCell.setBorder(Rectangle.NO_BORDER);
            fechaHoraCell.setPaddingTop(1.5f);
            fechaHoraCell.setPaddingBottom(1.5f);
            fechaHoraCell.setPaddingLeft(0f);
            fechaHoraCell.setPaddingRight(0f);
            fechaHoraCell.setHorizontalAlignment(Element.ALIGN_LEFT);
            fechaHoraCell.setVerticalAlignment(Element.ALIGN_TOP);
            metaBlock.addCell(fechaHoraCell);

            document.add(metaBlock);

            addSpacer(document, fSmall);
            addLine(document, cw);
            addSpacer(document, fSmall);

            Paragraph thanks = new Paragraph("Gracias por su preferencia", fItalic);
            thanks.setAlignment(Element.ALIGN_CENTER);
            thanks.setSpacingAfter(2f);
            document.add(thanks);

            document.close();
            return baos.toByteArray();

        } catch (Exception e) {
            throw new RuntimeException("Error generando el recibo PDF", e);
        }
    }

    private static String buildDestinoLine(ShippingAddressDTO ship) {
        String city = ship.getCity() != null ? ship.getCity().trim() : "";
        String addr = ship.getAddress() != null ? ship.getAddress().trim() : "";
        if (city.isEmpty() && addr.isEmpty()) {
            return null;
        }
        if (!city.isEmpty() && !addr.isEmpty()) {
            return city + " — " + addr;
        }
        return city.isEmpty() ? addr : city;
    }

    private void addCentered(Document doc, String text, Font font, float spacingAfter) throws DocumentException {
        Paragraph p = new Paragraph(text, font);
        p.setAlignment(Element.ALIGN_CENTER);
        p.setSpacingAfter(spacingAfter);
        doc.add(p);
    }

    private void addSpacer(Document doc, Font font) throws DocumentException {
        Paragraph p = new Paragraph(" ", font);
        p.setSpacingBefore(0f);
        p.setSpacingAfter(0f);
        doc.add(p);
    }

    /**
     * Línea horizontal con el mismo ancho útil que las tablas ({@code cw}), para que no quede más corta que el contenido.
     * {@link LineSeparator} con % no coincide siempre con {@link PdfPTable#setTotalWidth(float)}.
     */
    private void addLine(Document doc, float cw) throws DocumentException {
        PdfPTable lineTable = new PdfPTable(1);
        lineTable.setTotalWidth(cw);
        lineTable.setLockedWidth(true);
        lineTable.setHorizontalAlignment(Element.ALIGN_LEFT);
        PdfPCell cell = new PdfPCell(new Phrase(""));
        cell.setBorder(Rectangle.BOTTOM);
        cell.setBorderWidthBottom(0.5f);
        cell.setBorderColorBottom(Color.GRAY);
        cell.setBorderWidthTop(0f);
        cell.setBorderWidthLeft(0f);
        cell.setBorderWidthRight(0f);
        cell.setPadding(0f);
        cell.setFixedHeight(5f);
        lineTable.addCell(cell);
        doc.add(lineTable);
    }

    private void addCell(PdfPTable table, String text, Font font, int hAlign, Color bg, float padding) {
        PdfPCell cell = new PdfPCell(new Phrase(text, font));
        cell.setHorizontalAlignment(hAlign);
        cell.setVerticalAlignment(Element.ALIGN_MIDDLE);
        cell.setPadding(padding);
        cell.setBorderColor(new Color(160, 160, 160));
        cell.setBorderWidth(0.35f);
        if (bg != null) {
            cell.setBackgroundColor(bg);
        }
        table.addCell(cell);
    }

    /** Monto con símbolo (formas de pago). */
    private String currency(BigDecimal value) {
        if (value == null) {
            return "—";
        }
        return String.format("S/. %.2f", value);
    }

    /** Monto sin símbolo (columna TOTAL de ítems, estilo boleta). */
    private String amountPlain(BigDecimal value) {
        if (value == null) {
            return "—";
        }
        return String.format("%.2f", value);
    }

    private String totalStr(BigDecimal value) {
        if (value == null) {
            return "0.00";
        }
        return String.format("%.2f", value);
    }

    private String translateMethod(String method) {
        return switch (method) {
            case "CASH"     -> "Efectivo";
            case "YAPE"     -> "Yape";
            case "PLIN"     -> "Plin";
            case "TRANSFER" -> "Transferencia";
            case "CARD"     -> "Tarjeta";
            default         -> method;
        };
    }

    /**
     * Logo desde disco ({@code /uploads/logos/...}). SVG u otros no soportados se omiten.
     */
    private Image tryLoadStoreLogo(String logoUrl) {
        if (logoUrl == null || logoUrl.isBlank()) {
            return null;
        }
        String trimmed = logoUrl.trim();
        if (!trimmed.startsWith("/uploads/")) {
            return null;
        }
        try {
            String relative = trimmed.startsWith("/") ? trimmed.substring(1) : trimmed;
            Path path = Paths.get(relative).toAbsolutePath().normalize();
            if (!Files.exists(path) || !Files.isRegularFile(path)) {
                log.warn("Logo de tienda no encontrado para recibo: {}", path);
                return null;
            }
            byte[] data = Files.readAllBytes(path);
            return Image.getInstance(data);
        } catch (Exception e) {
            log.warn("No se pudo cargar el logo en el recibo: {}", e.getMessage());
            return null;
        }
    }
}
