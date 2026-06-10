import datetime
from flask import Blueprint, render_template, request, redirect, url_for, flash, send_file, jsonify
from db import db
from models import Venta, Compra, Producto, Kardex, ConfiguracionGlobal
from routes.auth_utils import login_required, role_required
from utils.report_generator import ReportGenerator

reportes_bp = Blueprint('reportes', __name__)

@reportes_bp.route('/reportes')
@login_required
def reportes():
    return render_template('reportes.html')

@reportes_bp.route('/configuracion', methods=['GET', 'POST'])
@login_required
@role_required('Administrador')
def configuracion():
    conf = db.session.query(ConfiguracionGlobal).first()
    if not conf:
        conf = ConfiguracionGlobal()
        db.session.add(conf)
        db.session.commit()
        
    if request.method == 'POST':
        if request.is_json:
            data = request.get_json() or {}
            conf.nombre_empresa = data.get('nombre_empresa', conf.nombre_empresa)
            conf.ruc = data.get('ruc', conf.ruc)
            conf.tasa_cambio = float(data.get('tasa_cambio', conf.tasa_cambio))
            conf.tasa_cambio_max = float(data.get('tasa_cambio_max', conf.tasa_cambio_max))
            if data.get('sku_bidon_vacio', '').strip():
                conf.sku_bidon_vacio = data.get('sku_bidon_vacio').strip()
        else:
            conf.nombre_empresa = request.form.get('nombre_empresa', conf.nombre_empresa)
            conf.ruc = request.form.get('ruc', conf.ruc)
            conf.tasa_cambio = float(request.form.get('tasa_cambio', conf.tasa_cambio))
            conf.tasa_cambio_max = float(request.form.get('tasa_cambio_max', conf.tasa_cambio_max))
            if request.form.get('sku_bidon_vacio', '').strip():
                conf.sku_bidon_vacio = request.form.get('sku_bidon_vacio').strip()
            
        try:
            db.session.commit()
        except Exception as e:
            db.session.rollback()
            if request.is_json:
                return jsonify({'success': False, 'error': str(e)}), 500
            flash(f'Error al actualizar: {str(e)}', 'error')
            return redirect(url_for('reportes.configuracion'))

        if request.is_json:
            return jsonify({
                'success': True,
                'message': 'Configuración corporativa actualizada correctamente',
                'conf': {
                    'nombre_empresa': conf.nombre_empresa,
                    'ruc': conf.ruc,
                    'tasa_cambio': conf.tasa_cambio,
                    'tasa_cambio_max': conf.tasa_cambio_max,
                    'sku_bidon_vacio': conf.sku_bidon_vacio
                }
            })
        flash('Configuración corporativa actualizada correctamente', 'success')
        return redirect(url_for('reportes.configuracion'))

    if request.is_json or request.args.get('json') == 'true' or request.headers.get('Accept') == 'application/json':
        return jsonify({
            'success': True,
            'conf': {
                'nombre_empresa': conf.nombre_empresa,
                'ruc': conf.ruc,
                'tasa_cambio': conf.tasa_cambio,
                'tasa_cambio_max': conf.tasa_cambio_max,
                'sku_bidon_vacio': conf.sku_bidon_vacio
            }
        })
    return render_template('configuracion.html', conf=conf)

@reportes_bp.route('/reportes/ventas/excel')
@login_required
def reporte_ventas_excel():
    vnts = db.session.query(Venta).all()
    buffer = ReportGenerator.generate_sales_excel(vnts)
    return send_file(
        buffer,
        as_attachment=True,
        download_name=f'Reporte_Ventas_IVVI_{datetime.datetime.now().strftime("%Y%m%d")}.xlsx',
        mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )

@reportes_bp.route('/reportes/compras/excel')
@login_required
def reporte_compras_excel():
    cmps = db.session.query(Compra).all()
    buffer = ReportGenerator.generate_purchases_excel(cmps)
    return send_file(
        buffer,
        as_attachment=True,
        download_name=f'Reporte_Compras_IVVI_{datetime.datetime.now().strftime("%Y%m%d")}.xlsx',
        mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )

@reportes_bp.route('/reportes/inventario/excel')
@login_required
def reporte_inventario_excel():
    prods = db.session.query(Producto).all()
    buffer = ReportGenerator.generate_inventory_excel(prods)
    return send_file(
        buffer,
        as_attachment=True,
        download_name=f'Reporte_Inventario_IVVI_{datetime.datetime.now().strftime("%Y%m%d")}.xlsx',
        mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )

@reportes_bp.route('/reportes/kardex/excel')
@login_required
@role_required('Administrador', 'Operador de Almacén', 'Gerencia')
def reporte_kardex_excel():
    items = db.session.query(Kardex).order_by(Kardex.fecha.desc()).all()
    buffer = ReportGenerator.generate_kardex_excel(items)
    return send_file(
        buffer,
        as_attachment=True,
        download_name=f'Kardex_Auditoria_IVVI_{datetime.datetime.now().strftime("%Y%m%d_%H%M")}.xlsx',
        mimetype='application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    )

@reportes_bp.route('/reportes/kardex/pdf')
@login_required
@role_required('Administrador', 'Operador de Almacén', 'Gerencia')
def reporte_kardex_pdf():
    from utils.pdf_generator import KardexPDFGenerator
    items = db.session.query(Kardex).order_by(Kardex.fecha.desc()).all()
    pdf_buffer = KardexPDFGenerator.generate_pdf(items)
    return send_file(
        pdf_buffer,
        as_attachment=True,
        download_name=f'Kardex_Auditoria_IVVI_{datetime.datetime.now().strftime("%Y%m%d_%H%M")}.pdf',
        mimetype='application/pdf'
    )

