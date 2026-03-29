"use client";

import { Logo } from "@/components/branding/Logo";

export default function BrandingDemoPage() {
  return (
    <div className="min-h-screen p-8 bg-background text-foreground">
      <div className="max-w-4xl mx-auto space-y-12">
        <h1 className="text-3xl font-bold mb-8">Logo Component Demo</h1>

        {/* Size Variants */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Size Variants</h2>
          <div className="flex flex-wrap items-end gap-8 p-6 bg-card rounded-lg">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Small (80x32)</p>
              <Logo size="small" />
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Medium (120x48)</p>
              <Logo size="medium" />
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">Large (180x72)</p>
              <Logo size="large" />
            </div>
          </div>
        </section>

        {/* Responsive Behavior */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Responsive Behavior</h2>
          <div className="p-6 bg-card rounded-lg">
            <p className="text-sm text-muted-foreground mb-4">
              Resize your browser to see the logo adapt:
            </p>
            <div className="flex justify-center">
              <Logo className="sm:w-20 md:w-30 lg:w-45" />
            </div>
          </div>
        </section>

        {/* Custom Styling */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Custom Styling</h2>
          <div className="flex flex-wrap gap-8 p-6 bg-card rounded-lg">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">With Border</p>
              <Logo size="medium" className="border-2 border-primary rounded-lg p-2" />
            </div>
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">With Shadow</p>
              <Logo size="medium" className="shadow-lg" />
            </div>
          </div>
        </section>

        {/* Theme Compatibility */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Theme Compatibility</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="p-6 bg-white text-black rounded-lg">
              <p className="text-sm mb-4">Light Background</p>
              <Logo size="medium" />
            </div>
            <div className="p-6 bg-black text-white rounded-lg">
              <p className="text-sm mb-4">Dark Background</p>
              <Logo size="medium" />
            </div>
          </div>
        </section>

        {/* Accessibility */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Accessibility</h2>
          <div className="p-6 bg-card rounded-lg space-y-2">
            <p className="text-sm text-muted-foreground">
              The logo includes descriptive alt text for screen readers:
            </p>
            <code className="block p-2 bg-muted rounded text-sm">
              alt="iTECity - Intelligent Technology Education City"
            </code>
            <p className="text-sm text-muted-foreground mt-4">
              The component also has role="img" and aria-label for the container.
            </p>
          </div>
        </section>

        {/* Error Handling */}
        <section className="space-y-4">
          <h2 className="text-2xl font-semibold">Error Handling</h2>
          <div className="p-6 bg-card rounded-lg">
            <p className="text-sm text-muted-foreground mb-4">
              If the logo image fails to load, the component automatically falls back to a text-based logo.
              Since logo_itecity.png doesn't exist yet, you should see the text fallback below:
            </p>
            <div className="flex justify-center">
              <Logo size="large" />
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}
