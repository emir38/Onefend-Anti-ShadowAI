import type { DocManual } from '../../../types';
import { seccionPrimerosPasos } from './s1-primeros-pasos';
import { seccionUsuariosAccesos } from './s2-usuarios-accesos';
import { seccionProteccionPoliticas } from './s3-proteccion-politicas';
import { seccionMonitoreoAuditoria } from './s4-monitoreo-auditoria';
import { seccionReportesIntegraciones } from './s5-reportes-integraciones';

export const antiShadowAiManual: DocManual = {
  slug: 'anti-shadow-ai',
  title: 'Anti-Shadow AI & SaaS',
  shortTitle: 'Anti-Shadow AI',
  description: 'Manual operativo completo para administradores y analistas de seguridad de Onefend.',
  version: '2.2.0',
  lastUpdated: '2026-04-02',
  icon: 'Shield',
  sections: [
    seccionPrimerosPasos,
    seccionUsuariosAccesos,
    seccionProteccionPoliticas,
    seccionMonitoreoAuditoria,
    seccionReportesIntegraciones,
  ],
};
