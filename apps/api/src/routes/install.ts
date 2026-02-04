/**
 * VeeoCore - Routes d'installation
 * Sert les scripts d'installation pour Tenant Admin et Driver App
 */

import { Router } from 'express';
import fs from 'fs';
import path from 'path';

const router = Router();

// Chemin vers les scripts (relatif au dossier src)
const scriptsPath = path.resolve(__dirname, '../../../../scripts');

/**
 * GET /install/tenant-admin.sh
 * Télécharge le script d'installation du Dashboard Tenant Admin
 */
router.get('/tenant-admin.sh', (req, res) => {
  const scriptPath = path.join(scriptsPath, 'install-tenant-admin.sh');
  
  if (!fs.existsSync(scriptPath)) {
    return res.status(404).json({ 
      error: 'Script not found',
      message: 'Le script d\'installation n\'est pas disponible'
    });
  }

  res.setHeader('Content-Type', 'application/x-sh');
  res.setHeader('Content-Disposition', 'attachment; filename="install-tenant-admin.sh"');
  res.setHeader('Cache-Control', 'no-cache');
  
  fs.createReadStream(scriptPath).pipe(res);
});

/**
 * GET /install/driver-app.sh
 * Télécharge le script d'installation de l'App Driver
 */
router.get('/driver-app.sh', (req, res) => {
  const scriptPath = path.join(scriptsPath, 'install-driver-app.sh');
  
  if (!fs.existsSync(scriptPath)) {
    return res.status(404).json({ 
      error: 'Script not found',
      message: 'Le script d\'installation n\'est pas disponible'
    });
  }

  res.setHeader('Content-Type', 'application/x-sh');
  res.setHeader('Content-Disposition', 'attachment; filename="install-driver-app.sh"');
  res.setHeader('Cache-Control', 'no-cache');
  
  fs.createReadStream(scriptPath).pipe(res);
});

/**
 * GET /install/info
 * Retourne les informations sur les scripts disponibles
 */
router.get('/info', (req, res) => {
  res.json({
    success: true,
    scripts: [
      {
        name: 'Dashboard Tenant Admin',
        slug: 'tenant-admin',
        description: 'Dashboard complet pour gérer votre flotte VTC',
        downloadUrl: '/install/tenant-admin.sh',
        installCommand: 'curl -fsSL https://api-core.veeo-stras.fr/install/tenant-admin.sh | bash -s -- --tenant-id=YOUR_ID --api-key=YOUR_KEY',
        features: [
          'Gestion des chauffeurs',
          'Suivi des réservations en temps réel',
          'Configuration de la tarification',
          'Tableau de bord analytique',
          'Intégration WebSocket temps réel'
        ],
        requirements: {
          node: '18+',
          npm: '9+'
        }
      },
      {
        name: 'App Driver (PWA)',
        slug: 'driver-app',
        description: 'Application mobile PWA pour vos chauffeurs',
        downloadUrl: '/install/driver-app.sh',
        installCommand: 'curl -fsSL https://api-core.veeo-stras.fr/install/driver-app.sh | bash -s -- --tenant-id=YOUR_ID --api-key=YOUR_KEY',
        features: [
          'Application PWA installable',
          'Notifications push',
          'Géolocalisation temps réel',
          'Gestion des courses',
          'Mode hors ligne',
          'Interface mobile optimisée'
        ],
        requirements: {
          node: '18+',
          npm: '9+'
        }
      }
    ],
    documentation: '/demo/install.html'
  });
});

/**
 * POST /install/validate
 * Valide les credentials avant installation
 */
router.post('/validate', async (req, res) => {
  const { tenantId, apiKey } = req.body;

  if (!tenantId || !apiKey) {
    return res.status(400).json({
      success: false,
      error: 'Missing credentials',
      message: 'tenant_id et api_key sont requis'
    });
  }

  // TODO: Valider les credentials avec la base de données
  // Pour l'instant, on accepte tout format valide
  
  if (tenantId.length < 3 || apiKey.length < 10) {
    return res.status(400).json({
      success: false,
      error: 'Invalid credentials',
      message: 'Format des credentials invalide'
    });
  }

  res.json({
    success: true,
    message: 'Credentials valides',
    tenant: {
      id: tenantId,
      name: 'Demo Tenant', // TODO: Récupérer de la DB
      plan: 'pro'
    },
    scripts: {
      tenantAdmin: `curl -fsSL https://api-core.veeo-stras.fr/install/tenant-admin.sh | bash -s -- --tenant-id=${tenantId} --api-key=${apiKey}`,
      driverApp: `curl -fsSL https://api-core.veeo-stras.fr/install/driver-app.sh | bash -s -- --tenant-id=${tenantId} --api-key=${apiKey}`
    }
  });
});

export default router;
