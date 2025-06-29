import type { SVGProps } from 'react';
import { Pill, Brain } from 'lucide-react';

export function AppLogo(props: SVGProps<SVGSVGElement>) {
  return (
    <div className="flex items-center gap-2 text-primary">
      <Pill className="h-8 w-8" />
      <span className="text-2xl font-semibold text-foreground">MediMind</span>
    </div>
  );
}
