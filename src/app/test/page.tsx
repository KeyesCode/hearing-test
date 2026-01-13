"use client";

import { useEffect } from "react";
import TestWizard from "@/components/TestWizard";
import { audioEngine } from "@/lib/audio/audioEngine";

export default function TestPage() {
  useEffect(() => {
    // Initialize audio engine when page loads
    audioEngine.initialize().catch(console.error);
  }, []);

  return <TestWizard />;
}

