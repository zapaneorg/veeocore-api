import { VeeoWidget } from './widget';
import type { VeeoWidgetConfig } from './types';

export { VeeoWidget };
export type { VeeoWidgetConfig };

// Auto-init depuis les attributs data-*
declare global {
  interface Window {
    VeeoWidget: typeof VeeoWidget;
    veeoWidget?: VeeoWidget;
  }
}

// Exposer globalement
if (typeof window !== 'undefined') {
  window.VeeoWidget = VeeoWidget;
  
  // Auto-init au chargement du DOM
  const init = () => {
    const script = document.querySelector('script[data-api-key]') as HTMLScriptElement | null;
    
    if (script) {
      const config: VeeoWidgetConfig = {
        apiKey: script.dataset.apiKey!,
        apiUrl: script.dataset.apiUrl,
        containerId: script.dataset.container || 'veeo-booking',
        theme: (script.dataset.theme as 'light' | 'dark' | 'auto') || 'light',
        primaryColor: script.dataset.primaryColor,
        locale: script.dataset.locale || 'fr',
        vehicles: script.dataset.vehicles?.split(',') || ['standard', 'premium', 'van'],
        showSurgeInfo: script.dataset.showSurge !== 'false',
        showEstimatedTime: script.dataset.showTime !== 'false'
      };
      
      window.veeoWidget = new VeeoWidget(config);
      window.veeoWidget.mount();
    }
  };
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
}

export default VeeoWidget;
