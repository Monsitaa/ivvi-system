from reportlab.lib.pagesizes import letter, landscape
from reportlab.pdfgen import canvas
from reportlab.lib import colors
from reportlab.lib.units import inch
import io
import datetime

def clean_string(s):
    if not s:
        return ""
    # Reemplazar caracteres especiales fuera de latin-1 con "?" para evitar excepciones o cajas vacías en ReportLab
    return s.encode('latin-1', 'replace').decode('latin-1')

def truncate_to_width(canvas_obj, text, font_name, font_size, max_width):
    if not text:
        return ""
    try:
        if canvas_obj.stringWidth(text, font_name, font_size) <= max_width:
            return text
        # Truncar y añadir "..."
        truncated = text
        while len(truncated) > 0 and canvas_obj.stringWidth(truncated + "...", font_name, font_size) > max_width:
            truncated = truncated[:-1]
        return truncated + "..."
    except Exception:
        return text[:int(max_width/5)] + "..."

class InvoiceGenerator:
    @staticmethod
    def generate_invoice(venta):
        buffer = io.BytesIO()
        p = canvas.Canvas(buffer, pagesize=letter)
        width, height = letter

        # Cabecera Corporativa (Colores IVVI)
        p.setFillColor(colors.HexColor("#022c22"))
        p.rect(0, height - 1.5*inch, width, 1.5*inch, fill=1)
        
        p.setFillColor(colors.white)
        p.setFont("Helvetica-Bold", 24)
        p.drawString(0.5*inch, height - 0.7*inch, "IVVI S.A.")
        
        p.setFont("Helvetica", 10)
        p.drawString(0.5*inch, height - 1.0*inch, "Aceite de Palma de Alta Calidad")
        p.drawString(0.5*inch, height - 1.2*inch, "RUC: 1790000000001 | Tel: +593 99 999 9999")

        p.setFont("Helvetica-Bold", 16)
        p.drawRightString(width - 0.5*inch, height - 0.7*inch, f"FACTURA #{venta.id}")
        p.setFont("Helvetica", 12)
        p.drawRightString(width - 0.5*inch, height - 1.0*inch, f"Fecha: {venta.fecha.strftime('%d/%m/%Y')}")

        # Datos del Cliente
        p.setFillColor(colors.black)
        p.setFont("Helvetica-Bold", 12)
        p.drawString(0.5*inch, height - 2.0*inch, "DATOS DEL CLIENTE:")
        p.setFont("Helvetica", 11)
        p.drawString(0.5*inch, height - 2.2*inch, f"Nombre: {venta.cliente.nombre}")
        p.drawString(0.5*inch, height - 2.4*inch, f"RUC/CI: {venta.cliente.ruc}")
        p.drawString(0.5*inch, height - 2.6*inch, f"Dirección: {venta.cliente.direccion}")

        # Tabla de Detalles
        y = height - 3.2*inch
        p.setFont("Helvetica-Bold", 11)
        p.setFillColor(colors.HexColor("#015c3b"))
        p.rect(0.4*inch, y - 0.1*inch, width - 0.8*inch, 0.3*inch, fill=1)
        p.setFillColor(colors.white)
        p.drawString(0.5*inch, y, "PRODUCTO")
        p.drawString(3.5*inch, y, "CANT")
        p.drawString(4.5*inch, y, "PRECIO")
        p.drawString(5.5*inch, y, "SUBTOTAL")

        p.setFillColor(colors.black)
        p.setFont("Helvetica", 10)
        y -= 0.4*inch
        
        for det in venta.detalles:
            p.drawString(0.5*inch, y, clean_string(det.producto.nombre[:40]))
            p.drawString(3.5*inch, y, str(det.cantidad))
            p.drawString(4.5*inch, y, f"C$ {det.precio_unitario:,.2f}")
            p.drawString(5.5*inch, y, f"C$ {det.subtotal:,.2f}")
            y -= 0.25*inch
            if y < 1*inch: # Salto de página básico
                p.showPage()
                y = height - 1*inch

        # Total
        p.line(0.5*inch, y, width - 0.5*inch, y)
        y -= 0.4*inch
        p.setFont("Helvetica-Bold", 14)
        p.drawRightString(width - 0.5*inch, y, f"TOTAL: C$ {venta.total:,.2f}")

        # Pie de página
        p.setFont("Helvetica-Oblique", 8)
        p.drawCentredString(width/2, 0.5*inch, "Gracias por su preferencia. IVVI S.A. contribuyendo al agro.")

        p.showPage()
        p.save()
        
        buffer.seek(0)
        return buffer

