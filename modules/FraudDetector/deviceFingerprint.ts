// modules/FraudDetector/deviceFingerprint.ts
export interface DeviceFingerprint {
  userAgent: string;
  screenResolution: string;
  language: string;
  timezone: string;
  platform: string;
  plugins: string[];
  canvasHash: string;
  webglHash: string;
  fonts: string[];
}

export class DeviceFingerprinter {
  static async generate(): Promise<DeviceFingerprint> {
    if (typeof window === 'undefined') {
      return {
        userAgent: '',
        screenResolution: '',
        language: '',
        timezone: '',
        platform: '',
        plugins: [],
        canvasHash: '',
        webglHash: '',
        fonts: [],
      };
    }

    return {
      userAgent: navigator.userAgent,
      screenResolution: `${screen.width}x${screen.height}`,
      language: navigator.language,
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
      platform: navigator.platform,
      plugins: Array.from(navigator.plugins).map((p) => p.name),
      canvasHash: await this.getCanvasHash(),
      webglHash: this.getWebGLHash(),
      fonts: this.getFonts(),
    };
  }

  private static async getCanvasHash(): Promise<string> {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    canvas.width = 200;
    canvas.height = 50;
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillStyle = '#f60';
    ctx.fillRect(0, 0, 200, 50);
    ctx.fillStyle = '#069';
    ctx.fillText('Bukeng Fingerprint', 2, 15);

    return this.hashString(canvas.toDataURL());
  }

  private static getWebGLHash(): string {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl');
    if (!gl) return '';

    const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
    if (!debugInfo) return '';

    const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
    const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);

    return this.hashString(`${vendor}|${renderer}`);
  }

  private static getFonts(): string[] {
    const fontList = [
      'Arial',
      'Verdana',
      'Times New Roman',
      'Courier New',
      'Georgia',
    ];
    return fontList;
  }

  private static hashString(str: string): string {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      hash = (hash << 5) - hash + str.charCodeAt(i);
      hash |= 0;
    }
    return hash.toString();
  }

  static compare(fp1: DeviceFingerprint, fp2: DeviceFingerprint): number {
    let matchScore = 0;
    let totalChecks = 0;

    if (fp1.userAgent === fp2.userAgent) matchScore++;
    totalChecks++;

    if (fp1.screenResolution === fp2.screenResolution) matchScore++;
    totalChecks++;

    if (fp1.language === fp2.language) matchScore++;
    totalChecks++;

    if (fp1.timezone === fp2.timezone) matchScore++;
    totalChecks++;

    if (fp1.canvasHash === fp2.canvasHash) matchScore++;
    totalChecks++;

    return (matchScore / totalChecks) * 100;
  }
}
