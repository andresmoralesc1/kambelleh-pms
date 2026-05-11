import { useCallback } from 'react';
import { exportReservationsCSV, exportGuestsCSV, exportRoomsCSV } from '../api';
import { useToast } from '../components/ToastProvider';

const downloadBlob = (data, filename) => {
  const url = window.URL.createObjectURL(new Blob([data]));
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.URL.revokeObjectURL(url);
};

const formatDateForFilename = () => {
  const d = new Date();
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const useExportReservations = () => {
  const toast = useToast();
  return useCallback(async () => {
    try {
      const response = await exportReservationsCSV();
      const date = formatDateForFilename();
      downloadBlob(response.data, `kambelleh_reservas_${date}.csv`);
      toast.success('Exportación de reservas iniciada');
    } catch (err) {
      toast.error('Error al exportar reservas');
    }
  }, [toast]);
};

export const useExportGuests = () => {
  const toast = useToast();
  return useCallback(async () => {
    try {
      const response = await exportGuestsCSV();
      const date = formatDateForFilename();
      downloadBlob(response.data, `kambelleh_huespedes_${date}.csv`);
      toast.success('Exportación de huéspedes iniciada');
    } catch (err) {
      toast.error('Error al exportar huéspedes');
    }
  }, [toast]);
};

export const useExportRooms = () => {
  const toast = useToast();
  return useCallback(async () => {
    try {
      const response = await exportRoomsCSV();
      const date = formatDateForFilename();
      downloadBlob(response.data, `kambelleh_habitaciones_${date}.csv`);
      toast.success('Exportación de habitaciones iniciada');
    } catch (err) {
      toast.error('Error al exportar habitaciones');
    }
  }, [toast]);
};