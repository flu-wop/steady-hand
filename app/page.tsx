"use client";

import { useSyncExternalStore } from "react";
import Scene from "@/components/Scene";
import GameUI from "@/components/GameUI";
import CaseSelect from "@/components/CaseSelect";
import { getSnapshot, subscribe } from "@/lib/gameState";

export default function Page() {
  const { caseId } = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  if (!caseId) return <CaseSelect />;

  return (
    <main>
      <Scene key={caseId} />
      <GameUI />
    </main>
  );
}
