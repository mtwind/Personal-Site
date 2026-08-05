import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Design Previews",
  // Exploration pages — never index, even if deployed.
  robots: { index: false, follow: false },
};

export default function DesignsLayout({ children }: LayoutProps<"/designs">) {
  return <>{children}</>;
}