class KardexPDFGenerator:
    @staticmethod
    def generate_pdf(items):
        buffer = io.BytesIO()
        # Orientación horizontal (landscape) para que quepan todas las columnas cómodamente
        p = canvas.Canvas(buffer, pagesize=landscape(letter))
        width, height = landscape(letter)

        def draw_header(canvas_obj, page_num):
            # Franja verde corporativa
            canvas_obj.setFillColor(colors.HexColor("#022c22"))
            canvas_obj.rect(0, height - 1.0*inch, width, 1.0*inch, fill=1)
            
            canvas_obj.setFillColor(colors.white)
            canvas_obj.setFont("Helvetica-Bold", 18)
            canvas_obj.drawString(0.5*inch, height - 0.4*inch, "IVVI S.A. | LIBRO DE MOVIMIENTOS (KÁRDEX)")
            
            canvas_obj.setFont("Helvetica", 9)
            canvas_obj.drawString(0.5*inch, height - 0.75*inch, "Historial inmutable de auditoría para trazabilidad física del inventario")
            
            canvas_obj.setFont("Helvetica-Bold", 10)
            now_str = datetime.datetime.now().strftime('%d/%m/%Y %H:%M')
            canvas_obj.drawRightString(width - 0.5*inch, height - 0.4*inch, "Reporte de Auditoría")
            canvas_obj.setFont("Helvetica", 9)
            canvas_obj.drawRightString(width - 0.5*inch, height - 0.75*inch, f"Generado: {now_str} | Pág. {page_num}")
            
            # Cabecera de la tabla
            y_hdr = height - 1.35*inch
            canvas_obj.setFillColor(colors.HexColor("#0f766e"))
            canvas_obj.rect(0.4*inch, y_hdr - 5, width - 0.8*inch, 20, fill=1)
            
            canvas_obj.setFillColor(colors.white)
            canvas_obj.setFont("Helvetica-Bold", 8)
            canvas_obj.drawString(0.4*inch, y_hdr, "FECHA / HORA")
            canvas_obj.drawString(1.6*inch, y_hdr, "TIPO FLUJO")
            canvas_obj.drawString(2.8*inch, y_hdr, "DOCUMENTO / REF")
            canvas_obj.drawString(4.4*inch, y_hdr, "PRODUCTO / MATERIAL (SKU)")
            canvas_obj.drawRightString(7.2*inch, y_hdr, "VAR.")
            canvas_obj.drawString(7.35*inch, y_hdr, "RESPONSABLE")
            canvas_obj.drawString(8.8*inch, y_hdr, "OBSERVACIONES TÉCNICAS")

        page = 1
        draw_header(p, page)
        
        y = height - 1.7*inch
        p.setFillColor(colors.black)
        
        for item in items:
            # Validación de salto de página ANTES de dibujar la fila para evitar páginas vacías al final
            if y < 0.6*inch:
                p.showPage()
                page += 1
                draw_header(p, page)
                y = height - 1.7*inch
                p.setFillColor(colors.black)

            p.setFont("Helvetica", 8)
            
            # Formatear fecha
            fecha_str = item.fecha.strftime('%d/%m/%Y %H:%M:%S') if item.fecha else 'N/A'
            
            # Formatear Tipo de Flujo
            doc_str = str(item.documento_id).upper()
            tipo_mov = item.tipo_movimiento
            if item.tipo_movimiento == 'ENTRADA':
                if doc_str.startswith('COMPRA'):
                    tipo_mov = 'ENT - COMPRA'
                elif doc_str.startswith('PLANTA'):
                    tipo_mov = 'ENT - PRODUCCIÓN'
                elif 'AJUSTE-VENTA' in doc_str:
                    tipo_mov = 'ENT - ANULACIÓN'
            else:
                if doc_str.startswith('VENTA'):
                    tipo_mov = 'SAL - VENTA'
                elif 'AJUSTE-COMPRA' in doc_str:
                    tipo_mov = 'SAL - ANULACIÓN'
                elif doc_str.startswith('AJUSTE'):
                    tipo_mov = 'SAL - MERMA'
            
            # Formatear cantidad
            is_entrada = item.tipo_movimiento == 'ENTRADA'
            sign = '+' if is_entrada else '-'
            cant_val = item.cantidad
            cant_str = f"{sign}{cant_val:,.3f}".rstrip('0').rstrip('.')
            if cant_str == sign:
                cant_str = f"{sign}0"
            
            # Obtener datos de producto y responsable limpios
            prod_nombre = item.producto.nombre if item.producto else 'Desconocido'
            prod_sku = item.producto.sku if item.producto else 'N/A'
            prod_str = clean_string(f"{prod_nombre} ({prod_sku})")
            
            resp_str = clean_string(item.usuario.nombre if item.usuario else 'Sistema')
            obs_str = clean_string(item.observacion if item.observacion else 'Procesado por el sistema')
            
            # Truncar textos para evitar solapamientos
            fecha_val = truncate_to_width(p, fecha_str, "Helvetica", 8, 1.15*inch)
            tipo_mov_val = truncate_to_width(p, tipo_mov, "Helvetica", 8, 1.15*inch)
            ref_val = truncate_to_width(p, f"REF-{item.documento_id}", "Helvetica", 8, 1.5*inch)
            prod_val = truncate_to_width(p, prod_str, "Helvetica", 8, 2.7*inch)
            resp_val = truncate_to_width(p, resp_str, "Helvetica", 8, 1.35*inch)
            obs_val = truncate_to_width(p, obs_str, "Helvetica", 8, 1.8*inch)
            
            p.drawString(0.4*inch, y, fecha_val)
            p.drawString(1.6*inch, y, tipo_mov_val)
            p.drawString(2.8*inch, y, ref_val)
            p.drawString(4.4*inch, y, prod_val)
            
            # Color distintivo para la variación
            if is_entrada:
                p.setFillColor(colors.HexColor("#047857"))  # Verde
            else:
                p.setFillColor(colors.HexColor("#b91c1c"))  # Rojo
            p.drawRightString(7.2*inch, y, cant_str)
            
            p.setFillColor(colors.black)
            p.drawString(7.35*inch, y, resp_val)
            p.drawString(8.8*inch, y, obs_val)
            
            # Dibujar una línea sutil inferior
            p.setStrokeColor(colors.HexColor("#f1f5f9"))
            p.setLineWidth(0.5)
            p.line(0.4*inch, y - 5, width - 0.4*inch, y - 5)
            
            y -= 18

        # Guardar directamente sin llamar a showPage() al final, evitando páginas extra en blanco
        p.save()
        buffer.seek(0)
        return buffer
