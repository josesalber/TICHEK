const ExcelJS = require('exceljs');

async function exportSolicitudesToExcel(solicitudes, res) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Solicitudes');

  worksheet.columns = [
    { header: 'DNI', key: 'dni_asesor', width: 12 },
    { header: 'Nombre', key: 'nombre_asesor', width: 25 },
    { header: 'Campaña', key: 'campaña', width: 18 },
    { header: 'AnyDesk', key: 'anydesk', width: 18 },
    { header: 'Correo', key: 'correo_usuario', width: 28 },
    { header: 'Estado', key: 'estado', width: 12 },
    { header: 'Windows Actualizado', key: 'windows_actualizado', width: 18 },
    { header: 'Procesador Cumple', key: 'procesador_cumple', width: 18 },
    { header: 'RAM Cumple', key: 'ram_cumple', width: 14 },
    { header: 'Antivirus', key: 'tiene_antivirus', width: 12 },
    { header: 'MAC Address', key: 'mac_address', width: 20 },
  ];

  solicitudes.forEach(s => {
    worksheet.addRow({
      ...s,
      windows_actualizado: s.windows_actualizado ? 'Sí' : 'No',
      procesador_cumple: s.procesador_cumple ? 'Sí' : 'No',
      ram_cumple: s.ram_cumple ? 'Sí' : 'No',
      tiene_antivirus: s.tiene_antivirus ? 'Sí' : 'No',
    });
  });

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=solicitudes.xlsx');
  await workbook.xlsx.write(res);
  res.end();
}

// Función para exportar eliminaciones a Excel
async function exportEliminacionesToExcel(eliminaciones, res) {
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Eliminaciones');

  worksheet.columns = [
    { header: 'Fecha', key: 'fecha_eliminacion', width: 20 },
    { header: 'Usuario Eliminado', key: 'usuario_eliminado', width: 18 },
    { header: 'Equipo', key: 'equipo_hostname', width: 25 },
    { header: 'Responsable', key: 'responsable_nombre', width: 25 },
    { header: 'Método', key: 'metodo_aplicado', width: 25 },
    { header: 'Observaciones', key: 'observaciones', width: 40 },
  ];

  eliminaciones.forEach(e => {
    worksheet.addRow({
      fecha_eliminacion: e.fecha_eliminacion ? new Date(e.fecha_eliminacion).toLocaleString('es-PE', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false
      }) : '',
      usuario_eliminado: e.usuario_eliminado,
      equipo_hostname: e.equipo_hostname,
      responsable_nombre: e.responsable_nombre,
      metodo_aplicado: e.metodo_aplicado,
      observaciones: e.observaciones || ''
    });
  });

  // Agregar información del reporte
  const infoSheet = workbook.addWorksheet('Información');
  infoSheet.addRow(['Reporte:', 'Historial de Eliminaciones de Usuarios']);
  infoSheet.addRow(['Generado:', new Date().toLocaleString('es-PE')]);
  infoSheet.addRow(['Total registros:', eliminaciones.length]);

  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename=eliminaciones_usuarios.xlsx');
  await workbook.xlsx.write(res);
  res.end();
}

module.exports = { exportSolicitudesToExcel, exportEliminacionesToExcel };
