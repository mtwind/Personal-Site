import type { Metadata } from "next";

import { EditorialNoirView } from "./view";

export const metadata: Metadata = { title: "E3 · Editorial Noir" };

export default function EditorialNoir() {
  return <EditorialNoirView />;
}
