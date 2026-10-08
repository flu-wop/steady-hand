"use client";

import { useSyncExternalStore } from "react";
import Scene from "@/components/Scene";
import GameUI from "@/components/GameUI";
import CaseSelect from "@/components/CaseSelect";
import Title from "@/components/Title";
import { getSnapshot, subscribe } from "@/lib/gameState";

export default function Page() {
  const { caseId, onTitle } = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  if (onTitle) return <Title />;
  if (!caseId) return <CaseSelect />;

  return (
    <main>
      <Scene key={caseId} />
      <GameUI />
    </main>
  );
}
