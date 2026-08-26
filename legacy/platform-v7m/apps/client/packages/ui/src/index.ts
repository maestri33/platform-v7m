/**
 * @supletivo/ui — shared design system components.
 *
 * Components are themeable via CSS custom properties defined in tokens/.
 * Import tokens once in your root layout, then use Tailwind utilities
 * (bg-brand-green, text-brand-ink, …) as usual — they resolve to CSS
 * variables that themes can override via [data-theme] attribute.
 *
 * App-specific components (AppHeader, VeteranDetail) remain in
 * src/components/ui/ and re-export from the app layer — they depend on
 * lib/api, lib/session, etc.
 */
export { Button } from "./components/button";
export { Card } from "./components/card";
export { TextField } from "./components/text-field";
export { SelectField } from "./components/select-field";
export { Stepper } from "./components/stepper";
export { FileUpload } from "./components/file-upload";
export { CameraCapture } from "./components/camera-capture";
export { OtpInput } from "./components/otp-input";
export { ErrorBox } from "./components/error-box";
export { LoadingOverlay } from "./components/loading-overlay";
export { IconBadge } from "./components/icon-badge";
export { BrandDots } from "./components/brand-dots";
export { BackLink } from "./components/back-link";
export { BackgroundGradient } from "./components/background-gradient";
export { AuroraBackground } from "./components/aurora-background";
export { DiplomaFlag } from "./components/diploma-flag";
export { WisprText } from "./components/wispr-text";
export { SiteFooter } from "./components/site-footer";
export { ConditionalFooter } from "./components/conditional-footer";
export { PlatformCredentials } from "./components/platform-credentials";
